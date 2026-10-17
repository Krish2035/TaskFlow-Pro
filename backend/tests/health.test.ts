import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";

describe("Health API & Probes", () => {
  it("GET /health/live returns status 200 and ok", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("GET /health returns healthy service info", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("TaskFlow Pro API");
    expect(res.body.status).toBe("healthy");
  });

  it("GET /api/v1 returns API root metadata", async () => {
    const res = await request(app).get("/api/v1");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("TaskFlow Pro API v1");
    expect(res.body.version).toBe("1.0.0");
    expect(res.body.endpoints).toHaveProperty("auth");
    expect(res.body.endpoints).toHaveProperty("workspaces");
  });

  it("GET /non-existent-route returns 404 NOT_FOUND", async () => {
    const res = await request(app).get("/random-invalid-route");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
