# TaskFlow Pro — Full-Stack Project Management SaaS

Production-style, enterprise-grade project management platform engineered as a modular monolith capable of horizontal scaling across multiple stateless backend instances.

---

## 🏗️ System Architecture

- **User Application (`/frontend`)**: Next.js App Router + TypeScript, modern glassmorphic dashboard, responsive Kanban boards, and authenticated workspace routing.
- **Backend API (`/backend`)**: Node.js LTS + Express + TypeScript structured with clear layers:
  - **Server Entry**: `server.ts` (lifecycle & graceful shutdown) & `app.ts` (middleware & routing)
  - **Middleware**: `middleware/` (authentication, RBAC authorization, Redis rate limiting, request tracing, Zod validation, centralized error handling)
  - **Routes**: `routes/` (versioned REST API `/api/v1`)
  - **Controllers**: `controllers/` (HTTP request handlers)
  - **Services**: `services/` (business logic, Argon2id hashing, token family rotation, multi-tenant workspace logic)
  - **Models**: `models/` (Drizzle ORM schema definitions, relations, and entity types)
- **Database**: PostgreSQL 17 with version-controlled Drizzle migrations, relational constraints, and indexes.
- **Shared Cache & Coordination**: Redis 7 for distributed atomic rate limiting, session token families, and cache-aside query caching.
- **Containerization & Orchestration**: Docker Compose and Kubernetes manifests with Horizontal Pod Autoscaler (HPA) and liveness/readiness health probes.

---

## 📁 Repository Structure

```
taskflow-pro/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Express application configuration
│   │   ├── server.ts              # Server startup & graceful shutdown
│   │   ├── cache/                 # Redis client & health probes
│   │   ├── config/                # Environment validation with Zod
│   │   ├── controllers/           # HTTP Request Controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── task.controller.ts
│   │   │   └── workspace.controller.ts
│   │   ├── db/                    # Drizzle migrations, schemas, & connection pool
│   │   ├── middleware/            # Security & routing middleware
│   │   │   ├── authenticate.ts    # JWT token verification
│   │   │   ├── authorize.ts       # Platform & Workspace RBAC
│   │   │   ├── error-handler.ts   # Centralized error mapping
│   │   │   ├── logger.ts          # Pino structured logging
│   │   │   ├── rate-limit.ts      # Redis-backed distributed rate limiting
│   │   │   ├── request-id.ts      # UUID request tracking
│   │   │   └── validate.ts        # Zod payload validation
│   │   ├── models/                # Schema models and entity types
│   │   ├── routes/                # Versioned REST routes (/api/v1)
│   │   │   ├── auth.routes.ts
│   │   │   ├── health.routes.ts
│   │   │   ├── project.routes.ts
│   │   │   ├── task.routes.ts
│   │   │   └── workspace.routes.ts
│   │   └── services/              # Business logic & authentication service
│   │       ├── auth.service.ts
│   │       ├── project.service.ts
│   │       ├── task.service.ts
│   │       └── workspace.service.ts
│   ├── tests/                     # Automated Vitest + Supertest integration tests
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js App Router (Auth, Dashboard, Landing)
│   │   ├── components/            # Reusable UI (Navbar, Sidebar, KanbanBoard)
│   │   └── lib/                   # API client with JWT session integration
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml             # Local multi-service infrastructure
├── .env.example                   # Environment variable template (No secrets!)
└── README.md
```

---

## 🔒 Security Design

- **Password Hashing**: Argon2id with memory cost 19 MiB and OWASP-recommended parameters.
- **JWT Session Security**: Short-lived access tokens (15m) + rotating refresh tokens stored in secure HttpOnly cookies.
- **Theft & Reuse Detection**: Tokens are grouped by `family_id`. If an already revoked token is used, the entire token family is immediately revoked.
- **RBAC Matrix**: Two distinct layers: Platform RBAC (e.g. `super_admin`) and Workspace RBAC (`owner`, `admin`, `member`, `viewer`).
- **Distributed Rate Limiting**: Atomic Redis counters prevent brute-force attacks across any number of backend replicas.
- **Secret Zero Leakage**: All `.env` and credential files are strictly excluded via `.gitignore`. Only `.env.example` templates are committed.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js LTS (>= 20)
- Docker Desktop or Docker Engine

### 2. Configure Environment
Copy `.env.example` to `.env` in both root and backend (these files remain git-ignored):
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 3. Start Infrastructure with Docker Compose
```bash
docker compose up -d postgres redis
```

### 4. Run Backend API
```bash
cd backend
npm install
npm run build
npm run dev
```

The API will be live on `http://localhost:8080`.
- Health Probes: `http://localhost:8080/health/live` & `http://localhost:8080/health/ready`
- API Index: `http://localhost:8080/api/v1`

### 5. Run Frontend Application
```bash
cd frontend
npm install
npm run dev
```

The Next.js app will be accessible at `http://localhost:3000`.

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

Automated Vitest test suites verify health probes, routes, 404 handlers, and security headers.

---

## 📜 License
MIT
