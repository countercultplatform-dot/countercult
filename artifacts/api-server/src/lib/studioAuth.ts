import crypto from "node:crypto";
import type { Request, Response } from "express";

const STUDIO_SESSION_COOKIE = "studio_access";
const STUDIO_SESSION_TTL_SECONDS = 8 * 60 * 60;

function configuredSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be configured for Studio sessions");
  return secret;
}

function secureEqual(candidate: string | undefined, expected: string | undefined) {
  if (!candidate || !expected) return false;
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length
    && crypto.timingSafeEqual(candidateBytes, expectedBytes);
}

function readCookie(req: Request, name: string) {
  for (const item of (req.get("cookie") ?? "").split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0 || item.slice(0, separator).trim() !== name) continue;
    return item.slice(separator + 1).trim();
  }
  return undefined;
}

export function createStudioSessionToken() {
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + STUDIO_SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomBytes(24).toString("base64url"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", configuredSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isStudioSessionValid(req: Request) {
  const token = readCookie(req, STUDIO_SESSION_COOKIE);
  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  let expected: string;
  try {
    expected = crypto.createHmac("sha256", configuredSecret()).update(payload).digest("base64url");
  } catch {
    return false;
  }
  if (!secureEqual(signature, expected)) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { expiresAt?: unknown };
    return typeof claims.expiresAt === "number" && claims.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function hasStudioAdminAccess(req: Request) {
  return isStudioSessionValid(req)
    || secureEqual(req.get("x-admin-password"), process.env.ADMIN_PASSWORD);
}

export function requireStudioAdmin(req: Request, res: Response) {
  if (!hasStudioAdminAccess(req)) {
    res.status(401).json({ error: "Studio access required" });
    return false;
  }
  return true;
}

export function setStudioSessionCookie(req: Request, res: Response, token: string) {
  const secure = req.secure || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `${STUDIO_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${STUDIO_SESSION_TTL_SECONDS}${secure}`,
  );
}

export function clearStudioSessionCookie(req: Request, res: Response) {
  const secure = req.secure || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append(
    "Set-Cookie",
    `${STUDIO_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`,
  );
}

export function isStudioPasswordValid(password: string) {
  return secureEqual(password, process.env.ADMIN_PASSWORD);
}