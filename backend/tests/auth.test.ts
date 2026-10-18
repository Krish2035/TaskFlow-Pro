import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { app } from "../src/app";
import { AuthService } from "../src/services/auth.service";
import { env } from "../src/config/env";

describe("Authentication & Cryptography Tests", () => {
  it("Argon2id hashes passwords securely and verifies correctly", async () => {
    const rawPassword = "SuperSecretPassword123!";
    const hash = await AuthService.hashPassword(rawPassword);

    expect(hash).toContain("$argon2id$");
    const isValid = await AuthService.verifyPassword(hash, rawPassword);
    expect(isValid).toBe(true);

    const isWrong = await AuthService.verifyPassword(hash, "WrongPassword!");
    expect(isWrong).toBe(false);
  });

  it("JWT Access Tokens are signed with correct issuer and audience", () => {
    const payload = {
      userId: "123e4567-e89b-12d3-a456-426614174000",
      email: "engineer@taskflow.dev",
      role: "owner",
    };

    const token = AuthService.generateAccessToken(payload);
    expect(typeof token).toBe("string");

    const decoded: any = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "taskflow-api",
      audience: "taskflow-clients",
    });

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it("POST /api/v1/auth/register validates payload with Zod (rejects short passwords)", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        displayName: "Krish",
        email: "test@example.com",
        password: "123", // Too short (min 8)
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/v1/auth/register validates email format with Zod", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        displayName: "Krish",
        email: "not-an-email",
        password: "ValidPassword123!",
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/v1/auth/login validates required fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
