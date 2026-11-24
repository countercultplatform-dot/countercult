import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, exchangeDigestUnsubscribeTokensTable, usersTable } from "@workspace/db";
import { hashExchangeDigestUnsubscribeToken } from "../lib/exchangeDigest.js";

const router: IRouter = Router();

function unsubscribePage(title: string, message: string, token?: string): string {
  const form = token
    ? `<form method="post" action="/api/exchange-digest/unsubscribe?token=${token}"><button type="submit" style="border:2px solid #000;background:#c6ff3d;padding:12px 16px;font-weight:bold;text-transform:uppercase;cursor:pointer">Unsubscribe</button></form>`
    : "";
  return `<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="referrer" content="no-referrer"><title>${title} · Countercult</title>
    <style>body{margin:0;background:#f9f9f6;color:#111;font:16px Arial,sans-serif}.panel{max-width:560px;margin:12vh auto;padding:32px;border:2px solid #111;background:#fff;box-shadow:6px 6px 0 #111}h1{font-size:clamp(28px,7vw,44px);line-height:1;margin:0 0 16px;text-transform:uppercase}p{line-height:1.6;color:#444;margin:0 0 24px}a{color:#111}</style></head>
    <body><main class="panel"><p style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#666">Countercult · Exchange</p>
    <h1>${title}</h1><p>${message}</p>${form}<p style="margin-top:24px"><a href="https://countercult.network">Back to Countercult</a></p></main></body></html>`;
}

router.get("/exchange-digest/unsubscribe", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!/^[a-f0-9]{64}$/.test(token)) {
    res.status(400).type("html").send(unsubscribePage(
      "Link not valid",
      "This unsubscribe link is missing or invalid. You can update your email preferences from your Countercult member home.",
    ));
    return;
  }

  const [savedToken] = await db
    .select({ email: exchangeDigestUnsubscribeTokensTable.email })
    .from(exchangeDigestUnsubscribeTokensTable)
    .where(eq(exchangeDigestUnsubscribeTokensTable.tokenHash, hashExchangeDigestUnsubscribeToken(token)))
    .limit(1);
  res.set({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  if (!savedToken) {
    res.status(410).type("html").send(unsubscribePage(
      "Link expired",
      "This unsubscribe link has already been used or is no longer valid.",
    ));
    return;
  }

  res.type("html").send(unsubscribePage(
    "Stop the weekly Exchange email?",
    "Confirm below to stop weekly Exchange digests. This will not change your Countercult account or other email preferences.",
    token,
  ));
});

router.post("/exchange-digest/unsubscribe", async (req, res): Promise<void> => {
  const queryToken = typeof req.query.token === "string" ? req.query.token : "";
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : "";
  const token = queryToken || bodyToken;
  if (!/^[a-f0-9]{64}$/.test(token)) {
    res.status(400).type("html").send(unsubscribePage(
      "Link not valid",
      "This unsubscribe link is missing or invalid. You can update your email preferences from your Countercult member home.",
    ));
    return;
  }

  const tokenHash = hashExchangeDigestUnsubscribeToken(token);
  const unsubscribed = await db.transaction(async (tx) => {
    const [savedToken] = await tx
      .select({ email: exchangeDigestUnsubscribeTokensTable.email })
      .from(exchangeDigestUnsubscribeTokensTable)
      .where(eq(exchangeDigestUnsubscribeTokensTable.tokenHash, tokenHash))
      .limit(1);
    if (!savedToken) return false;

    await tx
      .update(usersTable)
      .set({ exchangeDigestOptIn: false, exchangeDigestOptedInAt: null })
      .where(and(
        eq(usersTable.email, savedToken.email),
        eq(usersTable.exchangeDigestOptIn, true),
      ));
    await tx
      .delete(exchangeDigestUnsubscribeTokensTable)
      .where(eq(exchangeDigestUnsubscribeTokensTable.email, savedToken.email));
    return true;
  });

  res.set({
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  res.type("html").send(unsubscribePage(
    unsubscribed ? "You’re unsubscribed" : "Already unsubscribed",
    unsubscribed
      ? "You will no longer receive the weekly Exchange digest. Your Countercult account and other email preferences are unchanged."
      : "This link has already been used. You will not receive the weekly Exchange digest.",
  ));
});

export default router;
