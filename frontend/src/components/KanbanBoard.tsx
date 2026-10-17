"use client";

import { useState } from "react";
import { Plus, Clock, User, AlertCircle } from "lucide-react";

interface TaskItem {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  due: string;
}

const initialTasks: TaskItem[] = [
  { id: "1", title: "Setup PostgreSQL & Drizzle ORM Migrations", status: "done", priority: "high", due: "Yesterday" },
  { id: "2", title: "Implement Redis-backed Distributed Rate Limiter", status: "done", priority: "urgent", due: "Today" },
  { id: "3", title: "Add JWT Refresh Token Rotation with Reuse Detection", status: "in_progress", priority: "high", due: "Tomorrow" },
  { id: "4", title: "Build Modular Monolith Controller-Service-Model Architecture", status: "in_progress", priority: "medium", due: "In 2 days" },
  { id: "5", title: "Configure Docker Compose & Kubernetes HPA Manifests", status: "todo", priority: "medium", due: "Next week" },
  { id: "6", title: "Vitest & Supertest API Route Security Assertions", status: "todo", priority: "low", due: "Next week" },
];

const columns = [
  { id: "todo", title: "To Do", color: "var(--status-todo)" },
  { id: "in_progress", title: "In Progress", color: "var(--status-progress)" },
  { id: "in_review", title: "Review", color: "var(--status-review)" },
  { id: "done", title: "Completed", color: "var(--status-done)" },
];

export function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);

  const getPriorityBadge = (priority: TaskItem["priority"]) => {
    switch (priority) {
      case "urgent":
        return <span style={{ color: "#ef4444", background: "rgba(239, 68, 68, 0.15)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>Urgent</span>;
      case "high":
        return <span style={{ color: "#f97316", background: "rgba(249, 115, 22, 0.15)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>High</span>;
      case "medium":
        return <span style={{ color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>Medium</span>;
      default:
        return <span style={{ color: "#94a3b8", background: "rgba(148, 163, 184, 0.15)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>Low</span>;
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskItem["status"], e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginTop: "1rem" }}>
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(col.id as any, e)}
            className="glass-panel"
            style={{
              padding: "1rem",
              minHeight: "450px",
              background: "rgba(16, 22, 35, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.95rem" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
                {col.title}
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.05)", padding: "2px 6px", borderRadius: "10px" }}>
                  {colTasks.length}
                </span>
              </div>
              <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <Plus size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                  style={{
                    background: "rgba(26, 34, 52, 0.8)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "0.85rem",
                    cursor: "grab",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    {getPriorityBadge(task.priority)}
                  </div>
                  <h4 style={{ fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.4, marginBottom: "0.75rem" }}>
                    {task.title}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Clock size={12} /> {task.due}
                    </span>
                    <div style={{ width: "22px", height: "22px", borderRadius: "50%", background: "var(--accent-gradient)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={12} color="white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
