import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, postsTable } from "@workspace/db";
import { CreatePostBody } from "@workspace/api-zod";

const router: IRouter = Router();

function isAdmin(req: Parameters<Parameters<typeof router.get>[1]>[0]): boolean {
  return req.headers["x-admin-password"] === process.env["ADMIN_PASSWORD"];
}

// GET /posts — list published posts
router.get("/posts", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.isPublished, true))
    .orderBy(desc(postsTable.createdAt));
  res.json(rows);
});

// GET /posts/:id — single post
router.get("/posts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post || !post.isPublished) { res.status(404).json({ error: "Not found" }); return; }

  res.json(post);
});

// POST /posts — admin only
router.post("/posts", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Admin password required" }); return; }

  const parsed = CreatePostBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: String(parsed.error) }); return; }

  const { title, body, heroImage, tags } = parsed.data;

  const [post] = await db.insert(postsTable).values({
    kind: "editorial",
    title,
    body,
    heroImage: heroImage ?? null,
    tags: tags ?? [],
    authorName: "countercult",
    isPublished: true,
  }).returning();

  res.status(201).json(post);
});

// DELETE /posts/:id — admin only
router.delete("/posts/:id", async (req, res): Promise<void> => {
  if (!isAdmin(req)) { res.status(401).json({ error: "Admin password required" }); return; }

  const id = parseInt(req.params["id"] ?? "", 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id));
  if (!post) { res.status(404).json({ error: "Not found" }); return; }

  await db.delete(postsTable).where(eq(postsTable.id, id));
  res.status(204).end();
});

export default router;
