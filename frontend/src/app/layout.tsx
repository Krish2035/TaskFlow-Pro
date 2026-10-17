import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskFlow Pro — Production Project Management SaaS",
  description: "Enterprise-grade scalable project and team workspace orchestrator built with Next.js, Express, PostgreSQL, and Redis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
