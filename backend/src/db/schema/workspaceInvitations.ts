import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    role: varchar("role", { length: 30 }).notNull().default("member"),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_workspace_invitations_workspace").on(table.workspaceId),
    index("idx_workspace_invitations_email").on(table.email),
  ]
);
