"use client";

import Link from "next/link";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Settings, Bell, Database } from "lucide-react";

export function Sidebar({ activeTab = "dashboard" }: { activeTab?: string }) {
  const menuItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { id: "projects", label: "Projects", icon: FolderKanban, href: "/dashboard" },
    { id: "tasks", label: "Tasks & Board", icon: CheckSquare, href: "/dashboard" },
    { id: "members", label: "Team Members", icon: Users, href: "/dashboard" },
    { id: "notifications", label: "Notifications", icon: Bell, href: "/dashboard" },
    { id: "settings", label: "Workspace Settings", icon: Settings, href: "/dashboard" },
  ];

  return (
    <aside style={{
      width: "250px",
      minHeight: "calc(100vh - 65px)",
      borderRight: "1px solid var(--border-subtle)",
      background: "var(--bg-secondary)",
      padding: "1.5rem 1rem",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ padding: "0 0.5rem 1rem", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", fontWeight: 600 }}>
          Workspaces
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "white" : "var(--text-muted)",
                background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
                border: isActive ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={18} color={isActive ? "var(--accent-primary)" : "var(--text-muted)"} />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div style={{
        padding: "1rem",
        background: "rgba(255, 255, 255, 0.03)",
        borderRadius: "8px",
        border: "1px solid var(--border-subtle)",
        fontSize: "0.8rem",
        color: "var(--text-muted)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", color: "#34d399" }}>
          <Database size={14} /> System Healthy
        </div>
        API v1 & Redis Connected
      </div>
    </aside>
  );
}
