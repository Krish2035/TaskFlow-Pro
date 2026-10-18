import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { tasks } from "./tasks";
import { users } from "./users";

export const taskAttachments = pgTable(
  "task_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    storageProvider: varchar("storage_provider", { length: 50 }).notNull().default("local"), // local, s3, cloudinary
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_task_attachments_task").on(table.taskId),
    index("idx_task_attachments_uploader").on(table.uploadedBy),
  ]
);
