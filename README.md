# TechPotli Business OS

Full-stack CRM + ERP for TechPotli (leads, customers, projects, invoices, portal, and more).

## Start locally (quick)

**Easiest — one command (Windows):**

```powershell
cd techpotli-os
.\scripts\start-local.ps1
```

Or manually — **3 terminals** in order:

| # | Command | Folder |
|---|---------|--------|
| 1 | `npm run db:start` | `backend/` — keep open |
| 2 | `npm run start:dev` | `backend/` |
| 3 | `npm run dev` | `frontend/` |

**First time only** (in `backend/`):

```powershell
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
```

**Frontend first time:**

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

| What | URL |
|------|-----|
| App | http://localhost:3000 |
| API | http://localhost:3001/api |
| Health check | http://localhost:3001/api/health |

**Login:** `admin@techpotli.com` / `Admin@123`

---

## Full setup guide

Step-by-step instructions, troubleshooting, Redis/cron, and workflows:

**[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md)**

---

## Go live (production)

Deploy for your team with Docker, SSL, email, and backups:

**[docs/PRODUCTION_DEPLOYMENT.md](docs/PRODUCTION_DEPLOYMENT.md)**

Quick start on a VPS:

```bash
cp .env.production.example .env.production   # fill in secrets + domain
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

---

## Docker (full stack)

```powershell
cd techpotli-os
docker compose up --build
```

Open http://localhost — API docs at http://localhost/api/docs

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 15, Tailwind, Zustand, React Query |
| Backend | NestJS 10, Prisma, JWT, Socket.io |
| Events | Redpanda (Kafka-compatible) |
| AI | Ollama (lead scoring, email drafts, semantic search) |
| Search | PostgreSQL FTS + pgvector |
| Observability | Prometheus, Grafana, Pino, Swagger |
| Scale | Nginx load balancer, 2 API replicas, worker process |
| Database | PostgreSQL (embedded on port 5433) |
| Cache | Redis (optional, for cron jobs) |

---

## Project structure

```
techpotli-os/
  backend/     NestJS API + Prisma
  frontend/    Next.js dashboard + client portal
  docs/        Setup and guides
```
