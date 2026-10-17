"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { KanbanBoard } from "@/components/KanbanBoard";
import { apiClient } from "@/lib/api-client";
import { Plus, FolderKanban, CheckCircle, Clock, Users, ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await apiClient("/workspaces");
        if (res.data && res.data.length > 0) {
          setWorkspaces(res.data);
          setCurrentWorkspace(res.data[0]);
        } else {
          // Mock workspace for immediate preview if db empty
          const fallback = {
            id: "ws-demo",
            name: "Core Engineering",
            slug: "core-engineering",
            role: "owner",
          };
          setWorkspaces([fallback]);
          setCurrentWorkspace(fallback);
        }
      } catch {
        const fallback = {
          id: "ws-demo",
          name: "Core Engineering",
          slug: "core-engineering",
          role: "owner",
        };
        setWorkspaces([fallback]);
        setCurrentWorkspace(fallback);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ display: "flex", flex: 1 }}>
        <Sidebar activeTab="dashboard" />

        <main style={{ flex: 1, padding: "2rem", overflowX: "auto" }}>
          {/* Top Banner / Workspace header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>
                  {currentWorkspace?.name || "Workspace"}
                </h1>
                <span style={{
                  fontSize: "0.75rem",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "9999px",
                  background: "rgba(99, 102, 241, 0.15)",
                  color: "#818cf8",
                  fontWeight: 600,
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}>
                  {currentWorkspace?.role?.toUpperCase() || "OWNER"}
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Active Sprint · Sprint 4: Architecture & Scaling Milestones
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="secondary-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                <Users size={16} /> Invite Member
              </button>
              <button className="glow-btn" style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}>
                <Plus size={16} /> New Task
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Active Projects</span>
                <FolderKanban size={18} color="var(--accent-primary)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>3</div>
              <div style={{ fontSize: "0.75rem", color: "#34d399", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.25rem" }}>
                <ArrowUpRight size={14} /> +1 created this week
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Tasks in Progress</span>
                <Clock size={18} color="#3b82f6" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>8</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                2 pending code review
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Completed Tasks</span>
                <CheckCircle size={18} color="#10b981" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>24</div>
              <div style={{ fontSize: "0.75rem", color: "#10b981", marginTop: "0.25rem" }}>
                87% on-time completion
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                <span>Team Capacity</span>
                <Users size={18} color="#a855f7" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700 }}>6 Members</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                Full coverage across replicas
              </div>
            </div>
          </div>

          {/* Project & Sprint Kanban Board */}
          <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Sprint Task Board</h2>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Drag and drop to update task states</span>
          </div>

          <KanbanBoard />
        </main>
      </div>
    </div>
  );
}
