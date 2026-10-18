"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Clock,
  User,
  Trash2,
  AlertCircle,
  RefreshCw,
  Paperclip,
  X,
  Upload,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";

export interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  status: "todo" | "in_progress" | "in_review" | "done" | "archived";
  priority: "low" | "medium" | "high" | "urgent";
  version: number;
  dueAt?: string | null;
  createdAt: string;
  attachmentsCount?: number;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  storageProvider: string;
  createdAt: string;
}

interface KanbanBoardProps {
  projectId?: string;
  onStatsUpdate?: (stats: { total: number; inProgress: number; completed: number; todo: number }) => void;
  refreshTrigger?: number;
}

const columns: { id: TaskItem["status"]; title: string; color: string }[] = [
  { id: "todo", title: "To Do", color: "var(--status-todo)" },
  { id: "in_progress", title: "In Progress", color: "var(--status-progress)" },
  { id: "in_review", title: "Review", color: "var(--status-review)" },
  { id: "done", title: "Completed", color: "var(--status-done)" },
];

export function KanbanBoard({ projectId, onStatsUpdate, refreshTrigger = 0 }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [activeQuickAddCol, setActiveQuickAddCol] = useState<string | null>(null);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPriority, setQuickPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [submittingQuick, setSubmittingQuick] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Task Details & Attachments Modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Fetch real tasks from backend API
  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ data: TaskItem[] }>(`/projects/${projectId}/tasks?limit=100`);
      const fetchedTasks = res.data || [];
      setTasks(fetchedTasks);

      if (onStatsUpdate) {
        const inProgress = fetchedTasks.filter((t) => t.status === "in_progress" || t.status === "in_review").length;
        const completed = fetchedTasks.filter((t) => t.status === "done").length;
        const todo = fetchedTasks.filter((t) => t.status === "todo").length;
        onStatsUpdate({
          total: fetchedTasks.length,
          inProgress,
          completed,
          todo,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load tasks from server");
    } finally {
      setLoading(false);
    }
  }, [projectId, onStatsUpdate]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  // Real-Time WebSocket Connection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:8080/ws`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => setWsConnected(true);

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "TASK_MOVED" && data.taskId) {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === data.taskId ? { ...t, status: data.newStatus, version: (t.version || 1) + 1 } : t
              )
            );
            setHighlightedTaskId(data.taskId);
            setTimeout(() => setHighlightedTaskId(null), 1800);
          } else if (data.type === "TASK_CREATED" && data.taskId) {
            fetchTasks();
          } else if (data.type === "TASK_DELETED" && data.taskId) {
            setTasks((prev) => prev.filter((t) => t.id !== data.taskId));
          }
        } catch {
          // Ignore invalid WS payload
        }
      };

      socket.onclose = () => setWsConnected(false);
      socket.onerror = () => setWsConnected(false);
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchTasks]);

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

  const handleDrop = async (newStatus: TaskItem["status"], e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousStatus = task.status;
    const currentVersion = task.version;

    // 1. Optimistic Update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await apiClient<{ data: TaskItem }>(`/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          version: currentVersion,
        }),
      });

      if (res.data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, ...res.data } : t))
        );
      }
    } catch (err: any) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
      );

      if (err instanceof ApiError && err.status === 409) {
        setConflictWarning(
          `Concurrency Conflict on "${task.title}": Another teammate just modified this task! Reloading latest database version.`
        );
        fetchTasks();
      } else {
        setError(err.message || "Failed to update task on backend");
      }
    }
  };

  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to move this task to trash?")) return;

    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await apiClient(`/tasks/${taskId}`, { method: "DELETE" });
    } catch (err: any) {
      setTasks(previousTasks);
      setError(err.message || "Failed to delete task from server");
    }
  };

  const handleQuickAdd = async (status: TaskItem["status"]) => {
    if (!quickTitle.trim() || !projectId) return;
    setSubmittingQuick(true);
    try {
      const res = await apiClient<{ data: TaskItem }>(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: quickTitle.trim(),
          status,
          priority: quickPriority,
        }),
      });

      if (res.data) {
        setTasks((prev) => [res.data, ...prev]);
        setQuickTitle("");
        setActiveQuickAddCol(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create task on backend");
    } finally {
      setSubmittingQuick(false);
    }
  };

  // Open Task Details & Fetch Attachments
  const handleOpenTaskDetails = async (task: TaskItem) => {
    setSelectedTask(task);
    setLoadingAttachments(true);
    try {
      const res = await apiClient<{ data: TaskAttachment[] }>(`/tasks/${task.id}/attachments`);
      setAttachments(res.data || []);
    } catch {
      setAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  // Upload file attachment
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const token = typeof window !== "undefined" ? localStorage.getItem("taskflow_access_token") : null;

      const res = await fetch(`${API_BASE_URL}/tasks/${selectedTask.id}/attachments`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "File upload failed");
      }

      if (data.data) {
        setAttachments((prev) => [data.data, ...prev]);
      }
    } catch (err: any) {
      alert(err.message || "Failed to upload file");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete attachment
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!selectedTask || !confirm("Delete this attachment?")) return;
    try {
      await apiClient(`/tasks/${selectedTask.id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err: any) {
      alert(err.message || "Failed to delete attachment");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!projectId) {
    return (
      <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <p>No project selected. Create or select a project above to view its Kanban board.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Real-time Status & Alert Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: wsConnected ? "#10b981" : "#eab308",
              boxShadow: wsConnected ? "0 0 8px #10b981" : "none",
            }}
          />
          <span style={{ fontSize: "0.8rem", color: wsConnected ? "#34d399" : "#facc15" }}>
            {wsConnected ? "Live Multiplayer Sync Active" : "Connecting Real-Time Socket..."}
          </span>
        </div>

        <button
          onClick={fetchTasks}
          disabled={loading}
          className="secondary-btn"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}
        >
          <RefreshCw size={13} className={loading ? "spin" : ""} /> Refresh Board
        </button>
      </div>

      {conflictWarning && (
        <div
          style={{
            background: "rgba(234, 179, 8, 0.15)",
            border: "1px solid rgba(234, 179, 8, 0.35)",
            color: "#fde047",
            padding: "0.85rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.85rem",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} /> {conflictWarning}
          </span>
          <button
            onClick={() => setConflictWarning(null)}
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontWeight: 700 }}
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#fca5a5",
            padding: "0.85rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Columns Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          const isQuickAdding = activeQuickAddCol === col.id;

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(col.id, e)}
              className="glass-panel"
              style={{
                padding: "1rem",
                minHeight: "480px",
                background: "rgba(16, 22, 35, 0.65)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {/* Column Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.95rem" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
                  {col.title}
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255, 255, 255, 0.05)", padding: "2px 7px", borderRadius: "10px" }}>
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setActiveQuickAddCol(isQuickAdding ? null : col.id)}
                  title="Add task to column"
                  style={{
                    background: isQuickAdding ? "rgba(99, 102, 241, 0.2)" : "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "4px",
                  }}
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Inline Quick Add Form */}
              {isQuickAdding && (
                <div style={{ background: "rgba(255, 255, 255, 0.04)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-glow)" }}>
                  <input
                    type="text"
                    placeholder="Task title..."
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleQuickAdd(col.id);
                    }}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      borderRadius: "6px",
                      background: "rgba(10, 13, 20, 0.8)",
                      border: "1px solid var(--border-subtle)",
                      color: "white",
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <select
                      value={quickPriority}
                      onChange={(e) => setQuickPriority(e.target.value as any)}
                      style={{
                        padding: "0.3rem 0.5rem",
                        borderRadius: "4px",
                        background: "rgba(10, 13, 20, 0.8)",
                        border: "1px solid var(--border-subtle)",
                        color: "white",
                        fontSize: "0.75rem",
                      }}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>

                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        onClick={() => setActiveQuickAddCol(null)}
                        style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleQuickAdd(col.id)}
                        disabled={submittingQuick || !quickTitle.trim()}
                        className="glow-btn"
                        style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}
                      >
                        {submittingQuick ? "Adding..." : "Add"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
                {loading && tasks.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                    Loading tasks...
                  </div>
                ) : colTasks.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", border: "1px dashed rgba(255,255,255,0.06)", borderRadius: "8px" }}>
                    No tasks in {col.title}
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isHighlighted = highlightedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        draggable
                        onClick={() => handleOpenTaskDetails(task)}
                        onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}
                        style={{
                          background: isHighlighted ? "rgba(99, 102, 241, 0.25)" : "rgba(26, 34, 52, 0.85)",
                          border: isHighlighted ? "1px solid #818cf8" : "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          padding: "0.85rem",
                          cursor: "pointer",
                          boxShadow: isHighlighted ? "0 0 16px rgba(99, 102, 241, 0.4)" : "none",
                          transform: isHighlighted ? "scale(1.02)" : "none",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          {getPriorityBadge(task.priority)}
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <button
                              onClick={(e) => handleDeleteTask(task.id, e)}
                              title="Move to Trash"
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "2px",
                                opacity: 0.6,
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                              onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h4 style={{ fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.4, marginBottom: "0.5rem", color: "#f8fafc" }}>
                          {task.title}
                        </h4>

                        {task.description && (
                          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.3 }}>
                            {task.description}
                          </p>
                        )}

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                              <Clock size={12} /> v{task.version}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", color: "var(--accent-primary)" }}>
                              <Paperclip size={12} /> Files
                            </span>
                          </span>
                          <div
                            style={{
                              width: "22px",
                              height: "22px",
                              borderRadius: "50%",
                              background: "var(--accent-gradient)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <User size={12} color="white" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* TASK DETAILS & FILE ATTACHMENTS MODAL */}
      {selectedTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "1rem" }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", background: "#101623", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.4rem" }}>
                  {getPriorityBadge(selectedTask.priority)}
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Status: {selectedTask.status.replace("_", " ").toUpperCase()}</span>
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, color: "white" }}>{selectedTask.title}</h3>
              </div>
              <button onClick={() => setSelectedTask(null)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            {selectedTask.description && (
              <div style={{ padding: "0.85rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border-subtle)", fontSize: "0.85rem", color: "#cbd5e1", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                {selectedTask.description}
              </div>
            )}

            {/* Cloud Storage & File Attachments */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.95rem" }}>
                  <Paperclip size={18} color="var(--accent-primary)" />
                  File Attachments (Cloud Storage / S3)
                </div>

                <label className="secondary-btn" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.35rem 0.75rem", cursor: "pointer" }}>
                  <Upload size={14} /> {uploadingFile ? "Uploading..." : "Attach File"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    style={{ display: "none" }}
                  />
                </label>
              </div>

              {loadingAttachments ? (
                <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Loading attached files...
                </div>
              ) : attachments.length === 0 ? (
                <div style={{ border: "1px dashed rgba(255,255,255,0.1)", borderRadius: "8px", padding: "1.75rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No files attached yet. Click &quot;Attach File&quot; to upload diagrams, screenshots, or project specs.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {attachments.map((file) => {
                    const isImg = file.mimeType.startsWith("image/");
                    return (
                      <div
                        key={file.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem 1rem",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", overflow: "hidden" }}>
                          {isImg ? <ImageIcon size={20} color="#818cf8" /> : <FileText size={20} color="#38bdf8" />}
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "white", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "260px" }}>
                              {file.fileName}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {formatFileSize(file.fileSize)} · Provider: {file.storageProvider}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <a
                            href={file.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="secondary-btn"
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}
                          >
                            <ExternalLink size={12} /> View
                          </a>
                          <button
                            onClick={() => handleDeleteAttachment(file.id)}
                            style={{ background: "transparent", border: "none", color: "#f87171", cursor: "pointer", padding: "4px" }}
                            title="Delete File"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <button onClick={() => setSelectedTask(null)} className="secondary-btn">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
