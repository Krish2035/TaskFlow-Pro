-- ========================================================
-- TaskFlow Pro - Complete Production PostgreSQL Schema for Neon
-- ========================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(320) NOT NULL UNIQUE,
    "password_hash" varchar(255) NOT NULL,
    "display_name" varchar(100) NOT NULL,
    "status" varchar(20) DEFAULT 'active' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Refresh Tokens Table (Rotation & Session Management)
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token_hash" varchar(255) NOT NULL UNIQUE,
    "family_id" uuid NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Password Reset Tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "token_hash" varchar(255) NOT NULL UNIQUE,
    "expires_at" timestamp with time zone NOT NULL,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Platform Roles Table
CREATE TABLE IF NOT EXISTS "platform_roles" (
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" varchar(50) DEFAULT 'user' NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "platform_roles_user_id_role_pk" PRIMARY KEY("user_id", "role")
);

-- 5. Workspaces Table
CREATE TABLE IF NOT EXISTS "workspaces" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(100) NOT NULL,
    "slug" varchar(100) NOT NULL UNIQUE,
    "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Workspace Members Table
CREATE TABLE IF NOT EXISTS "workspace_members" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "role" varchar(30) DEFAULT 'member' NOT NULL,
    "joined_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Workspace Invitations Table
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "email" varchar(320) NOT NULL,
    "role" varchar(30) DEFAULT 'member' NOT NULL,
    "token_hash" varchar(255) NOT NULL UNIQUE,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Workspace Subscriptions (Stripe Billing & Tiers)
CREATE TABLE IF NOT EXISTS "workspace_subscriptions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid NOT NULL UNIQUE REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "stripe_customer_id" varchar(100),
    "stripe_subscription_id" varchar(100),
    "plan_tier" varchar(30) DEFAULT 'free' NOT NULL,
    "status" varchar(30) DEFAULT 'active' NOT NULL,
    "seat_limit" integer DEFAULT 5 NOT NULL,
    "project_limit" integer DEFAULT 3 NOT NULL,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. Projects Table
CREATE TABLE IF NOT EXISTS "projects" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "name" varchar(100) NOT NULL,
    "description" text,
    "status" varchar(30) DEFAULT 'active' NOT NULL,
    "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. Tasks Table (With Optimistic Concurrency Versioning)
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
    "title" varchar(255) NOT NULL,
    "description" text,
    "status" varchar(30) DEFAULT 'todo' NOT NULL,
    "priority" varchar(20) DEFAULT 'medium' NOT NULL,
    "due_at" timestamp with time zone,
    "version" integer DEFAULT 1 NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 11. Task Assignees Table
CREATE TABLE IF NOT EXISTS "task_assignees" (
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "task_assignees_task_id_user_id_pk" PRIMARY KEY("task_id", "user_id")
);

-- 12. Task Attachments (File Uploads & Cloud Storage)
CREATE TABLE IF NOT EXISTS "task_attachments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "file_name" varchar(255) NOT NULL,
    "file_url" text NOT NULL,
    "file_size" integer NOT NULL,
    "mime_type" varchar(100) NOT NULL,
    "storage_provider" varchar(50) DEFAULT 'local' NOT NULL,
    "uploaded_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 13. Comments Table
CREATE TABLE IF NOT EXISTS "comments" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
    "author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "body" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 14. Activity Logs Table
CREATE TABLE IF NOT EXISTS "activity_logs" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
    "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
    "action" varchar(100) NOT NULL,
    "resource_type" varchar(50) NOT NULL,
    "resource_id" uuid,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 15. Notifications Table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" varchar(50) NOT NULL,
    "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- ========================================================
-- Performance Indexes
-- ========================================================
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");
CREATE INDEX IF NOT EXISTS "idx_users_status" ON "users" USING btree ("status");

CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_user" ON "refresh_tokens" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family" ON "refresh_tokens" USING btree ("family_id");

CREATE INDEX IF NOT EXISTS "idx_password_reset_user" ON "password_reset_tokens" USING btree ("user_id");

CREATE INDEX IF NOT EXISTS "idx_workspaces_slug" ON "workspaces" USING btree ("slug");
CREATE INDEX IF NOT EXISTS "idx_workspaces_created_by" ON "workspaces" USING btree ("created_by");

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_members_uniq" ON "workspace_members" USING btree ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_workspace" ON "workspace_members" USING btree ("user_id", "workspace_id");

CREATE INDEX IF NOT EXISTS "idx_workspace_invitations_workspace" ON "workspace_invitations" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_invitations_email" ON "workspace_invitations" USING btree ("email");

CREATE INDEX IF NOT EXISTS "idx_subscriptions_workspace" ON "workspace_subscriptions" USING btree ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_customer" ON "workspace_subscriptions" USING btree ("stripe_customer_id");

CREATE INDEX IF NOT EXISTS "idx_projects_workspace_status_created" ON "projects" USING btree ("workspace_id", "status", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "idx_tasks_project_status_created" ON "tasks" USING btree ("project_id", "status", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS "idx_tasks_project_priority_due" ON "tasks" USING btree ("project_id", "priority", "due_at");

CREATE INDEX IF NOT EXISTS "idx_task_assignees_user_task" ON "task_assignees" USING btree ("user_id", "task_id");

CREATE INDEX IF NOT EXISTS "idx_task_attachments_task" ON "task_attachments" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_attachments_uploader" ON "task_attachments" USING btree ("uploaded_by");

CREATE INDEX IF NOT EXISTS "idx_comments_task_created_id" ON "comments" USING btree ("task_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_workspace_created" ON "activity_logs" USING btree ("workspace_id", "created_at" DESC NULLS LAST, "id" DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_created" ON "notifications" USING btree ("user_id", "created_at" DESC NULLS LAST);
