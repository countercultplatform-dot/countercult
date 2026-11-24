import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CreateBookingGuideSessionBody,
  CreateBookingGuideSessionResponse,
  GetBookingGuideContentResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const COOKIE_NAME = "booking_guide_access";
const COOKIE_PATH = "/api/booking-guide";
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

const bonusContent = {
  title: "A queer Berlin night, from Neukölln outward",
  introduction: "A compact way to begin close to THE FLOOR, then choose how the evening develops. Check each Google Maps listing and the venue’s own current programme before you set out.",
  route: [
    {
      name: "She Said",
      detail: "Start in the daytime at this queer-feminist bookshop and café. Browse independent publishing, then check its current hours before you go.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=She%20Said%20Berlin",
    },
    {
      name: "K-Fetisch",
      detail: "Continue to this self-managed community café, described in my guide as sober-friendly. Check its current hours and events.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=K-Fetisch%2C%20Berlin",
    },
    {
      name: "Alaska Bar",
      detail: "For food, this queer-run vegan Spanish tapas bar is a nearby option. Check the current menu and opening hours.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alaska%20Bar%2C%20Berlin",
    },
    {
      name: "Silver Future or Tristesse",
      detail: "Choose one for a neighborhood bar stop, depending on the mood and what is open that night.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Silver%20Future%20or%20Tristesse%2C%20Berlin",
    },
  ],
  tips: [
    {
      title: "Plan by the night, not only the venue",
      detail: "KitKat is best on nights when queer collectives such as Gegen or Foreplay are playing. Check the collective and venue listings for the current date, lineup, door policy and dress requirements.",
    },
    {
      title: "Check live opening details",
      detail: "Times in my public guide are approximate. Use the Google Maps links for current routes, then check the venue’s own website or social pages for current hours and events.",
    },
    {
      title: "Do not try to fit the whole city into one night",
      detail: "The places in the guide are spread across Berlin. Pick a neighborhood or a specific event, then use live transit directions between stops.",
    },
    {
      title: "THE FLOOR is not a walk-in venue",
      detail: "THE FLOOR is my independent artist residency and workspace. I open it for selected slots, so please do not arrive without an invitation or confirmed visit.",
    },
  ],
};

function safeEqual(candidate: string | undefined, expected: string | undefined) {
  if (!candidate || !expected) return false;
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length
    && crypto.timingSafeEqual(candidateBytes, expectedBytes);
}

function signedToken() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured");
  const payload = Buffer.from(JSON.stringify({
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomBytes(24).toString("base64url"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function hasValidSession(req: Request) {
  const cookie = req.get("cookie") ?? "";
  const token = cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);
  if (!token || !process.env.SESSION_SECRET) return false;
  const separator = token.lastIndexOf(".");
  if (separator < 1) return false;
  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(payload).digest("base64url");
  if (!safeEqual(signature, expected)) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { expiresAt?: unknown };
    return typeof claims.expiresAt === "number" && claims.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const secure = req.secure || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.append("Set-Cookie", `${COOKIE_NAME}=${token}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
}

router.post("/booking-guide/session", loginRateLimit, (req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = CreateBookingGuideSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the guest access passphrase." });
    return;
  }
  if (!process.env.GYG_BOOKING_GUIDE_ACCESS_CODE || !process.env.SESSION_SECRET) {
    res.status(503).json({ error: "Guest access is not configured yet." });
    return;
  }
  if (!safeEqual(parsed.data.passphrase, process.env.GYG_BOOKING_GUIDE_ACCESS_CODE)) {
    res.status(401).json({ error: "That passphrase was not accepted." });
    return;
  }
  try {
    setSessionCookie(req, res, signedToken());
    res.json(CreateBookingGuideSessionResponse.parse({ authenticated: true }));
  } catch (error) {
    req.log.error({ err: error }, "Booking guide session could not be created");
    res.status(503).json({ error: "Guest access is not configured yet." });
  }
});

router.get("/booking-guide/content", (req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  if (!hasValidSession(req)) {
    res.status(401).json({ error: "Guest access is required." });
    return;
  }
  res.json(GetBookingGuideContentResponse.parse(bonusContent));
});

router.delete("/booking-guide/session", (req, res): void => {
  const secure = req.secure || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Cache-Control", "no-store");
  res.append("Set-Cookie", `${COOKIE_NAME}=; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  res.sendStatus(204);
});

export default router;
