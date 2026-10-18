import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db/connections";
import { workspaceSubscriptions } from "../db/schema/subscriptions";
import { workspaces } from "../db/schema/workspaces";
import { users } from "../db/schema/users";
import { env } from "../config/env";
import { logger } from "../middleware/logger";
import { AppError } from "../middleware/error-handler";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" as any })
  : null;

export interface PlanConfig {
  id: "free" | "pro" | "enterprise";
  name: string;
  priceMonthly: number;
  stripePriceId?: string;
  seatLimit: number;
  projectLimit: number;
  features: string[];
}

export const PLAN_TIERS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Starter (Free)",
    priceMonthly: 0,
    seatLimit: 5,
    projectLimit: 3,
    features: [
      "Up to 5 team members",
      "Up to 3 active projects",
      "Real-time multiplayer Kanban board",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro Team",
    priceMonthly: 19,
    stripePriceId: env.STRIPE_PRO_PRICE_ID,
    seatLimit: 25,
    projectLimit: 50,
    features: [
      "Up to 25 team members",
      "Up to 50 active projects",
      "Task file attachments & image uploads",
      "Real-time WebSocket sync across all boards",
      "Priority email delivery",
      "Export PDF sprint analytics",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Scale",
    priceMonthly: 79,
    stripePriceId: env.STRIPE_ENTERPRISE_PRICE_ID,
    seatLimit: 9999,
    projectLimit: 9999,
    features: [
      "Unlimited team members & seats",
      "Unlimited active projects",
      "SOC 2 Type II audit logs",
      "Dedicated Redis rate limit clusters",
      "Custom domain & SSO integration",
      "24/7 dedicated support engineering",
    ],
  },
};

export class BillingService {
  /**
   * Get all public plan tiers and pricing.
   */
  static getPlans() {
    return Object.values(PLAN_TIERS);
  }

  /**
   * Fetch current subscription details for a workspace. Auto-creates free tier record if absent.
   */
  static async getWorkspaceSubscription(workspaceId: string) {
    const [sub] = await db
      .select()
      .from(workspaceSubscriptions)
      .where(eq(workspaceSubscriptions.workspaceId, workspaceId))
      .limit(1);

    if (sub) {
      const plan = PLAN_TIERS[sub.planTier] || PLAN_TIERS.free;
      return {
        ...sub,
        plan,
      };
    }

    // Default to free tier
    const [newSub] = await db
      .insert(workspaceSubscriptions)
      .values({
        workspaceId,
        planTier: "free",
        status: "active",
        seatLimit: PLAN_TIERS.free.seatLimit,
        projectLimit: PLAN_TIERS.free.projectLimit,
      })
      .returning();

    return {
      ...newSub,
      plan: PLAN_TIERS.free,
    };
  }

  /**
   * Create a Stripe Checkout Session for subscription upgrade.
   */
  static async createCheckoutSession(params: {
    workspaceId: string;
    userId: string;
    planTier: "pro" | "enterprise";
    successUrl?: string;
    cancelUrl?: string;
  }) {
    const targetPlan = PLAN_TIERS[params.planTier];
    if (!targetPlan) {
      throw new AppError("Invalid subscription plan", 400, "INVALID_PLAN");
    }

    const currentSub = await this.getWorkspaceSubscription(params.workspaceId);
    const successUrl = params.successUrl || `${env.APP_URL}/dashboard?billing=success`;
    const cancelUrl = params.cancelUrl || `${env.APP_URL}/dashboard?billing=cancel`;

    // 1. If Stripe is configured with live/test key
    if (stripe && env.STRIPE_SECRET_KEY) {
      const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, params.userId));
      let customerId = currentSub.stripeCustomerId;

      if (!customerId && user?.email) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            workspaceId: params.workspaceId,
            userId: params.userId,
          },
        });
        customerId = customer.id;

        await db
          .update(workspaceSubscriptions)
          .set({ stripeCustomerId: customerId, updatedAt: new Date() })
          .where(eq(workspaceSubscriptions.workspaceId, params.workspaceId));
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId || undefined,
        customer_email: !customerId && user ? user.email : undefined,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `TaskFlow Pro — ${targetPlan.name}`,
                description: targetPlan.features.join(", "),
              },
              unit_amount: targetPlan.priceMonthly * 100, // in cents
              recurring: { interval: "month" },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          workspaceId: params.workspaceId,
          planTier: params.planTier,
          userId: params.userId,
        },
      });

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        mode: "stripe",
      };
    }

    // 2. Development Mode: Instant simulated upgrade
    logger.info(`[Billing] Upgrading workspace ${params.workspaceId} to ${params.planTier} (Simulated Stripe Dev Mode)`);
    await db
      .update(workspaceSubscriptions)
      .set({
        planTier: params.planTier,
        status: "active",
        seatLimit: targetPlan.seatLimit,
        projectLimit: targetPlan.projectLimit,
        stripeSubscriptionId: `sub_simulated_${Date.now()}`,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(workspaceSubscriptions.workspaceId, params.workspaceId));

    return {
      checkoutUrl: `${successUrl}&plan=${params.planTier}`,
      mode: "development_simulated",
      message: `Workspace upgraded to ${targetPlan.name} (Configure STRIPE_SECRET_KEY for live payment card processing).`,
    };
  }

  /**
   * Create a Stripe Customer Billing Portal Session so users can manage cards/invoices.
   */
  static async createCustomerPortalSession(workspaceId: string, returnUrl?: string) {
    const sub = await this.getWorkspaceSubscription(workspaceId);
    const redirectUrl = returnUrl || `${env.APP_URL}/dashboard`;

    if (stripe && sub.stripeCustomerId) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: redirectUrl,
      });
      return { url: portal.url };
    }

    return {
      url: redirectUrl,
      message: "Customer portal is available when Stripe credentials and customer are initialized.",
    };
  }

  /**
   * Process incoming Stripe webhooks.
   */
  static async handleWebhook(rawBody: string | Buffer, signature?: string) {
    if (!stripe || !env.STRIPE_WEBHOOK_SECRET || !signature) {
      logger.warn("[Billing] Stripe webhook received but secret or signature not configured");
      return { received: true };
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.metadata?.workspaceId;
        const planTier = (session.metadata?.planTier as "pro" | "enterprise") || "pro";

        if (workspaceId) {
          const plan = PLAN_TIERS[planTier] || PLAN_TIERS.pro;
          await db
            .update(workspaceSubscriptions)
            .set({
              planTier,
              status: "active",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              seatLimit: plan.seatLimit,
              projectLimit: plan.projectLimit,
              updatedAt: new Date(),
            })
            .where(eq(workspaceSubscriptions.workspaceId, workspaceId));
          logger.info(`[Billing Webhook] Workspace ${workspaceId} activated on ${planTier}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await db
          .update(workspaceSubscriptions)
          .set({
            planTier: "free",
            status: "canceled",
            seatLimit: PLAN_TIERS.free.seatLimit,
            projectLimit: PLAN_TIERS.free.projectLimit,
            updatedAt: new Date(),
          })
          .where(eq(workspaceSubscriptions.stripeSubscriptionId, subscription.id));
        logger.info(`[Billing Webhook] Subscription ${subscription.id} downgraded to Free`);
        break;
      }
    }

    return { received: true };
  }
}
