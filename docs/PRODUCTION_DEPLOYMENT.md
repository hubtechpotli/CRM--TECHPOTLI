# TechPotli CRM — Go Live (Production Deployment)

This guide walks you through launching **TechPotli Business OS** for your team’s daily use.

For local development, see [LOCAL_SETUP.md](./LOCAL_SETUP.md).

---

## What you need before going live

| Item | Example | Why |
|------|---------|-----|
| **Domain** | `crm.techpotli.com` | Team opens CRM in browser |
| **VPS / cloud server** | 4 GB RAM, 2 vCPU, Ubuntu 22.04 | Runs Docker containers |
| **PostgreSQL** | Included in Docker stack | All CRM data |
| **Redis** | Included in Docker stack | Notifications, cron jobs |
| **AWS S3 bucket** | `techpotli-crm-files` | Invoice PDFs, uploads (required for production) |
| **Resend account** | [resend.com](https://resend.com) | Send invoices & customer emails |
| **SSL certificate** | Let’s Encrypt (free) | HTTPS — required for security |

**Minimum server:** 4 GB RAM · 40 GB disk · Ubuntu 22.04 LTS

---

## Pre-launch checklist

Complete these **before** pointing your domain:

- [ ] Generate strong secrets (JWT + encryption + DB password)
- [ ] Set up AWS S3 bucket and IAM user with S3 access
- [ ] Verify domain on Resend and set `RESEND_FROM_EMAIL=support@techpotli.com`
- [ ] Point DNS `A` record → your server IP (e.g. `crm.techpotli.com → 203.0.113.10`)
- [ ] Change default admin password after first login (required on first login)
- [ ] Add your office IP in **Settings → Allowed IPs** (required for office-only login)
- [ ] Enable **Work from home** only for remote employees (Employees → edit)
- [ ] Confirm HTTPS is active (required for secure session cookies)
- [ ] Set `METRICS_API_KEY` if exposing metrics endpoint

---

## Step 1 — Prepare the server

SSH into your VPS:

```bash
ssh root@YOUR_SERVER_IP
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in so docker group applies
```

Install Docker Compose plugin:

```bash
sudo apt update && sudo apt install -y docker-compose-plugin git
```

Clone or upload your project:

```bash
git clone YOUR_REPO_URL /opt/techpotli-os
cd /opt/techpotli-os
```

---

## Step 2 — Configure production environment

```bash
cp .env.production.example .env.production
nano .env.production
```

**Generate secrets** (run on your PC or server):

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run three times — use outputs for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `ENCRYPTION_KEY`.

**Set your domain** (example):

```env
FRONTEND_URL=https://crm.techpotli.com
BACKEND_URL=https://crm.techpotli.com/api
PUBLIC_API_URL=https://crm.techpotli.com/api
PUBLIC_WS_URL=https://crm.techpotli.com
POSTGRES_PASSWORD=your-strong-db-password
```

Fill in Resend and AWS S3 credentials.

---

## Step 3 — Build and start (production stack)

The production compose file runs only what your team needs daily:

- PostgreSQL · Redis · API · Worker (cron) · Frontend · Nginx

```bash
cd /opt/techpotli-os
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Wait ~2 minutes, then check:

```bash
docker compose -f docker-compose.prod.yml ps
curl http://localhost/api/health
```

Expected: `{"status":"ok"}`

---

## Step 4 — Seed the database (first time only)

Creates admin user and default settings:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma db seed
```

Default login (change immediately):

| Email | Password |
|-------|----------|
| `admin@techpotli.com` | `Admin@123` |

---

## Step 5 — Enable HTTPS (SSL)

### Option A — Caddy (easiest, auto SSL)

Install Caddy on the host (not in Docker):

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

Stop nginx from binding port 80 publicly — change `HTTP_PORT=8080` in `.env.production`, restart stack, then Caddyfile:

```
crm.techpotli.com {
    reverse_proxy localhost:8080
}
```

```bash
sudo systemctl reload caddy
```

### Option B — Certbot + Nginx on host

Point nginx/Certbot at port 80 on the host and reverse-proxy to Docker `HTTP_PORT`.

---

## Step 6 — Post-launch setup (do on day 1)

1. **Log in** at `https://crm.techpotli.com`
2. **Change admin password** — you will be prompted on first login (seed default must be changed)
3. **Set up 2FA** — mandatory for all users; scan QR code and save backup codes
4. **Company settings** → Settings → fill company name, GST, address
5. **Office IP whitelist** → Settings → Allowed IPs → add your office CIDR (e.g. `203.0.113.0/24`)
6. **Remote employees** → Employees → edit → enable **Work from home** (requires 2FA enabled)
7. **Add employees** → Employees → invite your sales & delivery team (each must complete 2FA on first login)
8. **Review active sessions** → Settings → Security → Active sessions
9. **Test email** → send a test invoice or customer email from the CRM
10. **Test notifications** → open CRM in two browsers; create a team update and confirm live toast

### Auth security checklist

Complete these before giving access to the full team:

- [ ] HTTPS enabled (Let's Encrypt / Caddy) — required for `Secure` httpOnly cookies
- [ ] Default admin password changed and 2FA enrolled
- [ ] Office CIDRs added in Settings → Allowed IPs
- [ ] WFH toggle enabled only for employees who need remote access
- [ ] Every user completes 2FA setup on first login
- [ ] Logout revokes session immediately (test in two browsers)
- [ ] Login blocked from non-office IP for non-WFH users
- [ ] `METRICS_API_KEY` set if `/api/metrics` is reachable externally
- [ ] Strong JWT secrets set (not defaults from `.env.production.example`)

**How login security works:**

| User type | IP requirement | 2FA |
|-----------|----------------|-----|
| Office staff (default) | Must match Allowed IPs | Required |
| WFH (`allowRemoteAccess`) | Any IP | Required |
| Admin with fixed home IP | User `allowedIPs` or office CIDR | Required |

Refresh tokens are stored in **httpOnly Secure cookies** (not localStorage). Access tokens expire in 15 minutes and are bound to an active server session — logout is instant.

---

## Step 7 — Daily operations for your team

| Task | Who | Where in CRM |
|------|-----|--------------|
| Add / follow up leads | Sales | Leads |
| Log calls & activities | Sales | Lead detail → Activity |
| Convert to customer | Sales | Lead → Convert to Client |
| Team work items | Everyone | Team Updates / Customer → Team Work |
| Create invoice & send | Admin | Invoices |
| Payment reminders | Admin | Customer → Send email |
| Project tracking | Delivery | Projects |

**Recommended roles:**

| Role | Access |
|------|--------|
| EMPLOYEE | Leads, Customers, Projects, Support, Team Updates |
| ADMIN | + Invoices, Quotations, Payments, Reports, Employees |
| SUPER_ADMIN | + Settings, Approvals, Expenses |

---

## Updating after code changes

```bash
cd /opt/techpotli-os
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Migrations run automatically when the API container starts.

---

## Backups (important)

**Database backup daily:**

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U techpotli techpotli_os > backup-$(date +%F).sql
```

Copy `backup-*.sql` to safe storage (S3, Google Drive, etc.).

**Restore:**

```bash
cat backup-2026-06-08.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U techpotli techpotli_os
```

---

## Troubleshooting

### Login shows “Network Error”

- Check API: `curl https://crm.techpotli.com/api/health`
- Verify `PUBLIC_API_URL` in `.env.production` matches your domain
- Rebuild frontend after URL change: `docker compose ... up -d --build frontend`

### Emails not sending

- Confirm `RESEND_API_KEY` and verified domain in Resend dashboard
- Check API logs: `docker compose -f docker-compose.prod.yml logs api`

### PDF / file upload fails

- Configure AWS S3 env vars — local disk storage does not work with multiple servers
- Verify bucket name and IAM permissions

### Notifications / live updates not working

- Ensure `PUBLIC_WS_URL` is set to your domain (no `/api` suffix)
- Nginx must proxy `/socket.io/` — included in `nginx/nginx.prod.conf`

### “Access only from office network”

- Add your current IP or office CIDR in Settings → Allowed IPs
- For remote workers: Employees → edit → enable **Work from home** (2FA must be on)
- If locked out with no office IPs configured, add CIDR via database:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U techpotli techpotli_os \
  -c "INSERT INTO \"AllowedOfficeIp\" (id, cidr, label, \"isActive\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), 'YOUR.IP.HERE/32', 'Emergency', true, NOW(), NOW());"
```

### Session / login issues after security update

- Clear browser cookies for your domain and log in again
- Ensure `PUBLIC_API_URL` uses HTTPS in production (cookies require `Secure`)
- Frontend must send credentials: API client uses `withCredentials: true` for refresh

### Stay logged in after page refresh (Vercel + Railway)

When the frontend and API are on **different domains**, the refresh cookie may not be sent. Use the built-in Next.js API proxy:

| Variable | Platform | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Vercel | `/api` |
| `API_PROXY_TARGET` | Vercel | `https://your-api.up.railway.app` |
| `FRONTEND_URL` | Railway | `https://your-app.vercel.app` (no trailing slash) |

Redeploy Vercel after setting env vars. The browser then calls `/api/*` on the same domain as the app, and the refresh cookie persists for **7 days per browser**.

**Optional backend cookie overrides** (Railway):

```env
COOKIE_SAME_SITE=lax
COOKIE_SECURE=true
```

Use `COOKIE_SAME_SITE=none` only if you cannot use the proxy and frontend/API hosts differ.

### Add allowed office IP (e.g. remote worker)

**Settings → Allowed office IPs** → CIDR `152.56.178.15/32`

Or run on production DB immediately:

```sql
INSERT INTO "AllowedOfficeIp" (id, cidr, label, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), '152.56.178.15/32', 'Ravi / Remote', true, NOW(), NOW());
```

`npm run db:seed` also seeds `127.0.0.1/32` and `152.56.178.15/32` on fresh databases.

### Cookie verification checklist

After login, open DevTools → Application → Cookies:

| Check | Expected |
|-------|----------|
| Cookie name | `refreshToken` |
| Domain | Same as your frontend URL |
| Path | `/api` |
| Secure | Yes (HTTPS) |
| SameSite | `Lax` (same-origin proxy) or `None` (split-origin) |
| HttpOnly | Yes |

Test: login → press F5 on dashboard → should remain logged in. A different browser should require login again.

---

## Alternative: deploy without Docker

If you prefer manual setup on a VPS:

```bash
# Backend
cd backend && npm ci && npm run build
npm run db:migrate && npm run db:seed
NODE_ENV=production npm run start:prod

# Worker (separate terminal / PM2 process)
NODE_ENV=production ENABLE_CRON_JOBS=true npm run start:worker

# Frontend
cd frontend && npm ci && npm run build
NEXT_PUBLIC_API_URL=https://crm.techpotli.com/api npm start
```

Use **PM2** or **systemd** to keep processes running. Put Nginx/Caddy in front for SSL.

---

## Security summary (production)

| Item | Status |
|------|--------|
| Strong JWT secrets enforced on startup | ✅ |
| Session-bound access tokens (instant logout) | ✅ |
| Refresh tokens in httpOnly Secure cookies | ✅ |
| Mandatory 2FA for all users | ✅ |
| Office IP enforcement at login (WFH exception) | ✅ |
| Auth rate limits (login / 2FA / refresh) | ✅ |
| Refresh token reuse detection | ✅ |
| Swagger disabled in production | ✅ |
| WebSocket CORS restricted to your domain | ✅ |
| Security headers on frontend (X-Frame-Options, etc.) | ✅ |
| `/health` minimal public; details admin-only | ✅ |
| `/metrics` protected by `METRICS_API_KEY` | ✅ |
| HTTPS required (via Caddy/Certbot) | You configure |
| Office IPs + WFH toggles configured | You configure |
| Default admin password changed + 2FA enrolled | You configure |
| S3 for file storage | You configure |
| Database backups scheduled | You configure |

---

## Quick reference

```bash
# Start
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Stop
docker compose -f docker-compose.prod.yml down

# Logs
docker compose -f docker-compose.prod.yml logs -f api

# Health
curl https://crm.techpotli.com/api/health
```

**Support:** If health check fails, read `docker compose logs api` first — usually database connection or missing env var.
