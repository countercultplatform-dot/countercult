import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pinterestConnectionsTable, pinterestPinsTable } from "@workspace/db";
import { z } from "zod/v4";
import { requireStudioAdmin } from "../lib/studioAuth";

const router: IRouter = Router();
const PINTEREST_API_BASE = "https://api.pinterest.com/v5";
const PINTEREST_ACCOUNT_KEY = "sketchy-shona";
const OAUTH_SCOPE = ["user_accounts", "pins:read", "pins:write", "boards:read", "boards:write"].join(",");
const PINTEREST_BOARD_ALIASES: Record<string, string[]> = {
  "Sketchy Shona Original Art": ["Original art and paintings"],
  "Sketchy Shona Art Exhibitions": ["Berlin art exhibitions and collections"],
  "Sketchy Shona Murals & Street Art": ["Murals, residencies and public art"],
  "Sketchy Shona Studio & THE FLOOR": ["Berlin artist studio and residency"],
  "Sketchy Shona Artist Journal": ["Artist journal and studio notes"],
};

const BoardInput = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(""),
});

const PublishPinInput = z.object({
  boardId: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(""),
  altText: z.string().trim().max(500).optional().default(""),
  link: z.string().url(),
  imageUrl: z.string().url(),
});

const UpdatePinInput = z.object({
  boardId: z.string().trim().regex(/^\d+$/).optional(),
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(800).optional(),
  altText: z.string().trim().max(500).optional(),
  link: z.string().url().max(2048).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: "At least one Pin field is required",
});

type PinterestApiError = {
  code?: number;
  message?: string;
  details?: unknown;
};

type PinterestRequestError = Error & {
  status?: number;
  pinterestCode?: number;
};

function siteOrigin() {
  return process.env.SITE_URL ?? "https://countercult.network";
}

function redirectUri() {
  return process.env.PINTEREST_REDIRECT_URI
    ?? new URL("/api/pinterest/oauth/callback", siteOrigin()).toString();
}

function studioReturnUrl(result?: "connected" | "error", message?: string) {
  const url = new URL("/sketchyshona/os/pinterest", siteOrigin());
  if (result) url.searchParams.set("pinterest", result);
  if (message) url.searchParams.set("message", message.slice(0, 180));
  return url.toString();
}

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be configured for Pinterest OAuth");
  return secret;
}

function makeOAuthState() {
  const nonce = crypto.randomBytes(24).toString("base64url");
  const signature = crypto.createHmac("sha256", signingSecret()).update(nonce).digest("base64url");
  return `${nonce}.${signature}`;
}

function verifyOAuthState(state: string | undefined, cookieState: string | undefined) {
  if (!state || !cookieState || state !== cookieState) return false;
  const [nonce, signature] = state.split(".");
  if (!nonce || !signature) return false;
  const expected = crypto.createHmac("sha256", signingSecret()).update(nonce).digest("base64url");
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function parseCookies(header: string | undefined) {
  return new Map(
    (header ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)]),
  );
}

function encryptionKey() {
  return crypto.createHash("sha256").update(signingSecret()).digest();
}

function encryptToken(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

function decryptToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Stored Pinterest token is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function getConnection() {
  const [connection] = await db
    .select()
    .from(pinterestConnectionsTable)
    .where(eq(pinterestConnectionsTable.accountKey, PINTEREST_ACCOUNT_KEY));
  return connection;
}

async function exchangeRefreshToken(connection: NonNullable<Awaited<ReturnType<typeof getConnection>>>) {
  if (!connection.refreshTokenCiphertext) return null;
  const response = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptToken(connection.refreshTokenCiphertext),
    }),
  });
  if (!response.ok) return null;
  const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
  await db.update(pinterestConnectionsTable)
    .set({
      accessTokenCiphertext: encryptToken(data.access_token),
      refreshTokenCiphertext: data.refresh_token ? encryptToken(data.refresh_token) : connection.refreshTokenCiphertext,
      expiresAt,
      updatedAt: new Date(),
    })
    .where(eq(pinterestConnectionsTable.id, connection.id));
  return data.access_token;
}

async function getAccessToken() {
  const connection = await getConnection();
  if (!connection) return null;
  if (connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 60_000) {
    const refreshed = await exchangeRefreshToken(connection);
    if (refreshed) return refreshed;
  }
  return decryptToken(connection.accessTokenCiphertext);
}

async function pinterestFetch<T>(path: string, init: RequestInit = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    const error = new Error("Pinterest is not connected");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  const response = await fetch(`${PINTEREST_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  const body = await response.text();
  const data = body ? JSON.parse(body) as T | PinterestApiError : null;
  if (!response.ok) {
    const errorBody = data && typeof data === "object" ? data as PinterestApiError : null;
    const error = new Error(
      errorBody?.message
        ? String(errorBody.message)
        : `Pinterest API returned ${response.status}`,
    ) as PinterestRequestError;
    error.status = response.status;
    if (typeof errorBody?.code === "number") error.pinterestCode = errorBody.code;
    throw error;
  }
  return data as T;
}

type PinterestBoard = {
  id: string;
  name: string;
  description?: string;
  privacy?: string;
  pin_count?: number;
};

type PinterestApiPin = {
  id: string;
  title?: string | null;
  description?: string | null;
  alt_text?: string | null;
  link?: string | null;
  board_id?: string | null;
  created_at?: string | null;
};

export type PinterestPublishPayload = {
  boardId: string;
  title: string;
  description: string;
  altText: string;
  link: string;
  imageUrl: string;
};

export type PinterestPinUpdatePayload = {
  boardId?: string;
  title?: string;
  description?: string;
  altText?: string;
  link?: string;
};

export async function listPinterestBoardsForPublisher() {
  const data = await pinterestFetch<{ items?: PinterestBoard[] }>("/boards?page_size=250");
  return (data.items ?? []).map((board) => ({
    id: board.id,
    name: board.name,
    description: board.description ?? "",
    privacy: board.privacy ?? "PUBLIC",
    pinCount: board.pin_count ?? 0,
  }));
}

function findMatchingBoard(boards: Awaited<ReturnType<typeof listPinterestBoardsForPublisher>>, name: string) {
  const normalizedName = name.toLowerCase();
  const aliases = (PINTEREST_BOARD_ALIASES[name] ?? []).map((alias) => alias.toLowerCase());
  return boards.find((board) => board.name.toLowerCase() === normalizedName)
    ?? boards.find((board) => aliases.includes(board.name.toLowerCase()));
}

async function updatePinterestBoard(boardId: string, name: string, description: string) {
  await pinterestFetch(`/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, privacy: "PUBLIC" }),
  });
}

export async function ensurePinterestBoard(name: string, description: string) {
  const existing = await listPinterestBoardsForPublisher();
  const matching = findMatchingBoard(existing, name);
  if (matching) {
    if (matching.name !== name || matching.description !== description) {
      await updatePinterestBoard(matching.id, name, description);
      const refreshed = await listPinterestBoardsForPublisher();
      return refreshed.find((board) => board.id === matching.id) ?? { ...matching, name, description };
    }
    return matching;
  }
  await pinterestFetch("/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, privacy: "PUBLIC" }),
  });
  const boards = await listPinterestBoardsForPublisher();
  const created = boards.find((board) => board.name.toLowerCase() === name.toLowerCase());
  if (!created) throw new Error(`Pinterest board "${name}" could not be found after creation`);
  return created;
}

export async function publishPinterestPinForPublisher(payload: PinterestPublishPayload) {
  return pinterestFetch<{ id?: string }>("/pins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      board_id: payload.boardId,
      title: payload.title,
      description: payload.description,
      alt_text: payload.altText,
      link: payload.link,
      media_source: { source_type: "image_url", url: payload.imageUrl },
    }),
  });
}

export async function listPinterestPinsForPublisher() {
  const pins: PinterestApiPin[] = [];
  let bookmark: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const params = new URLSearchParams({ page_size: "250" });
    if (bookmark) params.set("bookmark", bookmark);
    const data = await pinterestFetch<{ items?: PinterestApiPin[]; bookmark?: string }>(`/pins?${params.toString()}`);
    pins.push(...(data.items ?? []));
    if (!data.bookmark || !(data.items ?? []).length) break;
    bookmark = data.bookmark;
  }
  return pins.map((pin) => ({
    id: pin.id,
    title: pin.title ?? "",
    description: pin.description ?? "",
    altText: pin.alt_text ?? "",
    link: pin.link ?? "",
    boardId: pin.board_id ?? null,
    createdAt: pin.created_at ?? null,
  }));
}

export async function updatePinterestPinForPublisher(pinId: string, payload: PinterestPinUpdatePayload) {
  return pinterestFetch<PinterestApiPin>(`/pins/${encodeURIComponent(pinId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(payload.boardId ? { board_id: payload.boardId } : {}),
      ...(payload.title !== undefined ? { title: payload.title } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      ...(payload.altText !== undefined ? { alt_text: payload.altText } : {}),
      ...(payload.link !== undefined ? { link: payload.link } : {}),
    }),
  });
}

router.post("/pinterest/oauth/start", (req, res) => {
  if (!requireStudioAdmin(req, res)) return;
  if (!process.env.PINTEREST_CLIENT_ID || !process.env.PINTEREST_CLIENT_SECRET) {
    res.status(503).json({ error: "Pinterest credentials are not configured" });
    return;
  }
  const state = makeOAuthState();
  res.setHeader(
    "Set-Cookie",
    `pinterest_oauth_state=${encodeURIComponent(state)}; HttpOnly; Secure; SameSite=Lax; Path=/api/pinterest/oauth; Max-Age=600`,
  );
  const url = new URL("https://www.pinterest.com/oauth/");
  url.searchParams.set("client_id", process.env.PINTEREST_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OAUTH_SCOPE);
  url.searchParams.set("state", state);
  res.json({ authorizationUrl: url.toString() });
});

router.get("/pinterest/oauth/callback", async (req, res): Promise<void> => {
  const cookies = parseCookies(req.headers.cookie);
  if (!verifyOAuthState(typeof req.query.state === "string" ? req.query.state : undefined, cookies.get("pinterest_oauth_state"))) {
    res.redirect(studioReturnUrl("error", "Pinterest OAuth state was invalid or expired."));
    return;
  }
  if (typeof req.query.error === "string") {
    res.redirect(studioReturnUrl("error", "Pinterest authorization was cancelled."));
    return;
  }
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!code) {
    res.redirect(studioReturnUrl("error", "Pinterest did not return an authorization code."));
    return;
  }

  try {
    const response = await fetch(`${PINTEREST_API_BASE}/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
      }),
    });
    const data = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; message?: string };
    if (!response.ok || !data.access_token) throw new Error(data.message || "Pinterest token exchange failed");
    const account = await fetch(`${PINTEREST_API_BASE}/user_account`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const accountData = await account.json() as { username?: string };
    const now = new Date();
    const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    await db.insert(pinterestConnectionsTable).values({
      accountKey: PINTEREST_ACCOUNT_KEY,
      username: accountData.username ?? null,
      accessTokenCiphertext: encryptToken(data.access_token),
      refreshTokenCiphertext: data.refresh_token ? encryptToken(data.refresh_token) : null,
      expiresAt,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: pinterestConnectionsTable.accountKey,
      set: {
        username: accountData.username ?? null,
        accessTokenCiphertext: encryptToken(data.access_token),
        refreshTokenCiphertext: data.refresh_token ? encryptToken(data.refresh_token) : null,
        expiresAt,
        updatedAt: now,
      },
    });
    req.log.info({ username: accountData.username ?? null }, "Pinterest account connected");
    res.redirect(studioReturnUrl("connected"));
  } catch (error) {
    req.log.error({ err: error }, "Pinterest OAuth callback failed");
    res.redirect(studioReturnUrl("error", error instanceof Error ? error.message : "Pinterest connection failed."));
  }
});

router.get("/pinterest/status", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const connection = await getConnection();
  res.json({
    connected: Boolean(connection),
    username: connection?.username ?? null,
    expiresAt: connection?.expiresAt?.toISOString() ?? null,
  });
});

router.get("/pinterest/boards", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  try {
    res.json({ boards: await listPinterestBoardsForPublisher() });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 502;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not load Pinterest boards" });
  }
});

router.get("/pinterest/pins", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  try {
    res.json({ pins: await listPinterestPinsForPublisher() });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 502;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not load Pinterest Pins" });
  }
});

router.post("/pinterest/boards/sync", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const parsed = z.object({ boards: z.array(BoardInput).min(1).max(20) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "At least one valid board is required" });
    return;
  }
  try {
    const existing = await listPinterestBoardsForPublisher();
    for (const board of parsed.data.boards) {
      const matching = findMatchingBoard(existing, board.name);
      if (matching) {
        if (matching.name !== board.name || matching.description !== board.description) {
          await updatePinterestBoard(matching.id, board.name, board.description);
        }
        continue;
      }
      await pinterestFetch("/boards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: board.name, description: board.description, privacy: "PUBLIC" }),
        });
    }
    res.json({ boards: await listPinterestBoardsForPublisher() });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 502;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not sync Pinterest boards" });
  }
});

router.post("/pinterest/pins", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  const parsed = PublishPinInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "A board, title, description, link and absolute image URL are required" });
    return;
  }
  try {
    const pin = await publishPinterestPinForPublisher(parsed.data);
    req.log.info({ pinId: pin.id ?? null, boardId: parsed.data.boardId }, "Pinterest Pin published");
    res.status(201).json({ id: pin.id ?? null, status: "published" });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 502;
    const errorMessage = error instanceof Error ? error.message : "Could not publish Pin";
    const pinterestError = error as PinterestRequestError;
    req.log.warn({
      upstreamStatus: pinterestError.status ?? null,
      upstreamCode: pinterestError.pinterestCode ?? null,
      upstreamMessage: errorMessage.slice(0, 500),
    }, "Pinterest Pin publishing failed");
    res.status(status).json({ error: errorMessage });
  }
});

router.patch("/pinterest/pins/:pinId", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  if (!/^\d+$/.test(req.params.pinId)) {
    res.status(400).json({ error: "A valid Pinterest Pin ID is required" });
    return;
  }
  const parsed = UpdatePinInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "At least one valid Pin field is required" });
    return;
  }
  try {
    const pin = await updatePinterestPinForPublisher(req.params.pinId, parsed.data);
    await db.update(pinterestPinsTable).set({
      ...(parsed.data.title !== undefined ? { pinTitle: parsed.data.title } : {}),
      ...(parsed.data.description !== undefined ? { pinDescription: parsed.data.description } : {}),
      ...(parsed.data.altText !== undefined ? { pinAltText: parsed.data.altText } : {}),
      updatedAt: new Date(),
    }).where(eq(pinterestPinsTable.pinterestPinId, req.params.pinId));
    req.log.info({ pinId: req.params.pinId }, "Pinterest Pin metadata updated");
    res.json({
      id: pin.id,
      title: pin.title ?? "",
      description: pin.description ?? "",
      altText: pin.alt_text ?? "",
      link: pin.link ?? "",
      boardId: pin.board_id ?? null,
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status ?? 502;
    res.status(status).json({ error: error instanceof Error ? error.message : "Could not update Pin" });
  }
});

router.post("/pinterest/disconnect", async (req, res): Promise<void> => {
  if (!requireStudioAdmin(req, res)) return;
  await db.delete(pinterestConnectionsTable).where(eq(pinterestConnectionsTable.accountKey, PINTEREST_ACCOUNT_KEY));
  req.log.info("Pinterest account disconnected");
  res.json({ ok: true });
});

export default router;