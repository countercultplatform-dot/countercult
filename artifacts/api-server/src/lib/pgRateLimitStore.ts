/**
 * PostgreSQL-backed store for express-rate-limit.
 *
 * Uses a dedicated `rate_limits` table so attempt counters survive server
 * restarts and redeployments.  The table is keyed on the rate-limit key
 * (typically IP address) and stores a hit count plus the window reset time.
 *
 * Rows are upserted atomically so concurrent requests never double-count.
 * Expired rows are cleaned up lazily on each increment call, and a periodic
 * background sweep (started via startRateLimitCleanup) removes rows for
 * infrequently-hit keys that would otherwise accumulate indefinitely.
 */

import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import { pool } from "@workspace/db";
import { logger } from "./logger";

const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Starts a background interval that deletes expired rate-limit rows once per
 * minute.  The sweep is non-blocking — errors are logged and swallowed so
 * they never affect request handling.  Call once at server startup.
 *
 * Returns the interval handle so callers can clear it in tests.
 */
export function startRateLimitCleanup(): ReturnType<typeof setInterval> {
  async function sweep() {
    try {
      const result = await pool.query<{ count: string }>(
        "DELETE FROM rate_limits WHERE reset_time < NOW() RETURNING 1",
      );
      if (result.rowCount && result.rowCount > 0) {
        logger.info(
          { deleted: result.rowCount },
          "Rate-limit cleanup: removed expired rows",
        );
      }
    } catch (err) {
      logger.error({ err }, "Rate-limit cleanup sweep failed");
    }
  }

  return setInterval(sweep, CLEANUP_INTERVAL_MS);
}

export class PgRateLimitStore implements Store {
  private windowMs!: number;
  constructor(private readonly keyPrefix = "") {}

  /**
   * Called by express-rate-limit with the resolved options before the first
   * request is processed.
   */
  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  /**
   * Increments the hit count for `key`, creating the row if necessary, and
   * returns the updated totals.  The window resets when `reset_time` is
   * reached — if the stored reset_time is in the past we treat it as a fresh
   * window.
   */
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const storedKey = `${this.keyPrefix}${key}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Prune stale rows (best-effort, non-fatal)
      await client.query(
        "DELETE FROM rate_limits WHERE reset_time < NOW()",
      );

      const resetTime = new Date(Date.now() + this.windowMs);

      /**
       * Upsert logic:
       *  - On first hit within a window: INSERT with hits=1 and the new reset_time.
       *  - On subsequent hits: bump the counter, keep the original reset_time so
       *    the window doesn't slide.
       *  - If reset_time has already passed (stale row survived the prune above):
       *    reset hits to 1 and start a fresh window.
       */
      const result = await client.query<{ hits: number; reset_time: Date }>(
        `INSERT INTO rate_limits (key, hits, reset_time)
         VALUES ($1, 1, $2)
         ON CONFLICT (key) DO UPDATE
           SET hits       = CASE
                              WHEN rate_limits.reset_time < NOW() THEN 1
                              ELSE rate_limits.hits + 1
                            END,
               reset_time = CASE
                              WHEN rate_limits.reset_time < NOW() THEN $2
                              ELSE rate_limits.reset_time
                            END
         RETURNING hits, reset_time`,
        [storedKey, resetTime],
      );

      await client.query("COMMIT");

      const row = result.rows[0]!;
      return {
        totalHits: row.hits,
        resetTime: row.reset_time,
      };
    } catch (err) {
      await client.query("ROLLBACK");
      // If the rate_limits table doesn't exist yet, allow the request through
      // rather than crashing the auth routes. Log so the missing migration is visible.
      logger.error({ err }, "PgRateLimitStore.increment failed — allowing request through");
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowMs) };
    } finally {
      client.release();
    }
  }

  /** Decrements the hit count for `key` by 1 (floors at 0). */
  async decrement(key: string): Promise<void> {
    await pool.query(
      `UPDATE rate_limits
          SET hits = GREATEST(hits - 1, 0)
        WHERE key = $1`,
      [key],
    );
  }

  /** Removes all rate-limit data for `key`. */
  async resetKey(key: string): Promise<void> {
    await pool.query("DELETE FROM rate_limits WHERE key = $1", [key]);
  }

  /** Removes all rate-limit data (used in tests / manual resets). */
  async resetAll(): Promise<void> {
    await pool.query("DELETE FROM rate_limits");
  }
}
