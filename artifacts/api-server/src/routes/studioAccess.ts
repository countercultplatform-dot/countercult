import rateLimit from "express-rate-limit";
import { Router, type IRouter, type RequestHandler } from "express";
import { CreateStudioSessionBody } from "@workspace/api-zod";
import { z } from "zod/v4";
import {
  clearStudioSessionCookie,
  createStudioSessionToken,
  isStudioPasswordValid,
  isStudioSessionValid,
  setStudioSessionCookie,
} from "../lib/studioAuth";

const router: IRouter = Router();
const STUDIO_BASE_PATH = "/sketchyshona";
const STUDIO_ROUTE_PREFIX = `${STUDIO_BASE_PATH}/os`;
const StudioSessionStatusResponse = z.object({ authenticated: z.boolean() });

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function normalizeStudioRoute(value: string | undefined) {
  if (!value) return "/os";
  try {
    const url = new URL(value, "https://studio.invalid");
    if (url.origin !== "https://studio.invalid") return "/os";
    if (url.pathname !== STUDIO_ROUTE_PREFIX && !url.pathname.startsWith(`${STUDIO_ROUTE_PREFIX}/`)) {
      return "/os";
    }
    return `${url.pathname.slice(STUDIO_BASE_PATH.length)}${url.search}`;
  } catch {
    return "/os";
  }
}

function routeFromRequest(req: Parameters<RequestHandler>[0]) {
  const url = new URL(req.originalUrl, "https://studio.invalid");
  return normalizeStudioRoute(`${url.pathname}${url.search}`);
}

function studioHomeRedirect(route: string, queryKey: "studio" | "studioLogin") {
  return `${STUDIO_BASE_PATH}/?${queryKey}=${encodeURIComponent(route)}`;
}

router.get("/studio/session", (req, res): void => {
  res.json(StudioSessionStatusResponse.parse({ authenticated: isStudioSessionValid(req) }));
});

router.post("/studio/session", loginRateLimit, (req, res): void => {
  const parsed = CreateStudioSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the Studio password." });
    return;
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    res.status(503).json({ error: "Studio sign-in is not configured." });
    return;
  }
  if (!isStudioPasswordValid(parsed.data.password)) {
    res.status(401).json({ error: "The Studio password was not accepted." });
    return;
  }

  try {
    setStudioSessionCookie(req, res, createStudioSessionToken());
    res.json(StudioSessionStatusResponse.parse({ authenticated: true }));
  } catch (error) {
    req.log.error({ err: error }, "Studio session could not be created");
    res.status(503).json({ error: "Studio sign-in is not configured." });
  }
});

router.delete("/studio/session", (_req, res): void => {
  clearStudioSessionCookie(_req, res);
  res.sendStatus(204);
});

export const studioPageAccessGate: RequestHandler = (req, res, next): void => {
  if (req.method !== "GET") {
    next();
    return;
  }

  const path = req.path;
  if (path !== STUDIO_ROUTE_PREFIX && !path.startsWith(`${STUDIO_ROUTE_PREFIX}/`)) {
    next();
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const route = routeFromRequest(req);
  const queryKey = isStudioSessionValid(req) ? "studio" : "studioLogin";
  res.redirect(302, studioHomeRedirect(route, queryKey));
};

export default router;