import { afterAll, beforeAll, describe, expect, it } from "vitest";
import supertest from "supertest";
import type { StudioArtwork } from "@workspace/db";
import app from "../app";
import { serializePublicArtwork } from "../routes/studioArtworks";

const originalAdminPassword = process.env.ADMIN_PASSWORD;
const originalSessionSecret = process.env.SESSION_SECRET;
const originalNodeEnv = process.env.NODE_ENV;
const originalBookingGuideCode = process.env.GYG_BOOKING_GUIDE_ACCESS_CODE;

beforeAll(() => {
  process.env.ADMIN_PASSWORD = "test-studio-password";
  process.env.SESSION_SECRET = "test-session-secret-with-enough-entropy";
  process.env.GYG_BOOKING_GUIDE_ACCESS_CODE = "test-guest-passphrase";
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  if (originalAdminPassword === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = originalAdminPassword;
  if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSessionSecret;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
  if (originalBookingGuideCode === undefined) delete process.env.GYG_BOOKING_GUIDE_ACCESS_CODE;
  else process.env.GYG_BOOKING_GUIDE_ACCESS_CODE = originalBookingGuideCode;
});

describe("Studio production access boundary", () => {
  it("permanently redirects legacy Sketchy Shona URLs and preserves their path and query", async () => {
    const response = await supertest(app).get(
      "/sketchy-shona-studio-os/journal/berlin-flash-the-tattoos-are-back?source=legacy",
    );

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe(
      "https://countercult.network/sketchyshona/journal/berlin-flash-the-tattoos-are-back/?source=legacy",
    );
  });

  it("redirects the bare legacy URL to the canonical artist homepage", async () => {
    const response = await supertest(app).get("/sketchy-shona-studio-os");

    expect(response.status).toBe(301);
    expect(response.headers.location).toBe("https://countercult.network/sketchyshona/");
  });

  it("redirects legacy Studio OS URLs to the public artist homepage", async () => {
    const studioHome = await supertest(app).get("/sketchy-shona-studio-os/os?source=legacy");
    expect(studioHome.status).toBe(301);
    expect(studioHome.headers.location).toBe("https://countercult.network/sketchyshona/?source=legacy");

    const nestedStudioRoute = await supertest(app).get(
      "/sketchy-shona-studio-os/os/pinterest?source=legacy",
    );
    expect(nestedStudioRoute.status).toBe(301);
    expect(nestedStudioRoute.headers.location).toBe("https://countercult.network/sketchyshona/?source=legacy");
  });

  it("redirects direct Studio URLs to the login flow for unauthenticated visitors", async () => {
    const response = await supertest(app).get("/sketchyshona/os/pinterest?pinterest=connected");
    const location = new URL(response.headers.location, "http://localhost");

    expect(response.status).toBe(302);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(location.pathname).toBe("/sketchyshona/");
    expect(location.searchParams.get("studioLogin")).toBe("/os/pinterest?pinterest=connected");
  });

  it("creates, checks, and clears an HttpOnly browser session", async () => {
    const browser = supertest.agent(app);
    const login = await browser.post("/api/studio/session").send({ password: "test-studio-password" });

    expect(login.status).toBe(200);
    expect(login.body).toEqual({ authenticated: true });
    expect(login.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(login.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");

    const status = await browser.get("/api/studio/session");
    expect(status.body).toEqual({ authenticated: true });

    const gatedRoute = await browser.get("/sketchyshona/os/pinterest");
    const location = new URL(gatedRoute.headers.location, "http://localhost");
    expect(location.searchParams.get("studio")).toBe("/os/pinterest");
    expect(location.searchParams.has("studioLogin")).toBe(false);

    const logout = await browser.delete("/api/studio/session");
    expect(logout.status).toBe(204);
    const afterLogout = await browser.get("/api/studio/session");
    expect(afterLogout.body).toEqual({ authenticated: false });
  });

  it("rejects an incorrect Studio password without issuing a cookie", async () => {
    const response = await supertest(app).post("/api/studio/session").send({ password: "incorrect" });

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("serves the booking bonus only after a passphrase creates a short-lived HttpOnly session", async () => {
    const anonymous = await supertest(app).get("/api/booking-guide/content");
    expect(anonymous.status).toBe(401);
    expect(anonymous.headers["cache-control"]).toBe("no-store");

    const browser = supertest.agent(app);
    const login = await browser.post("/api/booking-guide/session").send({ passphrase: "test-guest-passphrase" });
    expect(login.status).toBe(200);
    expect(login.body).toEqual({ authenticated: true });
    expect(login.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(login.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
    expect(login.headers["set-cookie"]?.[0]).toContain("Path=/api/booking-guide");

    const content = await browser.get("/api/booking-guide/content");
    expect(content.status).toBe(200);
    expect(content.body.title).toContain("Berlin");
    expect(content.body.route).toHaveLength(4);
    expect(content.body.tips).toHaveLength(4);

    await browser.delete("/api/booking-guide/session").expect(204);
    await browser.get("/api/booking-guide/content").expect(401);
  });

  it("rejects an incorrect guest passphrase without issuing a cookie", async () => {
    const response = await supertest(app).post("/api/booking-guide/session").send({ passphrase: "incorrect" });
    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });
});

describe("public artwork response", () => {
  it("returns only the public catalog fields and hides object paths and review data", () => {
    const artwork: StudioArtwork = {
      id: "artwork-private-test",
      createdAt: new Date("2026-09-25T09:00:00.000Z"),
      title: "Public artwork title",
      seoTitle: "Public title",
      seoDescription: "Public description",
      seoKeywords: ["public art"],
      year: "2025",
      dimensions: "50 × 60 cm",
      medium: "Mixed media",
      price: "1200",
      availability: "Available",
      notes: "Internal review note that must never be public",
      photos: [{ name: "image.jpg", objectPath: "/objects/private/studio/image.jpg" }],
      readiness: "In review",
      destinations: {
        website: "Prepared",
        store: "Not prepared",
        social: "Not prepared",
        newsletter: "Not prepared",
        marketplaces: "Not prepared",
      },
      updatedAt: new Date("2026-09-25T10:00:00.000Z"),
    };
    const result = serializePublicArtwork(artwork);

    expect(Object.keys(result).sort()).toEqual([
      "availability",
      "dimensions",
      "id",
      "medium",
      "photos",
      "price",
      "seoDescription",
      "seoKeywords",
      "seoTitle",
      "title",
      "year",
    ]);
    expect(Object.keys(result.photos[0]).sort()).toEqual(["name", "src"]);
    expect(JSON.stringify(result)).not.toContain("Internal review note");
    expect(JSON.stringify(result)).not.toContain("/objects/private");
    expect(JSON.stringify(result)).not.toContain("destinations");
    expect(JSON.stringify(result)).not.toContain("readiness");
    expect(JSON.stringify(result)).not.toContain("updatedAt");
  });
});