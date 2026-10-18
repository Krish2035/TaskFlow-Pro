"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, Activity, LogOut, CheckCircle2 } from "lucide-react";
import { apiClient } from "@/lib/api-client";

export function Navbar() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("taskflow_access_token");
      setIsAuthenticated(!!token);
    }

    // Check backend health
    const checkHealth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "") || "http://localhost:8080";
        const res = await fetch(`${apiUrl}/health/live`);
        if (res.ok) {
          setApiOnline(true);
        }
      } catch {
        setApiOnline(false);
      }
    };
    checkHealth();
  }, []);

  const handleSignOut = async () => {
    try {
      await apiClient("/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout errors
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("taskflow_access_token");
      }
      setIsAuthenticated(false);
      router.push("/login");
    }
  };

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "1rem 2rem",
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 13, 20, 0.8)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              background: "var(--accent-gradient)",
              padding: "0.5rem",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={20} color="white" />
          </div>
          <Link href="/" style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            TaskFlow <span className="gradient-text">Pro</span>
          </Link>
        </div>

        {/* Live API Health indicator */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.75rem",
            padding: "0.2rem 0.6rem",
            borderRadius: "9999px",
            background: apiOnline ? "rgba(16, 185, 129, 0.12)" : "rgba(234, 179, 8, 0.12)",
            color: apiOnline ? "#34d399" : "#facc15",
            border: `1px solid ${apiOnline ? "rgba(16, 185, 129, 0.3)" : "rgba(234, 179, 8, 0.3)"}`,
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: apiOnline ? "#10b981" : "#eab308",
              boxShadow: apiOnline ? "0 0 6px #10b981" : "none",
            }}
          />
          {apiOnline ? "Backend Live" : "Connecting..."}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <Link
          href="/dashboard"
          style={{ fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}
        >
          <Activity size={16} /> Dashboard
        </Link>

        {isAuthenticated ? (
          <button
            onClick={handleSignOut}
            className="secondary-btn"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", padding: "0.45rem 1rem" }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        ) : (
          <>
            <Link href="/login" className="secondary-btn" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
              Sign In
            </Link>
            <Link href="/register" className="glow-btn" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
