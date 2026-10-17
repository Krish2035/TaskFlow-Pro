"use client";

import Link from "next/link";
import { Layers, Activity, ShieldCheck, User } from "lucide-react";

export function Navbar() {
  return (
    <nav style={{
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
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          background: "var(--accent-gradient)",
          padding: "0.5rem",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Layers size={20} color="white" />
        </div>
        <Link href="/" style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
          TaskFlow <span className="gradient-text">Pro</span>
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link href="/dashboard" style={{ fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Activity size={16} /> Dashboard
        </Link>
        <Link href="/login" className="secondary-btn" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
          Sign In
        </Link>
        <Link href="/register" className="glow-btn" style={{ fontSize: "0.85rem", padding: "0.45rem 1rem" }}>
          Get Started
        </Link>
      </div>
    </nav>
  );
}
