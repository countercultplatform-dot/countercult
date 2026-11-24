import { Router, type IRouter, type Request } from "express";
import rateLimit from "express-rate-limit";
import { count, desc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, patronPostQuestionsTable, patronPostSubscriptionsTable } from "@workspace/db";
import {
  DeleteStudioPatronPostQuestionParams,
  GetPatronPostProgressResponse,
  GetStudioPatronPostQuestionsResponse,
  SubmitPatronPostQuestionBody,
  SubmitPatronPostQuestionResponse,
  UpdateStudioPatronPostQuestionStatusBody,
  UpdateStudioPatronPostQuestionStatusParams,
  UpdateStudioPatronPostQuestionStatusResponse,
  GetStudioPatronPostContributionsResponse,
} from "@workspace/api-zod";
import { requireStudioAdmin } from "../lib/studioAuth";
import { PgRateLimitStore } from "../lib/pgRateLimitStore";
import {
  sendCollectiveFundWelcomeEmail,
  sendPatronPostCheckoutFailureAlert,
  sendPatronPostPortalLinkEmail,
  sendSketchyShonaDigitalWelcomeEmail,
} from "../lib/email";
import { stripeRequest } from "../lib/stripeClient";
import { assertStripeMode } from "../lib/stripeMode";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const patronPostMemberGoal = 1000;
const flexibleBillingStripeApiVersion = "2025-06-30.basil";
const patronPostProduct = "patron_post";
const countercultPatronPostProduct = "countercult_patron_post";
const countercultDigitalPatronPostProduct = "countercult_digital_patron_post";
const sketchyShonaDigitalPatronPostProduct = "sketchy_shona_digital_patron_post";
const digitalPatronPostProducts = new Set([countercultDigitalPatronPostProduct, sketchyShonaDigitalPatronPostProduct]);
const patronPostProducts = new Set([patronPostProduct, countercultPatronPostProduct, ...digitalPatronPostProducts]);
type PatronPostSignupSource = "countercult" | "sketchy_shona";
type PatronPostDeliveryType = "physical" | "digital";
type PatronPostSubscriptionInfo = {
  signupSource: PatronPostSignupSource;
  deliveryType: PatronPostDeliveryType;
};
type PatronPostPricingConfig = {
  product: string;
  membershipEnv: string;
  postageEnv: string;
  couponEnv: string;
  supportProductEnv: string;
};
type DigitalPricingConfig = {
  priceEnv: string;
  product: string;
  brand: "Countercult" | "Sketchy Shona";
  signupSource: PatronPostSignupSource;
  successPath: string;
  cancelPath: string;
};
const sketchyShonaPricing: PatronPostPricingConfig = {
  product: patronPostProduct,
  membershipEnv: "PATRON_POST_MEMBERSHIP_PRICE_ID",
  postageEnv: "PATRON_POST_POSTAGE_PRICE_ID",
  couponEnv: "PATRON_POST_EARLY_SUPPORTER_COUPON_ID",
  supportProductEnv: "PATRON_POST_SUPPORT_PRODUCT_ID",
};
const countercultPricing: PatronPostPricingConfig = {
  product: countercultPatronPostProduct,
  membershipEnv: "COUNTERCULT_PATRON_POST_MEMBERSHIP_PRICE_ID",
  postageEnv: "COUNTERCULT_PATRON_POST_POSTAGE_PRICE_ID",
  couponEnv: "COUNTERCULT_PATRON_POST_EARLY_SUPPORTER_COUPON_ID",
  supportProductEnv: "COUNTERCULT_PATRON_POST_SUPPORT_PRODUCT_ID",
};
const countercultDigitalPricing: DigitalPricingConfig = {
  priceEnv: "COUNTERCULT_PATRON_POST_DIGITAL_PRICE_ID",
  product: countercultDigitalPatronPostProduct,
  brand: "Countercult",
  signupSource: "countercult",
  successPath: "/collective-fund/thanks",
  cancelPath: "/snail?cancelled=1&membership_type=digital#snail-checkout",
};
const shippingCountries = "AC AD AE AF AG AI AL AM AO AQ AR AT AU AW AX AZ BA BB BD BE BF BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CD CF CG CH CI CK CL CM CN CO CR CV CW CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HN HR HT HU ID IE IL IM IN IO IQ IS IT JE JM JO JP KE KG KH KI KM KN KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MK ML MM MN MO MQ MR MS MT MU MV MW MX MY MZ NA NC NE NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SZ TA TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VN VU WF WS XK YE YT ZA ZM ZW ZZ".split(" ");

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 12,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: new PgRateLimitStore("patron-post-checkout:"),
});
const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: new PgRateLimitStore("patron-post-portal:"),
});
const anonymousQuestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  store: new PgRateLimitStore("patron-post-anonymous-question:"),
});

const EmailInput = z.object({ email: z.string().trim().email().max(320) });
const SessionInput = z.object({ sessionId: z.string().trim().min(10).max(255) });
const CheckoutInput = z.object({
  gift: z.boolean().optional(),
  mailingFirstName: z.string().trim().min(1).max(80),
  mailingLastName: z.string().trim().min(1).max(80),
});
const ContributionInput = z.object({ amountCents: z.number().int().min(1000).max(1_000_000) });

type StripePrice = {
  id: string;
  livemode: boolean;
  currency: string;
  unit_amount: number | null;
  recurring?: { interval?: string; interval_count?: number };
};
type StripeCoupon = {
  id: string;
  livemode: boolean;
  valid: boolean;
  amount_off: number | null;
  currency: string | null;
  duration: string;
  max_redemptions: number | null;
  times_redeemed: number;
};
type StripeAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};
type StripeSubscription = {
  id: string;
  status: string;
  customer: string | StripeCustomer;
  metadata?: Record<string, string>;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  items?: { data?: Array<{ current_period_end?: number }> };
};
type StripeCheckoutSession = {
  id: string;
  livemode: boolean;
  mode?: string;
  status: string | null;
  payment_status: string;
  created?: number;
  customer: string | { id: string } | null;
  subscription: string | StripeSubscription | null;
  metadata?: Record<string, string> | null;
  customer_details?: {
    email?: string | null;
    name?: string | null;
    address?: StripeAddress | null;
  } | null;
  collected_information?: {
    shipping_details?: {
      name?: string | null;
      address?: StripeAddress | null;
    } | null;
  } | null;
  amount_total?: number | null;
  currency?: string | null;
};
type StripeCheckoutSessionList = {
  data: StripeCheckoutSession[];
  has_more: boolean;
};
type StripeCustomer = {
  id: string;
  email?: string | null;
  name?: string | null;
  shipping?: { name?: string | null; address?: StripeAddress | null } | null;
};
type StripePortalSession = { url: string };

function stripeId(value: string | { id: string } | null | undefined): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function fullMailingName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.split(" ").length >= 2 ? normalized : null;
}

function fullMailingNameFromMetadata(metadata: Record<string, string> | null | undefined): string | null {
  const firstName = metadata?.mailing_first_name?.trim();
  const lastName = metadata?.mailing_last_name?.trim();
  return firstName && lastName ? `${firstName} ${lastName}` : null;
}

function getSiteOrigin(req: Request): string {
  const origin = req.get("origin");
  if (!origin) return "https://countercult.network";
  try {
    const parsed = new URL(origin);
    const isDevHost = parsed.hostname === "localhost" || parsed.hostname.endsWith(".replit.dev");
    if (parsed.protocol === "https:" && (parsed.hostname === "countercult.network" || isDevHost)) return parsed.origin;
    if (parsed.protocol === "http:" && parsed.hostname === "localhost") return parsed.origin;
  } catch {
    // Use the canonical site for malformed or untrusted Origin values.
  }
  return "https://countercult.network";
}

async function currentPricing(config = sketchyShonaPricing) {
  const membershipId = process.env[config.membershipEnv];
  const postageId = process.env[config.postageEnv];
  if (!membershipId || !postageId) throw new Error("Patron Post pricing is not configured.");
  const [membership, postage] = await Promise.all([
    stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(membershipId)}`),
    stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(postageId)}`),
  ]);
  assertStripeMode(membership.livemode, "membership price");
  assertStripeMode(postage.livemode, "postage price");
  if (membership.currency !== "eur" || membership.unit_amount !== 1100 || membership.recurring?.interval !== "month") {
    throw new Error("The Patron Post membership price does not match the configured €11 monthly price.");
  }
  if (postage.currency !== "eur" || postage.unit_amount !== 200 || postage.recurring?.interval !== "month") {
    throw new Error("The Patron Post postage price does not match the configured €2 monthly price.");
  }

  const couponId = process.env[config.couponEnv];
  if (!couponId) throw new Error("The €11 Patron Post monthly price is not configured.");
  const coupon = await stripeRequest<StripeCoupon>(`/v1/coupons/${encodeURIComponent(couponId)}`);
  assertStripeMode(coupon.livemode, "Patron Post price coupon");
  const priceHoldIsAvailable = coupon.valid
    && coupon.amount_off === 200
    && coupon.currency === "eur"
    && coupon.duration === "forever"
    && (coupon.max_redemptions === null || coupon.times_redeemed < coupon.max_redemptions);
  if (!priceHoldIsAvailable) {
    throw new Error("The €11 Patron Post monthly price is temporarily unavailable.");
  }
  return {
    membershipPriceId: membership.id,
    postagePriceId: postage.id,
    earlySupporter: true,
    membershipCents: 900,
    totalCents: 1100,
  };
}

async function currentDigitalPrice(config: DigitalPricingConfig): Promise<StripePrice | null> {
  const priceId = process.env[config.priceEnv];
  if (!priceId) return null;
  const price = await stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(priceId)}`);
  assertStripeMode(price.livemode, `${config.brand} digital Patron Post price`);
  if (
    price.currency !== "eur"
    || price.unit_amount !== 700
    || price.recurring?.interval !== "month"
    || (price.recurring.interval_count !== undefined && price.recurring.interval_count !== 1)
  ) {
    throw new Error(`The ${config.brand} digital Patron Post price must be €7 per month.`);
  }
  return price;
}

async function startDigitalCheckout(
  req: Request,
  res: import("express").Response,
  config: DigitalPricingConfig,
): Promise<void> {
  try {
    const price = await currentDigitalPrice(config);
    if (!price) {
      res.status(503).json({ error: "Digital Patron Post checkout is not available right now." });
      return;
    }
    const origin = getSiteOrigin(req);
    const fields: Record<string, string> = {
      mode: "subscription",
      success_url: `${origin}${config.successPath}?session_id={CHECKOUT_SESSION_ID}&delivery=digital`,
      cancel_url: `${origin}${config.cancelPath}`,
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      billing_address_collection: "auto",
      "metadata[product]": config.product,
      "metadata[delivery_type]": "digital",
      "metadata[is_gift]": "false",
      "subscription_data[metadata][product]": config.product,
      "subscription_data[metadata][delivery_type]": "digital",
      "subscription_data[metadata][is_gift]": "false",
      "subscription_data[billing_mode][type]": "flexible",
    };
    const session = await stripeRequest<StripeCheckoutSession & { url?: string }>(
      "/v1/checkout/sessions",
      "POST",
      fields,
      flexibleBillingStripeApiVersion,
    );
    if (!session.url) throw new Error("Stripe did not return a secure checkout URL.");
    res.json({ url: session.url });
  } catch (error) {
    req.log.error({ err: error, brand: config.brand }, "Digital Patron Post checkout session could not be created");
    void sendPatronPostCheckoutFailureAlert(
      config.signupSource,
      error instanceof Error ? error.message : "Unknown digital checkout error",
    );
    res.status(503).json({ error: "Checkout didn’t open. Please try again, or report the problem below." });
  }
}

async function startContributionCheckout(
  req: Request,
  res: import("express").Response,
  config: PatronPostPricingConfig,
  beneficiary: "Sketchy Shona" | "Countercult",
  returnPath?: string,
): Promise<void> {
  try {
    const parsed = ContributionInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Choose a whole-euro contribution of at least €10." });
      return;
    }
    const supportProductId = process.env[config.supportProductEnv];
    if (!supportProductId) throw new Error("One-time Patron Post support is not configured.");

    const amountCents = parsed.data.amountCents;
    const price = await stripeRequest<StripePrice & { product: string }>("/v1/prices", "POST", {
      product: supportProductId,
      unit_amount: String(amountCents),
      currency: "eur",
      nickname: amountCents > 10_000
        ? `${beneficiary} support with original art and shipping`
        : `${beneficiary} one-time support`,
    });
    assertStripeMode(price.livemode, "contribution price");
    if (price.unit_amount !== amountCents || price.currency !== "eur" || price.recurring) {
      throw new Error("Stripe returned an unexpected one-time contribution price.");
    }

    const origin = getSiteOrigin(req);
    const successPath = returnPath ?? (beneficiary === "Countercult" ? "/collective-fund" : "/sketchyshona/mail-club");
    const cancelPath = returnPath === "/snail"
      ? "/snail?cancelled=1&support=1#snail-support"
      : beneficiary === "Countercult"
        ? `${successPath}?cancelled=1&support=1#countercult-support`
        : `${successPath}?cancelled=1&support=1#join`;
    const isArtReward = amountCents > 10_000;
    const fields: Record<string, string> = {
      mode: "payment",
      success_url: `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}&support=1`,
      cancel_url: `${origin}${cancelPath}`,
      "line_items[0][price]": price.id,
      "line_items[0][quantity]": "1",
      "billing_address_collection": "auto",
      "metadata[product]": "patron_post_contribution",
      "metadata[beneficiary]": beneficiary,
      "metadata[art_reward]": String(isArtReward),
      "payment_intent_data[metadata][product]": "patron_post_contribution",
      "payment_intent_data[metadata][beneficiary]": beneficiary,
      "payment_intent_data[metadata][art_reward]": String(isArtReward),
    };
    if (isArtReward) {
      shippingCountries.forEach((country, index) => {
        fields[`shipping_address_collection[allowed_countries][${index}]`] = country;
      });
    }
    const session = await stripeRequest<StripeCheckoutSession & { url?: string }>(
      "/v1/checkout/sessions",
      "POST",
      fields,
      flexibleBillingStripeApiVersion,
    );
    if (!session.url) throw new Error("Stripe did not return a secure checkout URL.");
    res.json({ url: session.url });
  } catch (error) {
    req.log.error({ err: error, beneficiary }, "Patron Post contribution checkout could not be created");
    void sendPatronPostCheckoutFailureAlert(
      beneficiary === "Countercult" ? "countercult" : "sketchy_shona",
      error instanceof Error ? error.message : "Unknown checkout error",
    );
    res.status(503).json({ error: "Checkout didn’t open. Please try again, or report the problem below." });
  }
}

async function createPortalSession(customerId: string, returnUrl: string): Promise<StripePortalSession> {
  const fields: Record<string, string> = { customer: customerId, return_url: returnUrl };
  const configuration = process.env.PATRON_POST_PORTAL_CONFIGURATION_ID;
  if (configuration) fields.configuration = configuration;
  return stripeRequest<StripePortalSession>("/v1/billing_portal/sessions", "POST", fields);
}

export async function refreshPatronPostStatuses(): Promise<Map<string, PatronPostSubscriptionInfo>> {
  const subscriptionInfo = new Map<string, PatronPostSubscriptionInfo>();
  const records = await db.select({
    id: patronPostSubscriptionsTable.id,
    stripeSubscriptionId: patronPostSubscriptionsTable.stripeSubscriptionId,
  }).from(patronPostSubscriptionsTable);
  for (const record of records) {
    try {
      const subscription = await stripeRequest<StripeSubscription>(
        `/v1/subscriptions/${encodeURIComponent(record.stripeSubscriptionId)}?expand%5B%5D=customer`,
      );
      const product = subscription.metadata?.product ?? "";
      if (!patronPostProducts.has(product)) continue;
      const deliveryType: PatronPostDeliveryType = digitalPatronPostProducts.has(product) ? "digital" : "physical";
      subscriptionInfo.set(record.stripeSubscriptionId, {
        signupSource: product === patronPostProduct || product === sketchyShonaDigitalPatronPostProduct
          ? "sketchy_shona"
          : "countercult",
        deliveryType,
      });
      const periodEnd = subscription.items?.data?.[0]?.current_period_end;
      const shipping = typeof subscription.customer === "object" ? subscription.customer.shipping : null;
      const shippingAddress = shipping?.address;
      const mailingName = fullMailingName(shipping?.name)
        ?? fullMailingNameFromMetadata(subscription.metadata);
      await db.update(patronPostSubscriptionsTable).set({
        deliveryType,
        status: subscription.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        ...(deliveryType === "physical" && shippingAddress ? {
          ...(mailingName ? { mailingName } : {}),
          addressLine1: shippingAddress.line1 ?? "",
          addressLine2: shippingAddress.line2 ?? "",
          city: shippingAddress.city ?? "",
          region: shippingAddress.state ?? "",
          postalCode: shippingAddress.postal_code ?? "",
          country: shippingAddress.country ?? "",
        } : {}),
      }).where(eq(patronPostSubscriptionsTable.id, record.id));
    } catch (error) {
      logger.warn({ err: error, subscriptionId: record.stripeSubscriptionId }, "Patron Post subscription status refresh failed");
    }
  }
  return subscriptionInfo;
}

router.get("/patron-post/availability", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { earlySupporter, membershipCents, totalCents } = await currentPricing();
    res.json({ earlySupporter, membershipCents, totalCents });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Patron Post pricing is unavailable." });
  }
});

router.get("/countercult-patron-post/availability", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const { earlySupporter, membershipCents, totalCents } = await currentPricing(countercultPricing);
    res.json({ earlySupporter, membershipCents, totalCents });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Countercult Patron Post pricing is unavailable." });
  }
});

router.get("/countercult-patron-post/digital-availability", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const price = await currentDigitalPrice(countercultDigitalPricing);
    res.json({ available: Boolean(price), amountCents: price?.unit_amount ?? null });
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Digital Patron Post pricing is unavailable." });
  }
});

router.get("/patron-post/digital-availability", async (_req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ available: false, amountCents: null });
});

router.get("/patron-post/progress", async (req, res): Promise<void> => {
  try {
    const [result] = await db
      .select({ activeMembers: count() })
      .from(patronPostSubscriptionsTable)
      .where(eq(patronPostSubscriptionsTable.status, "active"));
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(GetPatronPostProgressResponse.parse({
      activeMembers: result?.activeMembers ?? 0,
      goal: patronPostMemberGoal,
    }));
  } catch (error) {
    req.log.error({ err: error }, "Patron Post progress could not be loaded");
    res.status(503).json({ error: "Membership progress is temporarily unavailable." });
  }
});

router.post("/patron-post/checkout", checkoutLimiter, async (req, res): Promise<void> => {
  try {
    const parsed = CheckoutInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Enter the first and last name for the mailing." });
      return;
    }
    const pricing = await currentPricing();
    const origin = getSiteOrigin(req);
    const isGift = parsed.data.gift ?? false;
    const fields: Record<string, string> = {
      mode: "subscription",
      success_url: `${origin}/sketchyshona/mail-club?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/sketchyshona/mail-club?cancelled=1`,
      "line_items[0][price]": pricing.membershipPriceId,
      "line_items[0][quantity]": "1",
      "line_items[1][price]": pricing.postagePriceId,
      "line_items[1][quantity]": "1",
      "billing_address_collection": "auto",
      "shipping_address_collection[allowed_countries][0]": shippingCountries[0],
      "metadata[product]": patronPostProduct,
      "metadata[is_gift]": String(isGift),
      "metadata[mailing_first_name]": parsed.data.mailingFirstName,
      "metadata[mailing_last_name]": parsed.data.mailingLastName,
      "subscription_data[metadata][product]": patronPostProduct,
      "subscription_data[metadata][is_gift]": String(isGift),
      "subscription_data[metadata][mailing_first_name]": parsed.data.mailingFirstName,
      "subscription_data[metadata][mailing_last_name]": parsed.data.mailingLastName,
      "subscription_data[billing_mode][type]": "flexible",
    };
    shippingCountries.slice(1).forEach((country, index) => {
      fields[`shipping_address_collection[allowed_countries][${index + 1}]`] = country;
    });
    if (pricing.earlySupporter) {
      const couponId = process.env.PATRON_POST_EARLY_SUPPORTER_COUPON_ID;
      if (couponId) fields["discounts[0][coupon]"] = couponId;
    }
    const session = await stripeRequest<StripeCheckoutSession & { url?: string }>(
      "/v1/checkout/sessions",
      "POST",
      fields,
      flexibleBillingStripeApiVersion,
    );
    if (!session.url) throw new Error("Stripe did not return a secure checkout URL.");
    res.json({ url: session.url });
  } catch (error) {
    req.log.error({ err: error }, "Patron Post checkout session could not be created");
    void sendPatronPostCheckoutFailureAlert(
      "sketchy_shona",
      error instanceof Error ? error.message : "Unknown checkout error",
    );
    res.status(503).json({ error: "Checkout didn’t open. Please try again, or report the problem below." });
  }
});

router.post("/countercult-patron-post/checkout", checkoutLimiter, async (req, res): Promise<void> => {
  try {
    const parsed = CheckoutInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Enter the first and last name for the mailing." });
      return;
    }
    const pricing = await currentPricing(countercultPricing);
    const origin = getSiteOrigin(req);
    const isGift = parsed.data.gift ?? false;
    const fields: Record<string, string> = {
      mode: "subscription",
      success_url: `${origin}/collective-fund/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/collective-fund?cancelled=1#join`,
      "line_items[0][price]": pricing.membershipPriceId,
      "line_items[0][quantity]": "1",
      "line_items[1][price]": pricing.postagePriceId,
      "line_items[1][quantity]": "1",
      billing_address_collection: "auto",
      "shipping_address_collection[allowed_countries][0]": shippingCountries[0],
      "metadata[product]": countercultPatronPostProduct,
      "metadata[is_gift]": String(isGift),
      "metadata[mailing_first_name]": parsed.data.mailingFirstName,
      "metadata[mailing_last_name]": parsed.data.mailingLastName,
      "subscription_data[metadata][product]": countercultPatronPostProduct,
      "subscription_data[metadata][is_gift]": String(isGift),
      "subscription_data[metadata][mailing_first_name]": parsed.data.mailingFirstName,
      "subscription_data[metadata][mailing_last_name]": parsed.data.mailingLastName,
      "subscription_data[billing_mode][type]": "flexible",
    };
    shippingCountries.slice(1).forEach((country, index) => {
      fields[`shipping_address_collection[allowed_countries][${index + 1}]`] = country;
    });
    if (pricing.earlySupporter) {
      const couponId = process.env[countercultPricing.couponEnv];
      if (couponId) fields["discounts[0][coupon]"] = couponId;
    }
    const session = await stripeRequest<StripeCheckoutSession & { url?: string }>(
      "/v1/checkout/sessions",
      "POST",
      fields,
      flexibleBillingStripeApiVersion,
    );
    if (!session.url) throw new Error("Stripe did not return a secure checkout URL.");
    res.json({ url: session.url });
  } catch (error) {
    req.log.error({ err: error }, "Countercult Patron Post checkout session could not be created");
    void sendPatronPostCheckoutFailureAlert(
      "countercult",
      error instanceof Error ? error.message : "Unknown checkout error",
    );
    res.status(503).json({ error: "Checkout didn’t open. Please try again, or report the problem below." });
  }
});

router.post("/countercult-patron-post/digital-checkout", checkoutLimiter, async (req, res): Promise<void> => {
  await startDigitalCheckout(req, res, countercultDigitalPricing);
});

router.post("/patron-post/digital-checkout", checkoutLimiter, async (req, res): Promise<void> => {
  res.status(410).json({ error: "Sketchy Shona currently offers physical Patron Post only." });
});

router.post("/patron-post/contribution/checkout", checkoutLimiter, async (req, res): Promise<void> => {
  await startContributionCheckout(req, res, sketchyShonaPricing, "Sketchy Shona");
});

router.post("/countercult-patron-post/contribution/checkout", checkoutLimiter, async (req, res): Promise<void> => {
  await startContributionCheckout(req, res, countercultPricing, "Countercult");
});

router.post("/countercult-patron-post/snail-contribution/checkout", checkoutLimiter, async (req, res): Promise<void> => {
  await startContributionCheckout(req, res, countercultPricing, "Countercult", "/snail");
});

router.post("/patron-post/contribution/complete", checkoutLimiter, async (req, res): Promise<void> => {
  const parsed = SessionInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid checkout session is required." });
    return;
  }
  try {
    const session = await stripeRequest<StripeCheckoutSession>(
      `/v1/checkout/sessions/${encodeURIComponent(parsed.data.sessionId)}`,
    );
    assertStripeMode(session.livemode, "contribution checkout session");
    if (session.metadata?.product !== "patron_post_contribution") {
      res.status(404).json({ error: "This checkout session is not a Patron Post contribution." });
      return;
    }
    if (session.status !== "complete" || session.payment_status !== "paid") {
      res.status(409).json({ error: "The contribution payment is not complete yet." });
      return;
    }
    res.json({
      completed: true,
      beneficiary: session.metadata.beneficiary,
      artReward: session.metadata.art_reward === "true",
      amountCents: session.amount_total,
    });
  } catch (error) {
    req.log.error({ err: error }, "Patron Post contribution confirmation failed");
    res.status(503).json({ error: "The payment completed, but its confirmation could not be loaded yet." });
  }
});

router.post("/patron-post/complete", checkoutLimiter, async (req, res): Promise<void> => {
  const parsed = SessionInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid checkout session is required." });
    return;
  }
  try {
    const session = await stripeRequest<StripeCheckoutSession>(
      `/v1/checkout/sessions/${encodeURIComponent(parsed.data.sessionId)}`,
    );
    assertStripeMode(session.livemode, "checkout session");
    if (!patronPostProducts.has(session.metadata?.product ?? "")) {
      res.status(404).json({ error: "This checkout session is not a Patron Post membership." });
      return;
    }
    if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) {
      res.status(409).json({ error: "The Stripe checkout is not complete yet." });
      return;
    }
    const customerId = stripeId(session.customer);
    const subscriptionId = stripeId(session.subscription);
    if (!customerId || !subscriptionId) {
      res.status(409).json({ error: "Stripe has not attached a customer and subscription to this checkout." });
      return;
    }
    const [customer, subscription] = await Promise.all([
      stripeRequest<StripeCustomer>(`/v1/customers/${encodeURIComponent(customerId)}`),
      stripeRequest<StripeSubscription>(`/v1/subscriptions/${encodeURIComponent(subscriptionId)}`),
    ]);
    if (!patronPostProducts.has(subscription.metadata?.product ?? "")) {
      res.status(404).json({ error: "This Stripe subscription is not a Patron Post membership." });
      return;
    }
    const product = subscription.metadata?.product ?? session.metadata?.product ?? "";
    const isDigital = digitalPatronPostProducts.has(product);
    const isGift = !isDigital && session.metadata?.is_gift === "true";
    const shipping = session.collected_information?.shipping_details ?? customer.shipping;
    const mailingName = fullMailingName(shipping?.name)
      ?? fullMailingNameFromMetadata(session.metadata)
      ?? fullMailingName(session.customer_details?.name)
      ?? fullMailingName(customer.name);
    const address: StripeAddress = isDigital
      ? {}
      : isGift
      ? shipping?.address ?? {}
      : shipping?.address ?? session.customer_details?.address ?? {};
    const email = (session.customer_details?.email ?? customer.email ?? "").trim().toLowerCase();
    if (!email) {
      res.status(422).json({ error: "Stripe did not provide an email address for this membership." });
      return;
    }
    const periodEnd = subscription.items?.data?.[0]?.current_period_end;
    if (isGift && !shipping?.address?.line1) {
      res.status(422).json({ error: "A recipient delivery address is required for a gift membership." });
      return;
    }
    if (!isDigital && !mailingName) {
      res.status(422).json({ error: "The mailing recipient’s first and last name are required." });
      return;
    }
    const subscriptionValues = {
      customerName: session.customer_details?.name ?? customer.name ?? "",
      email,
      mailingName: isDigital ? "" : mailingName ?? "",
      addressLine1: address.line1 ?? "",
      addressLine2: address.line2 ?? "",
      city: address.city ?? "",
      region: address.state ?? "",
      postalCode: address.postal_code ?? "",
      country: address.country ?? "",
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      stripeCheckoutSessionId: session.id,
      isGift,
      deliveryType: isDigital ? "digital" : "physical",
      status: subscription.status,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
      amountCents: session.amount_total ?? (isDigital ? 700 : 1100),
      currency: session.currency ?? "eur",
    };
    const inserted = await db.insert(patronPostSubscriptionsTable)
      .values(subscriptionValues)
      .onConflictDoNothing({ target: patronPostSubscriptionsTable.stripeSubscriptionId })
      .returning({ id: patronPostSubscriptionsTable.id });
    let welcomeEmailSent = false;
    if (inserted.length === 0) {
      await db.update(patronPostSubscriptionsTable)
        .set(subscriptionValues)
        .where(eq(patronPostSubscriptionsTable.stripeSubscriptionId, subscriptionId));
    } else if (
      session.metadata?.product === countercultPatronPostProduct
      || session.metadata?.product === countercultDigitalPatronPostProduct
    ) {
      try {
        welcomeEmailSent = await sendCollectiveFundWelcomeEmail(email, isDigital ? "digital" : "physical");
      } catch (emailError) {
        req.log.error({ err: emailError }, "Collective Fund welcome email could not be sent");
      }
    } else if (session.metadata?.product === sketchyShonaDigitalPatronPostProduct) {
      try {
        welcomeEmailSent = await sendSketchyShonaDigitalWelcomeEmail(email);
      } catch (emailError) {
        req.log.error({ err: emailError }, "Sketchy Shona digital membership welcome email could not be sent");
      }
    }
    res.json({
      completed: true,
      gift: isGift,
      product: session.metadata?.product,
      deliveryType: isDigital ? "digital" : "physical",
      welcomeEmailSent,
    });
  } catch (error) {
    req.log.error({ err: error }, "Patron Post checkout confirmation could not be saved");
    res.status(503).json({ error: "Checkout completed, but the membership record could not be confirmed yet. Refresh this page to retry." });
  }
});

router.post("/patron-post/portal", portalLimiter, async (req, res): Promise<void> => {
  const parsed = SessionInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A valid checkout session is required." });
    return;
  }
  try {
    const session = await stripeRequest<StripeCheckoutSession>(
      `/v1/checkout/sessions/${encodeURIComponent(parsed.data.sessionId)}`,
    );
    assertStripeMode(session.livemode, "checkout session");
    if (!patronPostProducts.has(session.metadata?.product ?? "") || session.status !== "complete") {
      res.status(404).json({ error: "The completed membership could not be found." });
      return;
    }
    const customerId = stripeId(session.customer);
    if (!customerId) {
      res.status(404).json({ error: "The membership customer could not be found." });
      return;
    }
    const portal = await createPortalSession(
      customerId,
      session.metadata?.product === countercultPatronPostProduct
        ? `${getSiteOrigin(req)}/collective-fund`
        : `${getSiteOrigin(req)}/sketchyshona/mail-club`,
    );
    res.json({ url: portal.url });
  } catch (error) {
    req.log.error({ err: error }, "Patron Post member portal could not be opened");
    res.status(503).json({ error: "Membership management is temporarily unavailable." });
  }
});

router.post("/patron-post/portal-link", portalLimiter, async (req, res): Promise<void> => {
  const parsed = EmailInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a valid membership email address." });
    return;
  }
  const email = parsed.data.email.toLowerCase();
  try {
    const [subscriber] = await db.select({
      stripeCustomerId: patronPostSubscriptionsTable.stripeCustomerId,
    }).from(patronPostSubscriptionsTable)
      .where(eq(patronPostSubscriptionsTable.email, email))
      .orderBy(desc(patronPostSubscriptionsTable.createdAt))
      .limit(1);
    if (subscriber) {
      const portal = await createPortalSession(
        subscriber.stripeCustomerId,
        `${getSiteOrigin(req)}/sketchyshona/mail-club`,
      );
      await sendPatronPostPortalLinkEmail(email, portal.url);
    }
    res.json({ message: "If that email belongs to an active membership, a secure link will arrive shortly." });
  } catch (error) {
    req.log.error({ err: error }, "Patron Post portal link could not be sent");
    res.status(503).json({ error: "The secure membership link could not be sent right now." });
  }
});

router.post("/patron-post/questions", anonymousQuestionLimiter, async (req, res): Promise<void> => {
  const parsed = SubmitPatronPostQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Write a question between 10 and 1,200 characters." });
    return;
  }
  const question = parsed.data.question.trim();
  if (question.length < 10) {
    res.status(400).json({ error: "Write a question between 10 and 1,200 characters." });
    return;
  }
  try {
    await db.insert(patronPostQuestionsTable).values({ question });
    res.status(202).json(SubmitPatronPostQuestionResponse.parse({
      submitted: true,
      message: "Thanks. Your anonymous question is saved for review.",
    }));
  } catch (error) {
    req.log.error({ err: error }, "Anonymous Patron Post question could not be saved");
    res.status(503).json({ error: "Your question could not be saved right now. Please try again later." });
  }
});

router.get("/studio/patron-post/questions", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  try {
    const questions = await db.select().from(patronPostQuestionsTable)
      .orderBy(desc(patronPostQuestionsTable.createdAt));
    res.setHeader("Cache-Control", "no-store");
    res.json(GetStudioPatronPostQuestionsResponse.parse(questions));
  } catch (error) {
    req.log.error({ err: error }, "Anonymous Patron Post questions could not be loaded");
    res.status(503).json({ error: "Questions could not be loaded right now." });
  }
});

router.patch("/studio/patron-post/questions/:id", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const params = UpdateStudioPatronPostQuestionStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "A valid question ID is required." });
    return;
  }
  const parsed = UpdateStudioPatronPostQuestionStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a valid question review status." });
    return;
  }
  try {
    const [question] = await db.update(patronPostQuestionsTable).set({
      status: parsed.data.status,
      reviewedAt: parsed.data.status === "reviewed" ? new Date() : null,
    }).where(eq(patronPostQuestionsTable.id, params.data.id)).returning();
    if (!question) {
      res.status(404).json({ error: "Question not found." });
      return;
    }
    res.json(UpdateStudioPatronPostQuestionStatusResponse.parse(question));
  } catch (error) {
    req.log.error({ err: error }, "Anonymous Patron Post question status could not be updated");
    res.status(503).json({ error: "Question status could not be updated right now." });
  }
});

router.delete("/studio/patron-post/questions/:id", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const params = DeleteStudioPatronPostQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "A valid question ID is required." });
    return;
  }
  try {
    const [question] = await db.delete(patronPostQuestionsTable)
      .where(eq(patronPostQuestionsTable.id, params.data.id))
      .returning({ id: patronPostQuestionsTable.id });
    if (!question) {
      res.status(404).json({ error: "Question not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, "Anonymous Patron Post question could not be deleted");
    res.status(503).json({ error: "Question could not be deleted right now." });
  }
});

router.get("/studio/patron-post/subscriptions", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  try {
    const subscriptionInfo = await refreshPatronPostStatuses();
    const subscribers = await db.select({
      id: patronPostSubscriptionsTable.id,
      stripeSubscriptionId: patronPostSubscriptionsTable.stripeSubscriptionId,
      customerName: patronPostSubscriptionsTable.customerName,
      email: patronPostSubscriptionsTable.email,
      mailingName: patronPostSubscriptionsTable.mailingName,
      addressLine1: patronPostSubscriptionsTable.addressLine1,
      addressLine2: patronPostSubscriptionsTable.addressLine2,
      city: patronPostSubscriptionsTable.city,
      region: patronPostSubscriptionsTable.region,
      postalCode: patronPostSubscriptionsTable.postalCode,
      country: patronPostSubscriptionsTable.country,
      status: patronPostSubscriptionsTable.status,
      currentPeriodEnd: patronPostSubscriptionsTable.currentPeriodEnd,
      cancelAtPeriodEnd: patronPostSubscriptionsTable.cancelAtPeriodEnd,
      canceledAt: patronPostSubscriptionsTable.canceledAt,
      isGift: patronPostSubscriptionsTable.isGift,
      deliveryType: patronPostSubscriptionsTable.deliveryType,
      createdAt: patronPostSubscriptionsTable.createdAt,
    }).from(patronPostSubscriptionsTable).orderBy(desc(patronPostSubscriptionsTable.createdAt));
    res.setHeader("Cache-Control", "no-store");
    res.json(subscribers.map(({ stripeSubscriptionId, ...subscriber }) => {
      const info = subscriptionInfo.get(stripeSubscriptionId);
      return {
        ...subscriber,
        signupSource: info?.signupSource ?? "unknown",
        deliveryType: info?.deliveryType ?? subscriber.deliveryType,
      };
    }));
  } catch (error) {
    req.log.error({ err: error }, "Patron Post subscriber records could not be loaded");
    res.status(503).json({ error: "Subscriber records could not be loaded." });
  }
});

router.get("/studio/patron-post/contributions", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  try {
    const beneficiaries = ["Countercult", "Sketchy Shona"] as const;
    type Beneficiary = typeof beneficiaries[number];
    type ContributionStatus = "paid" | "open" | "unpaid" | "expired";
    type ContributionRecord = {
      id: string;
      beneficiary: Beneficiary;
      amountCents: number | null;
      currency: string | null;
      createdAt: string;
      status: ContributionStatus;
    };
    type ContributionTotal = {
      beneficiary: Beneficiary;
      currency: string;
      paidCount: number;
      paidAmountCents: number;
    };

    const contributionRecords: ContributionRecord[] = [];
    const totalsByKey = new Map<string, ContributionTotal>();
    let startingAfter: string | undefined;
    let hasMore = true;
    let pageCount = 0;
    const pageSize = 100;
    const maxPages = 100;

    while (hasMore && pageCount < maxPages) {
      const params = new URLSearchParams({ limit: String(pageSize) });
      if (startingAfter) params.set("starting_after", startingAfter);
      const page = await stripeRequest<StripeCheckoutSessionList>(
        `/v1/checkout/sessions?${params.toString()}`,
      );
      if (!Array.isArray(page.data) || typeof page.has_more !== "boolean") {
        throw new Error("Stripe returned an invalid Checkout Session page.");
      }
      pageCount += 1;

      for (const session of page.data) {
        if (
          session.livemode !== true
          || session.mode !== "payment"
          || session.metadata?.product !== "patron_post_contribution"
        ) continue;

        const beneficiary = beneficiaries.find((candidate) => candidate === session.metadata?.beneficiary);
        if (!beneficiary) continue;
        if (typeof session.created !== "number" || !Number.isFinite(session.created)) {
          throw new Error("Stripe returned a contribution without a valid creation time.");
        }

        const status: ContributionStatus = session.status === "complete" && session.payment_status === "paid"
          ? "paid"
          : session.status === "expired"
            ? "expired"
            : session.status === "open"
              ? "open"
              : "unpaid";
        const amountCents = typeof session.amount_total === "number"
          && Number.isSafeInteger(session.amount_total)
          && session.amount_total >= 0
          ? session.amount_total
          : null;
        const currency = typeof session.currency === "string" ? session.currency.toLowerCase() : null;
        contributionRecords.push({
          id: session.id,
          beneficiary,
          amountCents,
          currency,
          createdAt: new Date(session.created * 1000).toISOString(),
          status,
        });

        if (status === "paid") {
          if (amountCents === null || currency === null) {
            throw new Error("Stripe returned a paid contribution without its amount or currency.");
          }
          const key = `${beneficiary}:${currency}`;
          const total = totalsByKey.get(key) ?? {
            beneficiary,
            currency,
            paidCount: 0,
            paidAmountCents: 0,
          };
          total.paidCount += 1;
          total.paidAmountCents += amountCents;
          totalsByKey.set(key, total);
        }
      }

      hasMore = page.has_more;
      if (hasMore) {
        const lastSessionId = page.data.at(-1)?.id;
        if (!lastSessionId || lastSessionId === startingAfter) {
          throw new Error("Stripe contribution pagination did not advance.");
        }
        if (pageCount >= maxPages) {
          throw new Error("Stripe contribution history exceeds the safe page limit.");
        }
        startingAfter = lastSessionId;
      }
    }

    const totals: ContributionTotal[] = beneficiaries.flatMap((beneficiary) => {
      const matches = [...totalsByKey.values()].filter((total) => total.beneficiary === beneficiary);
      return matches.length
        ? matches
        : [{ beneficiary, currency: "eur", paidCount: 0, paidAmountCents: 0 }];
    });
    contributionRecords.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    res.setHeader("Cache-Control", "no-store");
    res.json(GetStudioPatronPostContributionsResponse.parse({
      totals,
      contributions: contributionRecords.slice(0, 50),
    }));
  } catch (error) {
    req.log.error({ err: error }, "Patron Post contribution history could not be loaded");
    res.status(503).json({ error: "Contribution records could not be loaded." });
  }
});

export default router;
