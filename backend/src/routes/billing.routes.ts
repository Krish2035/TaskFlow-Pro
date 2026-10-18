import { Router } from "express";
import { z } from "zod";
import { BillingController } from "../controllers/billing.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";

export const billingRouter = Router();

// Public plans route
billingRouter.get("/plans", BillingController.listPlans);

// Stripe webhook (handles raw events from Stripe)
billingRouter.post("/webhook", BillingController.handleWebhook);

// Protected routes
billingRouter.use(authenticate);

const checkoutSchema = z.object({
  planTier: z.enum(["pro", "enterprise"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

billingRouter.get("/workspaces/:workspaceId", BillingController.getWorkspaceSubscription);
billingRouter.post(
  "/workspaces/:workspaceId/checkout",
  validate(checkoutSchema),
  BillingController.createCheckoutSession
);
billingRouter.post(
  "/workspaces/:workspaceId/portal",
  BillingController.createCustomerPortalSession
);
