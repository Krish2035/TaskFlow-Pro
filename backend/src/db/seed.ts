import argon2 from "argon2";
import { pool, db } from "./connections";
import {
  users,
  platformRoles,
  workspaces,
  workspaceMembers,
  projects,
  tasks,
  taskAssignees,
  comments,
} from "./schema";
import { logger } from "../middleware/logger";

async function seedDatabase() {
  logger.info("🌱 Seeding TaskFlow Pro database with production sample team...");

  try {
    const passwordHash = await argon2.hash("Password123!", {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // 1. Create Sample Team Members
    logger.info("Inserting team members...");
    const sampleUsers = [
      { email: "alex@taskflow.dev", displayName: "Alex Rivera (Tech Lead)", role: "super_admin" },
      { email: "maya@taskflow.dev", displayName: "Maya Lin (Staff Backend)", role: "user" },
      { email: "david@taskflow.dev", displayName: "David Chen (Frontend Architect)", role: "user" },
      { email: "sarah@taskflow.dev", displayName: "Sarah Connor (DevOps Specialist)", role: "user" },
      { email: "priya@taskflow.dev", displayName: "Priya Sharma (Product Manager)", role: "user" },
    ];

    const insertedUsers: Record<string, string> = {};

    for (const u of sampleUsers) {
      const [user] = await db
        .insert(users)
        .values({
          email: u.email,
          displayName: u.displayName,
          passwordHash,
          status: "active",
        })
        .onConflictDoUpdate({
          target: users.email,
          set: { displayName: u.displayName },
        })
        .returning();

      insertedUsers[u.email] = user.id;

      if (u.role === "super_admin") {
        await db
          .insert(platformRoles)
          .values({
            userId: user.id,
            role: "super_admin",
          })
          .onConflictDoNothing();
      }
    }

    // 2. Create Workspace
    logger.info("Inserting workspace and member relationships...");
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: "Core Engineering & Infrastructure",
        slug: "core-engineering",
        createdBy: insertedUsers["alex@taskflow.dev"],
      })
      .onConflictDoUpdate({
        target: workspaces.slug,
        set: { name: "Core Engineering & Infrastructure" },
      })
      .returning();

    // 3. Add Members to Workspace
    const memberRoles = [
      { email: "alex@taskflow.dev", role: "owner" },
      { email: "maya@taskflow.dev", role: "admin" },
      { email: "david@taskflow.dev", role: "admin" },
      { email: "sarah@taskflow.dev", role: "member" },
      { email: "priya@taskflow.dev", role: "member" },
    ];

    for (const m of memberRoles) {
      await db
        .insert(workspaceMembers)
        .values({
          workspaceId: workspace.id,
          userId: insertedUsers[m.email],
          role: m.role,
        })
        .onConflictDoNothing();
    }

    // 4. Create Sample Projects
    logger.info("Inserting projects...");
    const [project1] = await db
      .insert(projects)
      .values({
        workspaceId: workspace.id,
        name: "Kubernetes Horizontal Pod Autoscaler (HPA)",
        description: "Autoscaling stateless Express backend Pods with CPU & memory metrics.",
        status: "active",
        createdBy: insertedUsers["sarah@taskflow.dev"],
      })
      .returning();

    const [project2] = await db
      .insert(projects)
      .values({
        workspaceId: workspace.id,
        name: "Real-time Live WebSocket Task Sync",
        description: "Bi-directional WebSocket event coordination for collaborative Kanban boards.",
        status: "active",
        createdBy: insertedUsers["david@taskflow.dev"],
      })
      .returning();

    // 5. Create Tasks
    logger.info("Inserting tasks and assignees...");
    const sampleTasks = [
      {
        projectId: project1.id,
        title: "Setup PostgreSQL Docker Container & Drizzle Migrations",
        description: "Apply 13 relational tables, cascades, and search indexes.",
        status: "done" as const,
        priority: "urgent" as const,
        author: "alex@taskflow.dev",
        assignees: ["alex@taskflow.dev", "maya@taskflow.dev"],
      },
      {
        projectId: project1.id,
        title: "Implement Redis Sliding-Window Distributed Rate Limiting",
        description: "Protect auth routes from brute-force attacks across replicas.",
        status: "done" as const,
        priority: "high" as const,
        author: "maya@taskflow.dev",
        assignees: ["maya@taskflow.dev"],
      },
      {
        projectId: project2.id,
        title: "Build Real-Time WebSocket Multi-Client Broadcast Engine",
        description: "Broadcast TASK_MOVED and TASK_CREATED events to all connected clients.",
        status: "in_progress" as const,
        priority: "urgent" as const,
        author: "david@taskflow.dev",
        assignees: ["david@taskflow.dev", "alex@taskflow.dev"],
      },
      {
        projectId: project1.id,
        title: "Configure Kubernetes Ingress and HPA Resource Limits",
        description: "Configure autoscaling from 2 to 10 replicas under 60% CPU utilization.",
        status: "in_progress" as const,
        priority: "high" as const,
        author: "sarah@taskflow.dev",
        assignees: ["sarah@taskflow.dev"],
      },
      {
        projectId: project2.id,
        title: "Vitest & Supertest API Route Security Regression Test Suite",
        description: "Validate liveness probes, readiness checks, and error boundaries.",
        status: "in_review" as const,
        priority: "medium" as const,
        author: "priya@taskflow.dev",
        assignees: ["priya@taskflow.dev"],
      },
      {
        projectId: project1.id,
        title: "Execute k6 Load Benchmark at 200 Virtual Users",
        description: "Measure latency, p99 distribution, and database connection pool saturation.",
        status: "todo" as const,
        priority: "medium" as const,
        author: "sarah@taskflow.dev",
        assignees: ["sarah@taskflow.dev"],
      },
    ];

    for (const st of sampleTasks) {
      const [t] = await db
        .insert(tasks)
        .values({
          projectId: st.projectId,
          title: st.title,
          description: st.description,
          status: st.status,
          priority: st.priority,
          createdBy: insertedUsers[st.author],
        })
        .returning();

      for (const aEmail of st.assignees) {
        await db
          .insert(taskAssignees)
          .values({
            taskId: t.id,
            userId: insertedUsers[aEmail],
          })
          .onConflictDoNothing();
      }

      // Add a sample comment
      await db.insert(comments).values({
        taskId: t.id,
        authorId: insertedUsers[st.author],
        body: `Initial sprint scope defined. Ready for collaborative review.`,
      });
    }

    logger.info("🎉 Database successfully seeded with 5 team members, 2 projects, and sprint tasks!");
  } catch (error) {
    logger.error({ error }, "❌ Error seeding database");
  } finally {
    await pool.end();
  }
}

seedDatabase();
