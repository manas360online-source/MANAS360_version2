# MANAS360 AWS Lightsail Staging Setup (Step-by-Step)

This guide sets up **local development** and **AWS Lightsail staging** for:
- Frontend: React + TailwindCSS
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Auth: JWT + Cookies

---

## 1) Recommended Project / DevOps Structure

```text
/backend
/frontend
/devops
  /nginx
    nginx.conf
  /scripts
    deploy.sh
    seed.sh
  docker-compose.yml
/.github/workflows
  ci.yml
  staging-deploy.yml
/LIGHTSAIL.md
```

---

## 2) Local Development Setup

### Backend (localhost:5000)
1. Copy env template:
   - `cp backend/.env.local.example backend/.env.local`
2. Load values in `backend/.env.local`:
   - `DATABASE_URL=postgresql://manas360:manas360@localhost:5432/manas360`
   - `JWT_ACCESS_SECRET=...`
   - `JWT_REFRESH_SECRET=...`
   - `NODE_ENV=development`
   - `PORT=5000`
   - `FRONTEND_URL=http://localhost:5173`
3. Run backend:
   - `cd backend`
   - `npm ci`
   - `npx prisma generate`
   - `npx prisma migrate dev`
   - `npm run dev`

### Frontend (localhost:5173)
1. Copy env template:
   - `cp frontend/.env.local.example frontend/.env.local`
2. Ensure API URL is env-driven:
   - `VITE_API_BASE_URL=http://localhost:5000/api`
3. Run frontend:
   - `cd frontend`
   - `npm ci`
   - `npm run dev -- --port 3000`

### Local DB via Docker (optional)
- `docker compose -f devops/docker-compose.yml up -d`

---

## 3) Staging Environment Variables

### Backend staging env
1. Copy template:
   - `cp backend/.env.staging.example backend/.env.staging`
2. Fill real values:
   - `DATABASE_URL=...`
   - `JWT_ACCESS_SECRET=...`
   - `JWT_REFRESH_SECRET=...`
   - `NODE_ENV=staging`
   - `PORT=5000`
   - `FRONTEND_URL=https://staging.myapp.com`

### Frontend staging env
1. Copy template:
   - `cp frontend/.env.staging.example frontend/.env.staging`
2. Set:
   - `VITE_API_BASE_URL=https://staging.myapp.com/api`

> Do not commit secrets. Keep only `*.example` in git.

---

## 4) AWS Lightsail Provisioning (Ubuntu 22.04)

1. Create Lightsail instance (Ubuntu 22.04, static IP attached).
2. Point DNS:
   - `staging.myapp.com` → instance static IP
   - `api-staging.myapp.com` → same IP (optional separate API host)
3. Install base packages:
   - `sudo apt update && sudo apt -y upgrade`
   - `sudo apt -y install nginx git ufw postgresql postgresql-contrib`
4. Install Node.js LTS + PM2:
   - `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
   - `sudo apt -y install nodejs`
   - `sudo npm i -g pm2`
5. Prepare app directory:
   - `sudo mkdir -p /var/www/manas360`
   - `sudo chown -R $USER:$USER /var/www/manas360`
   - `cd /var/www/manas360 && git clone <your-repo> .`

---

## 5) PostgreSQL on Lightsail (Staging)

1. Create DB and user:
   - `sudo -u postgres psql`
   - `CREATE USER manas360 WITH PASSWORD 'CHANGE_ME';`
   - `CREATE DATABASE manas360_staging OWNER manas360;`
   - `\q`
2. Use DB URL in backend `.env.staging`:
   - `DATABASE_URL=postgresql://manas360:CHANGE_ME@localhost:5432/manas360_staging`

---

## 6) Nginx Reverse Proxy Setup

Use file: `devops/nginx/nginx.conf`

- `staging.myapp.com` serves React frontend from `/var/www/manas360/frontend/dist`
- `/api` proxies to backend at `127.0.0.1:5000`
- `api-staging.myapp.com` optionally proxies all requests to backend

Commands:
1. `sudo cp /var/www/manas360/devops/nginx/nginx.conf /etc/nginx/sites-available/manas360`
2. `sudo ln -sf /etc/nginx/sites-available/manas360 /etc/nginx/sites-enabled/manas360`
3. `sudo rm -f /etc/nginx/sites-enabled/default`
4. `sudo nginx -t && sudo systemctl reload nginx`

---

## 7) PM2 Setup (Backend Process)

1. Build backend first:
   - `cd /var/www/manas360/backend && npm ci && npm run build`
2. Start backend:
   - `pm2 start dist/server.js --name manas360-backend --time --log /var/log/backend.log`
3. Persist and enable startup:
   - `pm2 save`
   - `pm2 startup` (run printed command)

---

## 8) Health Check Endpoint

Health endpoint is available at:
- `GET /api/health`

Response:
```json
{
  "status": "ok",
  "server": "running"
}
```

---

## 9) Prisma Seeding for QA Testing

Seed command:
- `cd backend`
- `npx prisma db seed`

Seed script file:
- `backend/prisma/seed.js`

Generated users (role counts):
- 20 Patients
- 10 Therapists
- 5 Coaches
- 3 Psychiatrists
- 2 Admins

Includes test accounts:
- `free@demo.com` (Free)
- `basic@demo.com` (Basic)
- `premium@demo.com` (Premium)
- `patient@demo.com`
- `therapist@demo.com`
- `admin@demo.com`

Default password:
- `Demo@12345` (change via `SEED_DEFAULT_PASSWORD` env)

Also seeds:
- therapy sessions / appointments
- mood logs
- patient mood entries
- subscriptions
- notifications

---

## 10) Deployment Script (Staging)

Script: `devops/scripts/deploy.sh`

It runs:
1. `git pull` on `develop`
2. backend install/build/migrate
3. frontend install/build
4. PM2 restart
5. Nginx config test + reload

Make executable:
- `chmod +x devops/scripts/deploy.sh devops/scripts/seed.sh`

---

## 11) GitHub Actions CI/CD (develop branch)

Workflow file:
- `.github/workflows/staging-deploy.yml`

Trigger:
- Push to `develop`

Pipeline summary:
1. Build backend
2. Build frontend
3. SSH into Lightsail and run `./devops/scripts/deploy.sh`
4. Optional seed (`RUN_STAGING_SEED=true`) runs `./devops/scripts/seed.sh`

Required GitHub Secrets:
- `LIGHTSAIL_HOST`
- `LIGHTSAIL_USER`
- `LIGHTSAIL_SSH_KEY`

Optional GitHub Variable:
- `RUN_STAGING_SEED` (`true`/`false`)

---

## 12) Logging

Backend logs:
- `/var/log/backend.log`

Nginx logs:
- `/var/log/nginx/access.log`
- `/var/log/nginx/error.log`

PM2 inspect:
- `pm2 logs manas360-backend`

---

## 13) Security Hardening Checklist

1. HTTPS (Let’s Encrypt)
   - `sudo apt -y install certbot python3-certbot-nginx`
   - `sudo certbot --nginx -d staging.myapp.com -d api-staging.myapp.com`
2. UFW firewall
   - `sudo ufw allow OpenSSH`
   - `sudo ufw allow 'Nginx Full'`
   - `sudo ufw enable`
3. Disable root SSH login
   - Edit `/etc/ssh/sshd_config`: `PermitRootLogin no`
   - `sudo systemctl restart ssh`
4. Keep `.env.staging` restricted
   - `chmod 600 backend/.env.staging`
5. Keep Helmet enabled (already active in backend app).

---

## 14) Local ↔ Staging Connection Model

- Local frontend calls local backend using `VITE_API_BASE_URL=http://localhost:5000/api`.
- Staging frontend calls staging backend using `VITE_API_BASE_URL=https://staging.myapp.com/api`.
- Backend API prefix remains `/api` in both environments.
- Same codebase, different env files and deployment target.

---

## 15) Best Practices: Staging vs Production

1. Keep separate DBs and env secrets.
2. Never seed production with QA data.
3. Protect staging with IP allow-list/basic auth if needed.
4. Use branch-based deploy (`develop` → staging, `main` → production).
5. Add rollback plan (`git checkout <last-good-tag>` + `deploy.sh`).
6. Add backup policy for Postgres before migrations.
7. Use monitoring/alerts on `/api/health` and PM2 process status.

---

## 16) Quick Validation Commands

On Lightsail:
- `curl -sS https://staging.myapp.com/api/health`
- `pm2 status`
- `sudo nginx -t`
- `cd /var/www/manas360/backend && npx prisma migrate status`

Expected outcome:
- Frontend loads at staging URL.
- API responds under `/api`.
- Seeded QA users can log in and see realistic dashboard data.
