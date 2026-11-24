import { Router, type IRouter } from "express";
import { db, entriesTable, magicLinkTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const nominationSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  kind: z.enum(["artist", "space", "artifact"]).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  url: z.string().url().optional().or(z.literal("")),
  blurb: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
});

async function resolveSessionEmail(authHeader: string): Promise<string | null> {
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const [session] = await db
    .select({ email: magicLinkTokensTable.email })
    .from(magicLinkTokensTable)
    .where(
      and(
        eq(magicLinkTokensTable.token, token),
        eq(magicLinkTokensTable.purpose, "session"),
        gt(magicLinkTokensTable.expiresAt, new Date()),
      )
    );
  return session?.email ?? null;
}

router.post("/nominations", async (req, res) => {
  const parsed = nominationSchema.safeParse(req.body);
  if (!parsed.success) {
    return void res.status(400).json({ error: "invalid input", issues: parsed.error.issues });
  }
  const { email, name, kind, city, country, url, blurb } = parsed.data;

  const submittedBy = await resolveSessionEmail(req.headers.authorization ?? "");

  const [entry] = await db
    .insert(entriesTable)
    .values({
      name: name ?? email.split("@")[0],
      kind: kind ?? "artist",
      city: city ?? "",
      country: country ?? "",
      url: url ?? null,
      blurb: blurb ?? null,
      contactEmail: email,
      status: "pending_review",
      isClaimed: false,
      submittedBy: submittedBy ?? null,
    })
    .returning({ id: entriesTable.id });

  req.log.info({ entryId: entry?.id, email, submittedBy }, "nomination created");
  return void res.status(201).json({ ok: true, id: entry?.id });
});

export default router;
