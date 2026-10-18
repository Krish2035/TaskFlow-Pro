import { Request, Response, NextFunction } from "express";
import { BillingService } from "../services/billing.service";

export class BillingController {
  static async listPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const plans = BillingService.getPlans();
      res.status(200).json({ data: plans });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkspaceSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const sub = await BillingService.getWorkspaceSubscription(workspaceId);
      res.status(200).json({ data: sub });
    } catch (error) {
      next(error);
    }
  }

  static async createCheckoutSession(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const { planTier, successUrl, cancelUrl } = req.body;

      const result = await BillingService.createCheckoutSession({
        workspaceId,
        userId: req.user!.userId,
        planTier: planTier || "pro",
        successUrl,
        cancelUrl,
      });

      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  static async createCustomerPortalSession(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaceId = req.params.workspaceId;
      const { returnUrl } = req.body;
      const result = await BillingService.createCustomerPortalSession(workspaceId, returnUrl);
      res.status(200).json({ data: result });
    } catch (error) {
      next(error);
    }
  }

  static async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const result = await BillingService.handleWebhook(req.body, sig);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
