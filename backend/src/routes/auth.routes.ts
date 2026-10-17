import { Router } from "express";
import { z } from "zod";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/authenticate";
import { rateLimit } from "../middleware/rate-limit";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Name must be at least 2 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Rate limiting: 10 attempts per minute on login/register
const authLimiter = rateLimit({
  windowSeconds: 60,
  maxRequests: 10,
  prefix: "rl:auth",
});

authRouter.post("/register", authLimiter, validate(registerSchema), AuthController.register);
authRouter.post("/login", authLimiter, validate(loginSchema), AuthController.login);
authRouter.post("/refresh", AuthController.refresh);
authRouter.post("/logout", AuthController.logout);
authRouter.get("/me", authenticate, AuthController.me);
