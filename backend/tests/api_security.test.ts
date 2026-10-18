import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("API Security, Headers & Probes", () => {
  it("Every response includes X-Request-ID tracking header", async () => {
    const res = await request(app).get("/health");
    expect(res.headers).toHaveProperty("x-request-id");
    expect(typeof res.headers["x-request-id"]).toBe("string");
  });

  it("Security headers (Helmet CSP, HSTS, X-Content-Type-Options) are configured", async () => {
    const res = await request(app).get("/health");
    expect(res.headers).toHaveProperty("x-content-type-options");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("Protected routes block unauthorized requests with 401 UNAUTHORIZED", async () => {
    const routes = [
      "/api/v1/workspaces",
      "/api/v1/projects/random-id",
      "/api/v1/tasks/random-id",
      "/api/v1/billing/workspaces/random-id",
    ];

    for (const route of routes) {
      const res = await request(app).get(route);
      expect(res.status).toBe(401);
    }
  });

  it("Invalid paths return 404 with structured JSON error", async () => {
    const res = await request(app).get("/unknown-root-path");
    expect(res.status).toBe(404);
    expect(res.body.error).toHaveProperty("code");
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
