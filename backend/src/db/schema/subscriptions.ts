import { pgTable, uuid, varchar, timestamp, index, integer } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const workspaceSubscriptions = pgTable(
  "workspace_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .unique()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
    planTier: varchar("plan_tier", { length: 30 }).notNull().default("free"), // free, pro, enterprise
    status: varchar("status", { length: 30 }).notNull().default("active"), // active, past_due, canceled, trialing
    seatLimit: integer("seat_limit").notNull().default(5),
    projectLimit: integer("project_limit").notNull().default(3),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_subscriptions_workspace").on(table.workspaceId),
    index("idx_subscriptions_customer").on(table.stripeCustomerId),
  ]
);
