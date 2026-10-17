import { relations } from "drizzle-orm";
import { users } from "./users";
import { platformRoles } from "./platformRoles";
import { workspaces } from "./workspaces";
import { workspaceMembers } from "./workspaceMembers";
import { workspaceInvitations } from "./workspaceInvitations";
import { projects } from "./projects";
import { tasks } from "./tasks";
import { taskAssignees } from "./taskAssignees";
import { comments } from "./comments";
import { refreshTokens } from "./refreshTokens";
import { passwordResetTokens } from "./passwordResetTokens";
import { notifications } from "./notifications";
import { activityLogs } from "./activityLogs";

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(workspaceMembers),
  createdWorkspaces: many(workspaces),
  createdProjects: many(projects),
  createdTasks: many(tasks),
  taskAssignments: many(taskAssignees),
  comments: many(comments),
  refreshTokens: many(refreshTokens),
  notifications: many(notifications),
  platformRoles: many(platformRoles),
}));

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  creator: one(users, {
    fields: [workspaces.createdBy],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  projects: many(projects),
  activityLogs: many(activityLogs),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
  assignees: many(taskAssignees),
  comments: many(comments),
}));

export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
  task: one(tasks, {
    fields: [taskAssignees.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskAssignees.userId],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  task: one(tasks, {
    fields: [comments.taskId],
    references: [tasks.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export {
  users,
  platformRoles,
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  projects,
  tasks,
  taskAssignees,
  comments,
  refreshTokens,
  passwordResetTokens,
  notifications,
  activityLogs,
};
