import { Router, type IRouter } from "express";
import { and, desc, eq, lte } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db, residencyOffersTable } from "@workspace/db";

const router: IRouter = Router();
export const ADVERT_LIFETIME_MS = 14 * 24 * 60 * 60 * 1000;
const advertPostingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

export async function expireStaleAdverts(now = new Date()): Promise<{ deactivated: number; ids: number[] }> {
  const cutoff = new Date(now.getTime() - ADVERT_LIFETIME_MS);
  const expired = await db.update(residencyOffersTable)
    .set({ isActive: false })
    .where(and(
      eq(residencyOffersTable.kind, "advert"),
      eq(residencyOffersTable.isActive, true),
      lte(residencyOffersTable.createdAt, cutoff),
    ))
    .returning({ id: residencyOffersTable.id });

  return { deactivated: expired.length, ids: expired.map((offer) => offer.id) };
}
const advertInput = z.object({
  direction: z.enum(["service", "hiring", "open_call"]),
  posterName: z.string().trim().min(1).max(100),
  posterEmail: z.string().trim().email().max(254),
  city: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(10).max(4000),
  contact: z.string().trim().min(1).max(300),
  rate: z.string().trim().max(120).optional(),
}).refine((input) => !input.rate || /[1-9]/.test(input.rate), {
  path: ["rate"],
  message: "Enter a specific rate or budget, or leave it blank.",
});

router.get("/adverts", async (_req, res) => {
  const now = new Date();
  await expireStaleAdverts(now);
  const offers = await db.select().from(residencyOffersTable)
    .where(and(eq(residencyOffersTable.kind, "advert"), eq(residencyOffersTable.isActive, true)))
    .orderBy(desc(residencyOffersTable.createdAt));
  res.json(offers.map((offer) => ({
    id: offer.id,
    tier: offer.tags.includes("advert:free")
      ? "free"
      : offer.tags.includes("advert:community")
        ? "community"
        : "commercial",
    direction: offer.tags.includes("advert:open_call")
      ? "open_call"
      : offer.tags.includes("advert:service")
        ? "service"
        : "hiring",
    posterName: offer.posterName ?? "Countercult member",
    city: offer.city,
    title: offer.destination ?? "Advert",
    rate: offer.cost,
    description: offer.description,
    contact: offer.contact,
    createdAt: offer.createdAt,
    expiresAt: new Date(offer.createdAt.getTime() + ADVERT_LIFETIME_MS).toISOString(),
  })));
});

router.post("/adverts", advertPostingLimiter, async (req, res): Promise<void> => {
  const parsed = advertInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid advert details" });
    return;
  }
  try {
    const input = parsed.data;
    const [offer] = await db.insert(residencyOffersTable).values({
      kind: "advert",
      posterName: input.posterName,
      posterEmail: input.posterEmail,
      city: input.city,
      destination: input.title,
      description: input.description,
      contact: input.contact,
      cost: input.direction === "hiring" ? input.rate?.trim() || null : null,
      tags: [
        "advert:free",
        input.direction === "open_call"
          ? "advert:open_call"
          : input.direction === "service"
            ? "advert:service"
            : "advert:hiring",
      ],
      isActive: true,
      visibility: "public",
    }).returning({ id: residencyOffersTable.id });
    res.status(201).json({ id: offer.id, published: true });
  } catch (error) {
    req.log.error({ err: error }, "Free advert posting failed");
    res.status(500).json({ error: "Could not publish your advert. Please try again." });
  }
});

export default router;
