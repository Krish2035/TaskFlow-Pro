import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/connections";
import { workspaces } from "../db/schema/workspaces";
import { workspaceMembers } from "../db/schema/workspaceMembers";
import { users } from "../db/schema/users";
import { AppError } from "../middleware/error-handler";
import { EmailService } from "./email.service";

export class WorkspaceService {
  static async createWorkspace(userId: string, data: { name: string; slug: string }) {
    const slug = data.slug.toLowerCase().trim();

    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.slug, slug))
      .limit(1);

    if (existing) {
      throw new AppError("Workspace slug is already taken", 409, "SLUG_TAKEN");
    }

    return await db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({
          name: data.name.trim(),
          slug,
          createdBy: userId,
        })
        .returning();

      // Creator is automatically owner
      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: "owner",
      });

      return workspace;
    });
  }

  static async listUserWorkspaces(userId: string) {
    const memberships = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId))
      .orderBy(desc(workspaces.createdAt));

    return memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  static async getWorkspace(workspaceId: string, userId: string) {
    const [membership] = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId)
        )
      )
      .limit(1);

    if (!membership) {
      throw new AppError("Workspace not found or access denied", 404, "NOT_FOUND");
    }

    return {
      ...membership.workspace,
      userRole: membership.role,
    };
  }

  static async listMembers(workspaceId: string) {
    return await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
        displayName: users.displayName,
        email: users.email,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  static async inviteMember(
    workspaceId: string,
    inviterUserId: string,
    data: { email: string; role?: string }
  ) {
    const email = data.email.trim().toLowerCase();
    const role = data.role || "member";

    // 1. Get workspace info
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!workspace) {
      throw new AppError("Workspace not found", 404, "NOT_FOUND");
    }

    // 2. Get inviter info
    const [inviter] = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, inviterUserId))
      .limit(1);

    const inviterName = inviter?.displayName || inviter?.email || "A team member";

    // 3. Check if user already exists
    const [targetUser] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (targetUser) {
      // Check if already in workspace
      const [existingMember] = await db
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, targetUser.id)
          )
        )
        .limit(1);

      if (existingMember) {
        throw new AppError("User is already a member of this workspace", 409, "ALREADY_MEMBER");
      }

      await db.insert(workspaceMembers).values({
        workspaceId,
        userId: targetUser.id,
        role,
      });
    }

    // 4. Dispatch Email via EmailService (Resend or Postmark)
    const emailResult = await EmailService.sendWorkspaceInvitation({
      to: email,
      inviterName,
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      role,
    });

    return {
      message: `Invitation successfully sent to ${email}`,
      emailResult,
      isRegisteredUser: !!targetUser,
    };
  }
}
