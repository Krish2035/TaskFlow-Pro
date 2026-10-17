import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./users";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 30 }).notNull().default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_projects_workspace_status_created").on(
      table.workspaceId,
      table.status,
      table.createdAt.desc(),
      table.id.desc()
    ),
  ]
);
