/**
 * Integration test: brute-force protection survives a server restart.
 *
 * The whole point of a Postgres-backed rate-limit store is that hit counts
 * live in the database, not in process memory.  This test verifies that
 * property by:
 *
 *   1. Firing login attempts up to (and including) the limit against a real
 *      Express server wired to the real DATABASE_URL.
 *   2. Destroying the server and every in-memory object (Express app, rate-
 *      limiter, PgRateLimitStore instance) — simulating a process restart.
 *   3. Starting a brand-new server (fresh Express app, fresh store instance)
 *      and confirming the very next attempt returns 429 instead of passing
 *      through, proving that the hit count was preserved in Postgres.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import supertest from "supertest";
import http from "node:http";
import { PgRateLimitStore } from "../pgRateLimitStore.js";
import { pool } from "@workspace/db";

// Use a low limit so the test completes quickly.
const TEST_MAX = 5;
const TEST_WINDOW_MS = 60_000; // 1 minute

// A fixed fake IP used as the rate-limit key for all requests in this test.
// Using a fake IP (via X-Forwarded-For + trust proxy) isolates the test from
// any real rate-limit state that might exist for 127.0.0.1.
const TEST_IP = "203.0.113.42"; // TEST-NET-3, guaranteed non-routable

/** Build a minimal Express app whose /ping route is protected by the limiter. */
function buildApp(): { app: Express; store: PgRateLimitStore } {
  const store = new PgRateLimitStore();
  const limiter = rateLimit({
    windowMs: TEST_WINDOW_MS,
    max: TEST_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too many attempts" },
    store,
  });

  const app = express();
  // Trust the first proxy so express-rate-limit reads X-Forwarded-For.
  app.set("trust proxy", 1);
  app.use("/ping", limiter, (_req, res) => res.json({ ok: true }));
  return { app, store };
}

describe("PgRateLimitStore — brute-force protection survives restart", () => {
  let server1: http.Server;
  let store1: PgRateLimitStore;

  beforeAll(async () => {
    // Make sure there are no leftover rows for our test IP from a prior run.
    await pool.query("DELETE FROM rate_limits WHERE key = $1", [TEST_IP]);
  });

  afterAll(async () => {
    // Clean up our test rows so repeated runs start fresh.
    await pool.query("DELETE FROM rate_limits WHERE key = $1", [TEST_IP]);
    await pool.end();
  });

  it("fires TEST_MAX attempts and each one succeeds (200)", async () => {
    const built = buildApp();
    store1 = built.store;
    server1 = http.createServer(built.app);
    await new Promise<void>((resolve) => server1.listen(0, resolve));

    const agent = supertest(server1);
    for (let i = 0; i < TEST_MAX; i++) {
      const res = await agent
        .get("/ping")
        .set("X-Forwarded-For", TEST_IP);
      expect(res.status, `attempt ${i + 1} should succeed`).toBe(200);
    }
  });

  it("simulates a restart (tears down server + store) and the next attempt gets 429", async () => {
    // --- Simulate process restart ---
    // Close the original server so its file descriptors are released.
    await new Promise<void>((resolve, reject) =>
      server1.close((err) => (err ? reject(err) : resolve())),
    );
    // Dereference every object that held the old store's (empty) in-memory state.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (store1 as any) = null;

    // --- "New process" with a brand-new store and server ---
    const { app: app2 } = buildApp();
    const server2 = http.createServer(app2);
    await new Promise<void>((resolve) => server2.listen(0, resolve));

    try {
      const res = await supertest(server2)
        .get("/ping")
        .set("X-Forwarded-For", TEST_IP);

      expect(
        res.status,
        "The limit was already reached in Postgres; the fresh server must return 429",
      ).toBe(429);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server2.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
