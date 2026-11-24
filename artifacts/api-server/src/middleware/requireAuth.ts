import type { Request, Response, NextFunction } from "express";
import { db, magicLinkTokensTable, usersTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

/**
 * Validates Bearer session token and attaches `req.session` + `req.sessionUser`.
 * Returns 401 if no valid session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }

  const now = new Date();
  const [session] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(
      eq(magicLinkTokensTable.token, token),
      eq(magicLinkTokensTable.purpose, "session"),
      gt(magicLinkTokensTable.expiresAt, now),
    ));

  if (!session) {
    res.status(401).json({ error: "invalid or expired session" });
    return;
  }

  // Attach session to request for downstream handlers
  (req as any).ccSession = session;
  next();
}

/**
 * Attaches a valid session when one is supplied without blocking public requests.
 * Invalid and expired tokens are treated as anonymous; protected handlers must
 * still check approval before returning member-only data.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    next();
    return;
  }

  const [session] = await db
    .select()
    .from(magicLinkTokensTable)
    .where(and(
      eq(magicLinkTokensTable.token, token),
      eq(magicLinkTokensTable.purpose, "session"),
      gt(magicLinkTokensTable.expiresAt, new Date()),
    ))
    .limit(1);

  if (session) (req as any).ccSession = session;
  next();
}

/**
 * Requires an approved user (is_approved = true on the users table).
 * Must be applied AFTER requireAuth.
 */
export async function requireApproved(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = (req as any).ccSession;
  if (!session) {
    res.status(401).json({ error: "not authenticated" });
    return;
  }

  const [user] = await db
    .select({ isApproved: usersTable.isApproved })
    .from(usersTable)
    .where(eq(usersTable.email, session.email));

  if (!user || !user.isApproved) {
    res.status(403).json({ error: "account pending approval" });
    return;
  }

  next();
}
