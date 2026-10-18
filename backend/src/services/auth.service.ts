import argon2 from "argon2";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "../db/connections";
import { users } from "../db/schema/users";
import { refreshTokens } from "../db/schema/refreshTokens";
import { platformRoles } from "../db/schema/platformRoles";
import { env } from "../config/env";
import { AppError } from "../middleware/error-handler";
import { EmailService } from "./email.service";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456, // 19 MiB OWASP recommended
      timeCost: 2,
      parallelism: 1,
    });
  }

  static async verifyPassword(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  static generateAccessToken(payload: { userId: string; email: string; role?: string }): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: "15m",
      issuer: "taskflow-api",
      audience: "taskflow-clients",
    });
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(40).toString("hex");
  }

  static async register(data: { email: string; password: string; displayName: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing) {
      throw new AppError("Email is already registered", 409, "EMAIL_EXISTS");
    }

    const passwordHash = await this.hashPassword(data.password);

    const [newUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        passwordHash,
        displayName: data.displayName.trim(),
        status: "active",
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        createdAt: users.createdAt,
      });

    // Dispatch welcome email asynchronously via EmailService
    EmailService.sendWelcomeEmail({
      to: newUser.email,
      displayName: newUser.displayName,
    }).catch((err) => {
      console.warn("⚠️ Failed to dispatch welcome email:", err?.message);
    });

    return newUser;
  }

  static async login(data: { email: string; password: string; userAgent?: string; ip?: string }) {
    const normalizedEmail = data.email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    if (user.status !== "active") {
      throw new AppError("Your account has been suspended or deactivated", 403, "ACCOUNT_SUSPENDED");
    }

    const validPassword = await this.verifyPassword(user.passwordHash, data.password);
    if (!validPassword) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    // Check platform role
    const [roleRecord] = await db
      .select({ role: platformRoles.role })
      .from(platformRoles)
      .where(eq(platformRoles.userId, user.id))
      .limit(1);

    const role = roleRecord?.role || "user";

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role,
    });

    const rawRefreshToken = this.generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const familyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  static async refresh(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);

    const [existingToken] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!existingToken) {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    // Reuse detection: If token was revoked, revoke the ENTIRE token family (possible theft!)
    if (existingToken.revokedAt) {
      await db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, existingToken.familyId));
      throw new AppError("Compromised session detected. Please log in again.", 401, "TOKEN_REUSE_DETECTED");
    }

    if (new Date() > existingToken.expiresAt) {
      throw new AppError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    // Revoke old token
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, existingToken.id));

    // Get user and platform role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingToken.userId))
      .limit(1);

    if (!user || user.status !== "active") {
      throw new AppError("User account not found or suspended", 401, "UNAUTHORIZED");
    }

    const [roleRecord] = await db
      .select({ role: platformRoles.role })
      .from(platformRoles)
      .where(eq(platformRoles.userId, user.id))
      .limit(1);

    const role = roleRecord?.role || "user";

    // Rotate new refresh token under the same family
    const newRawRefreshToken = this.generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      familyId: existingToken.familyId,
      expiresAt,
    });

    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      role,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role,
      },
    };
  }

  static async logout(rawRefreshToken: string) {
    const tokenHash = hashToken(rawRefreshToken);
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  static async logoutAll(userId: string) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revokedAt, null as any)));
  }
}
