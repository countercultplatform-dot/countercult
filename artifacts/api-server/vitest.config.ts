import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    pool: "forks",
    testTimeout: 30_000,
    // Integration tests require a real DATABASE_URL — run serially so they
    // don't share rate-limit state across concurrent test files.
    sequence: { concurrent: false },
  },
  resolve: {
    alias: {
      "@workspace/db": path.resolve(__dirname, "../../lib/db/src/index.ts"),
    },
  },
});
