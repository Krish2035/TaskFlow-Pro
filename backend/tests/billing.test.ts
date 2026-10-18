import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { BillingService, PLAN_TIERS } from "../src/services/billing.service";

describe("Stripe Billing & Subscriptions Tests", () => {
  it("BillingService.getPlans returns all pricing tiers with features", () => {
    const plans = BillingService.getPlans();
    expect(plans.length).toBeGreaterThanOrEqual(3);

    const proPlan = plans.find((p) => p.id === "pro");
    expect(proPlan).toBeDefined();
    expect(proPlan?.priceMonthly).toBe(19);
    expect(proPlan?.seatLimit).toBe(25);
    expect(proPlan?.features.length).toBeGreaterThan(0);

    const entPlan = plans.find((p) => p.id === "enterprise");
    expect(entPlan).toBeDefined();
    expect(entPlan?.priceMonthly).toBe(79);
    expect(entPlan?.seatLimit).toBe(9999);
  });

  it("GET /api/v1/billing/plans returns 200 with list of plans", async () => {
    const res = await request(app).get("/api/v1/billing/plans");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.some((p: any) => p.id === "free")).toBe(true);
    expect(res.body.data.some((p: any) => p.id === "pro")).toBe(true);
    expect(res.body.data.some((p: any) => p.id === "enterprise")).toBe(true);
  });

  it("POST /api/v1/billing/workspaces/:id/checkout requires authentication", async () => {
    const res = await request(app)
      .post("/api/v1/billing/workspaces/random-id/checkout")
      .send({ planTier: "pro" });

    expect(res.status).toBe(401);
  });
});
