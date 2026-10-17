-- Seed Sample Team Members
INSERT INTO users (id, email, password_hash, display_name, status, created_at, updated_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'alex@taskflow.dev', '$argon2id$v=19$m=19456,t=2,p=1$dHNhbXBsZXNhbHQ$abcdef1234567890abcdef1234567890', 'Alex Rivera (Tech Lead)', 'active', NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'maya@taskflow.dev', '$argon2id$v=19$m=19456,t=2,p=1$dHNhbXBsZXNhbHQ$abcdef1234567890abcdef1234567890', 'Maya Lin (Staff Backend)', 'active', NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'david@taskflow.dev', '$argon2id$v=19$m=19456,t=2,p=1$dHNhbXBsZXNhbHQ$abcdef1234567890abcdef1234567890', 'David Chen (Frontend Architect)', 'active', NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000004', 'sarah@taskflow.dev', '$argon2id$v=19$m=19456,t=2,p=1$dHNhbXBsZXNhbHQ$abcdef1234567890abcdef1234567890', 'Sarah Connor (DevOps Lead)', 'active', NOW(), NOW()),
  ('a0000000-0000-0000-0000-000000000005', 'priya@taskflow.dev', '$argon2id$v=19$m=19456,t=2,p=1$dHNhbXBsZXNhbHQ$abcdef1234567890abcdef1234567890', 'Priya Sharma (Product Manager)', 'active', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name;

-- Platform Super Admin
INSERT INTO platform_roles (user_id, role, granted_at)
VALUES ('a0000000-0000-0000-0000-000000000001', 'super_admin', NOW())
ON CONFLICT DO NOTHING;

-- Core Workspace
INSERT INTO workspaces (id, name, slug, created_by, created_at, updated_at)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Core Engineering & Scaling', 'core-engineering', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Workspace Members
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner', NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'admin', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'admin', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'member', NOW()),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'member', NOW())
ON CONFLICT DO NOTHING;

-- Projects
INSERT INTO projects (id, workspace_id, name, description, status, created_by, created_at, updated_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Kubernetes HPA & Auto-scaling', 'Horizontal Pod Autoscaling across stateless backend replicas', 'active', 'a0000000-0000-0000-0000-000000000004', NOW(), NOW()),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Real-Time WebSocket Kanban Sync', 'Live bi-directional multiplayer task movements', 'active', 'a0000000-0000-0000-0000-000000000003', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Tasks
INSERT INTO tasks (id, project_id, title, description, status, priority, created_by, created_at, updated_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Setup PostgreSQL Docker Container & Migrations', 'Apply 13 relational tables, cascades, and search indexes.', 'done', 'urgent', 'a0000000-0000-0000-0000-000000000001', NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Implement Redis Sliding-Window Distributed Rate Limiting', 'Protect auth routes from brute-force attacks across replicas.', 'done', 'high', 'a0000000-0000-0000-0000-000000000002', NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Build Real-Time WebSocket Multi-Client Broadcast Engine', 'Broadcast TASK_MOVED and TASK_CREATED events to all connected clients.', 'in_progress', 'urgent', 'a0000000-0000-0000-0000-000000000003', NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Configure Kubernetes Ingress and HPA Resource Limits', 'Configure autoscaling from 2 to 10 replicas under 60% CPU utilization.', 'in_progress', 'high', 'a0000000-0000-0000-0000-000000000004', NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002', 'Vitest & Supertest API Route Security Regression Test Suite', 'Validate liveness probes, readiness checks, and error boundaries.', 'in_review', 'medium', 'a0000000-0000-0000-0000-000000000005', NOW(), NOW()),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000001', 'Execute k6 Load Benchmark at 200 Virtual Users', 'Measure latency, p99 distribution, and database connection pool saturation.', 'todo', 'medium', 'a0000000-0000-0000-0000-000000000004', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Task Assignees
INSERT INTO task_assignees (task_id, user_id, assigned_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NOW()),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', NOW()),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', NOW()),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', NOW()),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', NOW())
ON CONFLICT DO NOTHING;
