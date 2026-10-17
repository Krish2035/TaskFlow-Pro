import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Shield, Cpu, RefreshCw, Database, Terminal, ArrowRight, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />

      {/* Hero Section */}
      <section style={{
        padding: "6rem 2rem 4rem",
        textAlign: "center",
        maxWidth: "1000px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.5rem",
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.4rem 1rem",
          borderRadius: "9999px",
          background: "rgba(99, 102, 241, 0.12)",
          border: "1px solid rgba(99, 102, 241, 0.25)",
          color: "#818cf8",
          fontSize: "0.85rem",
          fontWeight: 500,
        }}>
          <Cpu size={15} /> Production-Ready Modular Monolith & Kubernetes Scalable Architecture
        </div>

        <h1 style={{
          fontSize: "3.5rem",
          lineHeight: 1.15,
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}>
          Orchestrate Projects with <br />
          <span className="gradient-text">High-Performance Precision</span>
        </h1>

        <p style={{
          fontSize: "1.2rem",
          color: "var(--text-muted)",
          maxWidth: "680px",
          lineHeight: 1.6,
        }}>
          TaskFlow Pro gives your engineering and product teams real-time workspace coordination,
          distributed Redis rate limits, strict RBAC authorization, and automated Kubernetes scaling.
        </p>

        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <Link href="/dashboard" className="glow-btn" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.85rem 1.75rem", fontSize: "1rem" }}>
            Open Dashboard <ArrowRight size={18} />
          </Link>
          <Link href="/register" className="secondary-btn" style={{ padding: "0.85rem 1.75rem", fontSize: "1rem" }}>
            Create Workspace
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{
        padding: "4rem 2rem",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.5rem",
        width: "100%",
      }}>
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ background: "rgba(99, 102, 241, 0.2)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Shield size={22} color="var(--accent-primary)" />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Enterprise Auth & RBAC</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Argon2id password hashing, rotating refresh token families with theft detection, and hierarchical role-based permissions.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ background: "rgba(59, 130, 246, 0.2)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <RefreshCw size={22} color="#3b82f6" />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>Distributed Redis State</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Sliding window rate limiters and cache-aside query acceleration that stay atomic across all backend replicas.
          </p>
        </div>

        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ background: "rgba(168, 85, 247, 0.2)", width: "42px", height: "42px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <Database size={22} color="#a855f7" />
          </div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>PostgreSQL & Drizzle ORM</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
            Strong relational schemas, automated migrations, comprehensive indexes, and optional read-replica query routing.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: "auto",
        borderTop: "1px solid var(--border-subtle)",
        padding: "2rem",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "0.85rem",
      }}>
        © 2026 TaskFlow Pro — Engineered for Performance, Security, and Cloud Scalability.
      </footer>
    </div>
  );
}
