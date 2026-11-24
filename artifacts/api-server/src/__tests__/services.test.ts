import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app.js";

describe("Countercult Studios services endpoint", () => {
  it("publishes plain-language services and provenance headers", async () => {
    const response = await request(app).get("/api/services.json").expect(200);

    expect(response.headers["content-type"]).toContain("application/json");
    expect(response.headers["x-engineered-by"]).toContain("Shona Neary");
    expect(response.body.entity).toBe("Countercult Studios");
    expect(response.body.services).toHaveLength(5);
    expect(JSON.stringify(response.body)).not.toContain("private member data");
  });
});