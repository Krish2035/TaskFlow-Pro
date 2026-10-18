"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { apiClient } from "@/lib/api-client";
import {
  Plus,
  FolderKanban,
  CheckCircle,
  Clock,
  Users,
  ArrowUpRight,
  Trash2,
  Mail,
  X,
  AlertCircle,
  CheckCircle2,
  Building2,
  CreditCard,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
  createdAt?: string;
}

interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: string;
}

interface Member {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: string;
}

interface SubscriptionInfo {
  planTier: "free" | "pro" | "enterprise";
  status: string;
  seatLimit: number;
  projectLimit: number;
  stripeCustomerId?: string;
  currentPeriodEnd?: string;
}

export default function DashboardPage() {
  const router = useRouter();

  // Core State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Dynamic Board Stats
  const [boardStats, setBoardStats] = useState({
    total: 0,
    inProgress: 0,
    completed: 0,
    todo: 0,
  });

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [trashTasks, setTrashTasks] = useState<any[]>([]);

  // Form inputs
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskStatus, setNewTaskStatus] = useState<"todo" | "in_progress" | "in_review" | "done">("todo");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");

  const [newWsName, setNewWsName] = useState("");
  const [newWsSlug, setNewWsSlug] = useState("");

  const [newProjName, setNewProjName] = useState("");
  const [newProjDescription, setNewProjDescription] = useState("");

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  const showFeedback = (message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  // 1. Initial Load: Auth check & Workspaces fetch
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await apiClient<{ data: Workspace[] }>("/workspaces");
      const list = res.data || [];
      setWorkspaces(list);

      if (list.length > 0) {
        setCurrentWorkspace(list[0]);
      } else {
        setIsWorkspaceModalOpen(true);
      }
    } catch (err: any) {
      if (err.status === 401) {
        router.push("/login");
      } else {
        showFeedback(err.message || "Failed to load workspaces", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  // 2. Load Projects, Members, and Stripe Subscription for current workspace
  const loadWorkspaceDetails = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const [projRes, membersRes, subRes] = await Promise.all([
        apiClient<{ data: Project[] }>(`/workspaces/${currentWorkspace.id}/projects`),
        apiClient<{ data: Member[] }>(`/workspaces/${currentWorkspace.id}/members`).catch(() => ({ data: [] })),
        apiClient<{ data: SubscriptionInfo }>(`/billing/workspaces/${currentWorkspace.id}`).catch(() => ({ data: null })),
      ]);

      const projectList = projRes.data || [];
      setProjects(projectList);
      setMembers(membersRes.data || []);
      if (subRes.data) setSubscription(subRes.data);

      if (projectList.length > 0) {
        setCurrentProject(projectList[0]);
      } else {
        setCurrentProject(null);
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to load workspace projects", "error");
    }
  }, [currentWorkspace]);

  useEffect(() => {
    loadWorkspaceDetails();
  }, [loadWorkspaceDetails]);

  // Check URL query parameters for billing return
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("billing") === "success") {
        showFeedback("Subscription successfully activated! Your workspace has been upgraded.", "success");
        loadWorkspaceDetails();
      }
    }
  }, [loadWorkspaceDetails]);

  // 3. Create Workspace
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim() || !newWsSlug.trim()) return;

    setSubmitting(true);
    try {
      const res = await apiClient<{ data: Workspace }>("/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: newWsName.trim(),
          slug: newWsSlug.trim().toLowerCase(),
        }),
      });

      if (res.data) {
        showFeedback(`Workspace "${res.data.name}" created successfully!`);
        setWorkspaces((prev) => [res.data, ...prev]);
        setCurrentWorkspace(res.data);
        setIsWorkspaceModalOpen(false);
        setNewWsName("");
        setNewWsSlug("");
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to create workspace", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim() || !currentWorkspace) return;

    setSubmitting(true);
    try {
      const res = await apiClient<{ data: Project }>(`/workspaces/${currentWorkspace.id}/projects`, {
        method: "POST",
        body: JSON.stringify({
          name: newProjName.trim(),
          description: newProjDescription.trim() || undefined,
        }),
      });

      if (res.data) {
        showFeedback(`Project "${res.data.name}" created successfully!`);
        setProjects((prev) => [res.data, ...prev]);
        setCurrentProject(res.data);
        setIsProjectModalOpen(false);
        setNewProjName("");
        setNewProjDescription("");
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to create project", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentProject) return;

    setSubmitting(true);
    try {
      await apiClient(`/projects/${currentProject.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || undefined,
          priority: newTaskPriority,
          status: newTaskStatus,
        }),
      });

      showFeedback("Task created and saved to database!");
      setIsTaskModalOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      showFeedback(err.message || "Failed to create task", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Invite Member (Real email via Resend / Postmark)
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentWorkspace) return;

    setSubmitting(true);
    try {
      const res = await apiClient(`/workspaces/${currentWorkspace.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      showFeedback(res.message || `Invitation dispatched to ${inviteEmail} via email!`);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      loadWorkspaceDetails();
    } catch (err: any) {
      showFeedback(err.message || "Failed to dispatch invitation email", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Load & Restore Trash
  const handleOpenTrash = async () => {
    if (!currentProject) return;
    setIsTrashModalOpen(true);
    try {
      const res = await apiClient<{ data: any[] }>(`/projects/${currentProject.id}/trash`);
      setTrashTasks(res.data || []);
    } catch {
      showFeedback("Failed to load trash items", "error");
    }
  };

  const handleRestoreTask = async (taskId: string) => {
    try {
      await apiClient(`/tasks/${taskId}/restore`, { method: "POST" });
      setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));
      setRefreshTrigger((prev) => prev + 1);
      showFeedback("Task restored back to active sprint board!");
    } catch (err: any) {
      showFeedback(err.message || "Failed to restore task", "error");
    }
  };

  // 8. Stripe Subscription Upgrade
  const handleUpgradePlan = async (planTier: "pro" | "enterprise") => {
    if (!currentWorkspace) return;
    setUpgradingPlan(planTier);
    try {
      const res = await apiClient<{ data: { checkoutUrl: string; mode: string; message?: string } }>(
        `/billing/workspaces/${currentWorkspace.id}/checkout`,
        {
          method: "POST",
          body: JSON.stringify({ planTier }),
        }
      );

      if (res.data?.checkoutUrl) {
        if (res.data.mode === "development_simulated") {
          showFeedback(res.data.message || `Upgraded to ${planTier.toUpperCase()}!`, "success");
          setIsBillingModalOpen(false);
          loadWorkspaceDetails();
        } else {
          window.location.href = res.data.checkoutUrl;
        }
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to initiate Stripe checkout", "error");
    } finally {
      setUpgradingPlan(null);
    }
  };

  // 9. Stripe Customer Portal
  const handleOpenCustomerPortal = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await apiClient<{ data: { url: string } }>(
        `/billing/workspaces/${currentWorkspace.id}/portal`,
        { method: "POST" }
      );
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to open customer portal", "error");
    }
  };

  const currentTier = subscription?.planTier || "free";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar activeTab="dashboard" onOpenBilling={() => setIsBillingModalOpen(true)} />

        <main style={{ flex: 1, padding: "2rem", overflowX: "auto" }}>
          {/* Feedback Banner */}
          {feedback && (
            <div
              style={{
                background: feedback.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                border: `1px solid ${feedback.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                color: feedback.type === "success" ? "#34d399" : "#fca5a5",
                padding: "0.85rem 1.25rem",
                borderRadius: "8px",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "0.9rem",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {feedback.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {feedback.message}
              </span>
              <button
                onClick={() => setFeedback(null)}
                style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Top Workspace Header & Selectors */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
                {workspaces.length > 0 ? (
                  <select
                    value={currentWorkspace?.id || ""}
                    onChange={(e) => {
                      const selected = workspaces.find((w) => w.id === e.target.value);
                      if (selected) setCurrentWorkspace(selected);
                    }}
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      background: "transparent",
                      color: "white",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.2rem 0.6rem",
                      cursor: "pointer",
                    }}
                  >
                    {workspaces.map((w) => (
                      <option key={w.id} value={w.id} style={{ background: "#101623", color: "white" }}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Workspace</h1>
                )}

                <button
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="secondary-btn"
                  title="Create Workspace"
                  style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                >
                  <Plus size={14} /> New
                </button>

                {/* Plan Badge */}
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "9999px",
                    background: currentTier === "enterprise" ? "rgba(168, 85, 247, 0.2)" : currentTier === "pro" ? "rgba(99, 102, 241, 0.2)" : "rgba(255, 255, 255, 0.08)",
                    color: currentTier === "enterprise" ? "#c084fc" : currentTier === "pro" ? "#818cf8" : "var(--text-muted)",
                    fontWeight: 600,
                    border: `1px solid ${currentTier === "enterprise" ? "rgba(168, 85, 247, 0.4)" : currentTier === "pro" ? "rgba(99, 102, 241, 0.4)" : "rgba(255, 255, 255, 0.15)"}`,
                  }}
                >
                  {currentTier.toUpperCase()} PLAN
                </span>
              </div>

              {/* Project selector */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Project:</span>
                {projects.length > 0 ? (
                  <select
                    value={currentProject?.id || ""}
                    onChange={(e) => {
                      const sel = projects.find((p) => p.id === e.target.value);
                      if (sel) setCurrentProject(sel);
                    }}
                    style={{
                      fontSize: "0.85rem",
                      background: "rgba(255,255,255,0.05)",
                      color: "white",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.25rem 0.6rem",
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id} style={{ background: "#101623", color: "white" }}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: "0.85rem", color: "#f87171" }}>No project yet</span>
                )}

                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--accent-primary)",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  + Add Project
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => setIsBillingModalOpen(true)}
                className="secondary-btn"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", borderColor: "var(--border-glow)" }}
              >
                <CreditCard size={16} color="var(--accent-primary)" /> Billing & Plans
              </button>

              <button
                onClick={handleOpenTrash}
                className="secondary-btn"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
              >
                <Trash2 size={16} /> Recycle Bin
              </button>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="secondary-btn"
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
              >
                <Users size={16} /> Invite Member
              </button>

              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="glow-btn"
                disabled={!currentProject}
                style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", opacity: !currentProject ? 0.5 : 1 }}
              >
                <Plus size={16} /> New Task
              </button>
            </div>
          </div>

          {/* Quick Stats Grid from Database */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Active Projects</span>
                <FolderKanban size={18} color="var(--accent-primary)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{projects.length}</div>
              <div style={{ fontSize: "0.75rem", color: "#34d399", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
                <ArrowUpRight size={14} /> Synchronized with DB
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Tasks in Progress</span>
                <Clock size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{boardStats.inProgress}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {boardStats.todo} pending in queue
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Completed Tasks</span>
                <CheckCircle size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>{boardStats.completed}</div>
              <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "0.25rem" }}>
                {boardStats.total > 0 ? `${Math.round((boardStats.completed / boardStats.total) * 100)}% velocity` : "Ready for tasks"}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Team Seats</span>
                <Users size={18} color="#a855f7" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                {Math.max(1, members.length)} / {subscription?.seatLimit || 5}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                {currentTier.toUpperCase()} Plan Capacity
              </div>
            </div>
          </div>

          {/* Kanban Section */}
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              {currentProject ? `${currentProject.name} Board` : "Project Board"}
            </h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Drag cards across columns to update database state in real-time
            </span>
          </div>

          {/* Real Backend Kanban Board Component */}
          <KanbanBoard
            projectId={currentProject?.id}
            onStatsUpdate={setBoardStats}
            refreshTrigger={refreshTrigger}
          />
        </main>
      </div>

      {/* STRIPE BILLING & SUBSCRIPTION MODAL */}
      {isBillingModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: "1.5rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "850px", padding: "2.5rem", background: "#101623", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                  <CreditCard size={22} color="var(--accent-primary)" />
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 700 }}>Stripe Billing & Subscriptions</h3>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  Scale your workspace with team seats, cloud storage attachments, and enterprise audit logs.
                </p>
              </div>
              <button onClick={() => setIsBillingModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={22} />
              </button>
            </div>

            {/* Plan Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
              {/* Free Plan */}
              <div
                style={{
                  background: currentTier === "free" ? "rgba(99, 102, 241, 0.1)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${currentTier === "free" ? "var(--border-glow)" : "var(--border-subtle)"}`,
                  borderRadius: "10px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>Starter</h4>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.75rem 0" }}>$0 <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>/month</span></div>
                  <ul style={{ listStyle: "none", padding: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <li>✓ Up to 5 team members</li>
                    <li>✓ 3 active projects</li>
                    <li>✓ Real-time Kanban board</li>
                    <li>✓ Community support</li>
                  </ul>
                </div>
                <button
                  disabled
                  className="secondary-btn"
                  style={{ width: "100%", marginTop: "1.5rem", fontSize: "0.85rem", opacity: currentTier === "free" ? 1 : 0.6 }}
                >
                  {currentTier === "free" ? "Current Plan" : "Downgrade"}
                </button>
              </div>

              {/* Pro Plan */}
              <div
                style={{
                  background: currentTier === "pro" ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.04)",
                  border: "2px solid #818cf8",
                  borderRadius: "10px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  boxShadow: "0 0 20px rgba(99, 102, 241, 0.2)",
                }}
              >
                <div style={{ position: "absolute", top: "-10px", right: "15px", background: "var(--accent-gradient)", color: "white", fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: "9999px" }}>
                  POPULAR
                </div>
                <div>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>Pro Team</h4>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.75rem 0" }}>$19 <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>/month</span></div>
                  <ul style={{ listStyle: "none", padding: 0, fontSize: "0.82rem", color: "#e2e8f0", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <li>✓ Up to 25 team members</li>
                    <li>✓ 50 active projects</li>
                    <li>✓ Cloud Storage file attachments</li>
                    <li>✓ Real-time WebSockets</li>
                    <li>✓ Priority email support</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleUpgradePlan("pro")}
                  disabled={currentTier === "pro" || !!upgradingPlan}
                  className="glow-btn"
                  style={{ width: "100%", marginTop: "1.5rem", fontSize: "0.85rem" }}
                >
                  {currentTier === "pro" ? "Current Plan" : upgradingPlan === "pro" ? "Redirecting..." : "Upgrade to Pro"}
                </button>
              </div>

              {/* Enterprise Plan */}
              <div
                style={{
                  background: currentTier === "enterprise" ? "rgba(168, 85, 247, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${currentTier === "enterprise" ? "rgba(168, 85, 247, 0.6)" : "var(--border-subtle)"}`,
                  borderRadius: "10px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: 600, color: "white" }}>Enterprise Scale</h4>
                  <div style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.75rem 0" }}>$79 <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 400 }}>/month</span></div>
                  <ul style={{ listStyle: "none", padding: 0, fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <li>✓ Unlimited team members</li>
                    <li>✓ Unlimited projects</li>
                    <li>✓ SOC 2 compliance audit logs</li>
                    <li>✓ Dedicated Redis cluster</li>
                    <li>✓ 24/7 engineering support</li>
                  </ul>
                </div>
                <button
                  onClick={() => handleUpgradePlan("enterprise")}
                  disabled={currentTier === "enterprise" || !!upgradingPlan}
                  className="secondary-btn"
                  style={{ width: "100%", marginTop: "1.5rem", fontSize: "0.85rem", borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc" }}
                >
                  {currentTier === "enterprise" ? "Current Plan" : upgradingPlan === "enterprise" ? "Redirecting..." : "Upgrade to Enterprise"}
                </button>
              </div>
            </div>

            {/* Customer Portal Link */}
            {subscription?.stripeCustomerId && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Need to update your payment card or download invoices?
                </span>
                <button onClick={handleOpenCustomerPortal} className="secondary-btn" style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}>
                  Stripe Customer Portal &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Create New Task */}
      {isTaskModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "500px", padding: "2rem", background: "#101623" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Create New Task</h3>
              <button onClick={() => setIsTaskModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTask}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement OAuth login with GitHub"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add details, acceptance criteria, or links..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", background: "#1a2234", border: "1px solid var(--border-subtle)", color: "white" }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Status Column</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value as any)}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", background: "#1a2234", border: "1px solid var(--border-subtle)", color: "white" }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Completed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="secondary-btn">Cancel</button>
                <button type="submit" disabled={submitting} className="glow-btn">
                  {submitting ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Invite Team Member */}
      {isInviteModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "480px", padding: "2rem", background: "#101623" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Invite to {currentWorkspace?.name}</h3>
              </div>
              <button onClick={() => setIsInviteModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Enter your teammate&apos;s email address. An official invitation email will be dispatched via <strong>Resend / Postmark</strong> with a one-click collaboration link.
            </p>

            <form onSubmit={handleInviteMember}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", background: "#1a2234", border: "1px solid var(--border-subtle)", color: "white" }}
                >
                  <option value="member">Member (Can manage tasks & projects)</option>
                  <option value="admin">Admin (Can manage members & settings)</option>
                  <option value="viewer">Viewer (Read-only access)</option>
                </select>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setIsInviteModalOpen(false)} className="secondary-btn">Cancel</button>
                <button type="submit" disabled={submitting} className="glow-btn">
                  {submitting ? "Dispatching..." : "Send Email Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Workspace */}
      {isWorkspaceModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", background: "#101623" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Building2 size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>New Workspace</h3>
              </div>
              {workspaces.length > 0 && (
                <button onClick={() => setIsWorkspaceModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              )}
            </div>

            <form onSubmit={handleCreateWorkspace}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Engineering"
                  value={newWsName}
                  onChange={(e) => {
                    setNewWsName(e.target.value);
                    if (!newWsSlug) {
                      setNewWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                    }
                  }}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>URL Slug (lowercase letters & hyphens)</label>
                <input
                  type="text"
                  required
                  placeholder="acme-engineering"
                  value={newWsSlug}
                  onChange={(e) => setNewWsSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                {workspaces.length > 0 && (
                  <button type="button" onClick={() => setIsWorkspaceModalOpen(false)} className="secondary-btn">Cancel</button>
                )}
                <button type="submit" disabled={submitting} className="glow-btn">
                  {submitting ? "Creating..." : "Create Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Project */}
      {isProjectModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "460px", padding: "2rem", background: "#101623" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <FolderKanban size={20} color="var(--accent-primary)" />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>New Project</h3>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sprint 1 - Infrastructure"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Project scope or goals..."
                  value={newProjDescription}
                  onChange={(e) => setNewProjDescription(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-subtle)", color: "white" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                <button type="button" onClick={() => setIsProjectModalOpen(false)} className="secondary-btn">Cancel</button>
                <button type="submit" disabled={submitting} className="glow-btn">
                  {submitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Recycle Bin / Trash */}
      {isTrashModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "550px", padding: "2rem", background: "#101623" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Trash2 size={20} color="#f87171" />
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>Recycle Bin (Soft Deleted Tasks)</h3>
              </div>
              <button onClick={() => setIsTrashModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Deleted tasks remain in the recycle bin. You can restore them back to the active board at any time.
            </p>

            <div style={{ maxHeight: "350px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {trashTasks.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                  Recycle bin is empty. No deleted tasks.
                </div>
              ) : (
                trashTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{t.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        Deleted: {new Date(t.deletedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreTask(t.id)}
                      className="secondary-btn"
                      style={{ color: "#34d399", borderColor: "rgba(16, 185, 129, 0.3)", fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button onClick={() => setIsTrashModalOpen(false)} className="secondary-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
