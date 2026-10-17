import { pgTable, uuid, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 30 }).notNull().default("todo"), // todo, in_progress, in_review, done
    priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high, urgent
    dueAt: timestamp("due_at", { withTimezone: true }),
    version: integer("version").default(1).notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_tasks_project_status_created").on(
      table.projectId,
      table.status,
      table.createdAt.desc(),
      table.id.desc()
    ),
    index("idx_tasks_project_priority_due").on(
      table.projectId,
      table.priority,
      table.dueAt
    ),
  ]
);
