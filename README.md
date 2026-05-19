# ChickAudit 🐔

A digital audit management system for a small family poultry farm. Replaces manual notebooks with a clean web application that tracks daily egg production, sales, expenses, and flock health — with every entry attributed to the person who recorded it.

Built to work for a 200-chicken, 3-person operation today, and designed to grow as the farm expands.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [User Roles](#user-roles)
- [Growth Path](#growth-path)

---

## Overview

ChickAudit is a Progressive Web App (PWA) — it works in any browser on desktop, tablet, or phone, and can be installed on a phone's home screen like a native app. The owner gets a full dashboard with charts and summaries. Employees get simple forms for daily data entry.

**The problem it solves:** manual record-keeping in notebooks leads to missing records, calculation errors, and no visibility into profit/loss. ChickAudit makes every transaction timestamped, attributed, and instantly reportable.

---

## Tech Stack

### Frontend (`chickaudit-client`)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, file-based routing, PWA-ready |
| Language | TypeScript | Type safety across the whole app |
| Styling | Tailwind CSS + shadcn/ui | Consistent design system, accessible components |
| Charts | Recharts | Lightweight bar/line charts for the dashboard |
| Fonts | DM Sans + DM Serif Display | Warm, readable, distinctive |
| HTTP | Native `fetch` with JWT | Simple wrapper in `lib/api.ts` |
| Auth state | React Context | JWT stored in `localStorage` |

### Backend (`chickaudit-server`)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js | Matches frontend language, large ecosystem |
| Framework | Express 4 | Minimal, full control, easy to extend |
| Database | PostgreSQL | Reliable, relational, matches the schema |
| DB client | `pg` (node-postgres) | Direct SQL, no ORM abstraction |
| Auth | JWT (`jsonwebtoken`) | Stateless, works well with a PWA |
| Passwords | `bcrypt` | Industry-standard hashing |
| Validation | `zod` | Schema validation on every request body |
| Dev server | `nodemon` | Auto-restarts on file changes |

### Infrastructure

| Purpose | Service | Cost |
|---|---|---|
| Frontend hosting | Vercel | Free |
| Backend hosting | Railway | ~$0–5/month at this scale |
| Database | Railway (PostgreSQL plugin) | Included with backend |

---

## Project Structure

```
chickaudit/
├── chickaudit-client/          ← Next.js frontend (deploy to Vercel)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx      ← Auth layout (no sidebar)
│   │   │   └── login/
│   │   │       └── page.tsx    ← Login page
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        ← KPI cards, egg chart, recent entries
│   │   ├── daily-log/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        ← Daily egg/feed/death entry form + history
│   │   ├── sales/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        ← Sales entry form + list
│   │   ├── expenses/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        ← Expense entry form + list
│   │   ├── health/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx        ← Health event log + history
│   │   ├── globals.css         ← Tailwind base + CSS variables + fonts
│   │   ├── layout.tsx          ← Root layout (fonts, Toaster)
│   │   └── page.tsx            ← Redirects to /dashboard
│   ├── components/
│   │   ├── app/
│   │   │   ├── sidebar.tsx     ← Navigation sidebar with user info
│   │   │   └── app-shell.tsx   ← Auth guard + layout wrapper
│   │   └── ui/                 ← shadcn/ui components
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       └── toaster.tsx     ← Toast notifications + useToast hook
│   ├── lib/
│   │   ├── api.ts              ← Fetch wrapper (attaches JWT, handles 401)
│   │   ├── auth-context.tsx    ← AuthProvider, useAuth hook
│   │   └── utils.ts            ← cn(), formatETB(), formatDate()
│   ├── types/
│   │   └── index.ts            ← TypeScript types matching DB schema
│   ├── public/
│   │   └── manifest.json       ← PWA manifest (installable on phone)
│   ├── .env.example
│   ├── components.json         ← shadcn config
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
└── chickaudit-server/          ← Express backend (deploy to Railway)
    ├── src/
    │   ├── db/
    │   │   ├── pool.js         ← PostgreSQL connection pool
    │   │   ├── migrate.js      ← Migration runner
    │   │   ├── seed.js         ← Creates initial user accounts
    │   │   └── migrations/
    │   │       └── 001_initial_schema.sql
    │   ├── middleware/
    │   │   ├── auth.js         ← requireAuth, requireOwner JWT guards
    │   │   └── validate.js     ← Zod schema validation middleware
    │   ├── routes/
    │   │   ├── auth.js         ← POST /auth/login, GET /auth/me
    │   │   ├── dashboard.js    ← GET /dashboard (all KPIs in one call)
    │   │   ├── dailyLogs.js    ← GET/POST/PUT/DELETE /daily-logs
    │   │   ├── sales.js        ← GET/POST/PUT/DELETE /sales
    │   │   ├── expenses.js     ← GET/POST/PUT/DELETE /expenses
    │   │   ├── health.js       ← GET/POST/PUT/DELETE /health
    │   │   └── users.js        ← GET/POST /users, PUT /users/:id/password
    │   └── index.js            ← Express app entry point
    ├── .env.example
    ├── .gitignore
    ├── Procfile                ← Railway process declaration
    └── package.json
```

---

## Features

### Dashboard
- Today's egg count vs yesterday (with trend indicator)
- Month-to-date revenue, expenses, and net profit/loss
- Active flock count (calculated from starting count minus all recorded deaths)
- 7-day egg production bar chart
- Unified feed of recent entries across all modules (sales, expenses, logs, health)

### Daily Log
- One entry per day recording eggs collected, feed given (kg), and deaths
- Notes field for observations
- Full scrollable history with the recording employee's name
- Duplicate prevention — shows a clear error if a log for that date already exists

### Sales
- Records egg tray sales and broiler sales separately
- Optional buyer name for tracking which market or customer
- Month-to-date revenue total shown at the top of the page

### Expenses
- Categorized entries: feed, medicine, vaccine, employee wage, utilities, equipment, other
- Optional supplier name
- Month-to-date total shown at the top

### Health Events
- Five event types: death, vet visit, vaccination, illness, recovery
- Free-text details field
- Color-coded badges (red for death/illness, green for vaccination/recovery)
- Monthly death count shown at the top

### Access Control
- Every entry is stamped with the date and the name of the person who recorded it
- Employees can only edit their own entries
- Only the owner can delete any record
- Only the owner can create new user accounts

---

## Database Schema

Five tables. All use UUID primary keys and `timestamptz` created_at for full audit trails.

```
users
├── id           uuid PK
├── full_name    text
├── email        text UNIQUE
├── password     text (bcrypt hash)
├── role         text ('owner' | 'employee')
└── created_at   timestamptz

daily_logs
├── id               uuid PK
├── logged_by        uuid → users.id
├── log_date         date UNIQUE  ← one per day
├── eggs_collected   int
├── feed_given_kg    numeric
├── deaths           int
├── notes            text (nullable)
└── created_at       timestamptz

sales
├── id            uuid PK
├── recorded_by   uuid → users.id
├── sale_date     date
├── type          text ('eggs' | 'broiler')
├── quantity      numeric
├── amount_etb    numeric
├── buyer         text (nullable)
└── created_at    timestamptz

expenses
├── id             uuid PK
├── recorded_by    uuid → users.id
├── expense_date   date
├── category       text ('feed' | 'medicine' | 'vaccine' | 'wage' | 'utilities' | 'equipment' | 'other')
├── amount_etb     numeric
├── supplier       text (nullable)
└── created_at     timestamptz

health_events
├── id             uuid PK
├── recorded_by    uuid → users.id
├── event_date     date
├── event_type     text ('death' | 'vet_visit' | 'vaccination' | 'illness' | 'recovery')
├── details        text
└── created_at     timestamptz
```

---

## API Reference

All routes except `POST /auth/login` and `GET /ping` require a `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/auth/login` | None | `{ email, password }` | Returns JWT token + user object |
| GET | `/auth/me` | Any | — | Returns current user profile |

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | Any | All KPIs, 7-day chart, 10 recent entries — single request |

### Daily Logs

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/daily-logs` | Any | — | Last 60 logs, newest first |
| POST | `/daily-logs` | Any | `{ log_date, eggs_collected, feed_given_kg, deaths, notes? }` | Create new log |
| PUT | `/daily-logs/:id` | Owner or creator | Same as POST | Update existing log |
| DELETE | `/daily-logs/:id` | Owner only | — | Delete log |

### Sales

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/sales` | Any | — | Last 100 sales, newest first |
| POST | `/sales` | Any | `{ sale_date, type, quantity, amount_etb, buyer? }` | Record a sale |
| PUT | `/sales/:id` | Owner or creator | Same as POST | Update sale |
| DELETE | `/sales/:id` | Owner only | — | Delete sale |

### Expenses

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/expenses` | Any | — | Last 100 expenses, newest first |
| POST | `/expenses` | Any | `{ expense_date, category, amount_etb, supplier? }` | Record expense |
| PUT | `/expenses/:id` | Owner or creator | Same as POST | Update expense |
| DELETE | `/expenses/:id` | Owner only | — | Delete expense |

### Health Events

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/health` | Any | — | Last 100 events, newest first |
| POST | `/health` | Any | `{ event_date, event_type, details }` | Log health event |
| PUT | `/health/:id` | Owner or creator | Same as POST | Update event |
| DELETE | `/health/:id` | Owner only | — | Delete event |

### Users

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| GET | `/users` | Owner only | — | List all user accounts |
| POST | `/users` | Owner only | `{ full_name, email, password, role? }` | Create new account |
| PUT | `/users/:id/password` | Owner or self | `{ password }` | Reset password |

### Utility

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/ping` | None | Health check — returns `{ ok: true }` |

---

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- Git

### 1. Clone / unzip the project

```bash
# If you have both zips:
unzip chickaudit-client.zip
unzip chickaudit-server.zip
```

### 2. Set up the backend

```bash
cd chickaudit-server
npm install

# Create your local database
createdb chickaudit

# Configure environment
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/chickaudit
JWT_SECRET=generate_a_long_random_string_here
JWT_EXPIRES_IN=7d
PORT=4000
CLIENT_ORIGIN=http://localhost:3000
STARTING_FLOCK=200
```

> Generate a secure JWT secret:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

```bash
# Run database migrations
npm run migrate

# Edit seed.js with your real names, emails, and passwords
# then create the 3 user accounts:
node src/db/seed.js

# Start the dev server
npm run dev
# → API running on http://localhost:4000
```

### 3. Set up the frontend

```bash
cd chickaudit-client
npm install

cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

```bash
npm run dev
# → App running on http://localhost:3000
```

### 4. Log in

Open `http://localhost:3000`. You'll be redirected to the login page. Use the email and password you set in `seed.js` for the owner account.

---

## Deployment

### Backend → Railway

1. Push `chickaudit-server/` to a GitHub repository.

2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select your repo.

3. Add a **PostgreSQL** plugin from the Railway dashboard. It will automatically set the `DATABASE_URL` environment variable.

4. Add the remaining environment variables in Railway's **Variables** tab:

   ```
   JWT_SECRET         = <your long random secret>
   JWT_EXPIRES_IN     = 7d
   CLIENT_ORIGIN      = https://your-app.vercel.app
   STARTING_FLOCK     = 200
   NODE_ENV           = production
   ```

5. Railway detects the `Procfile` and runs `node src/index.js` automatically on deploy.

6. After the first successful deploy, open Railway's **Shell** tab and run the migration and seed once:

   ```bash
   npm run migrate
   node src/db/seed.js
   ```

7. Your API is live at the Railway-provided URL (e.g. `https://chickaudit-server-production.up.railway.app`).

---

### Frontend → Vercel

1. Push `chickaudit-client/` to a GitHub repository (can be the same repo in a subfolder, or a separate repo).

2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo.

3. If using a monorepo, set **Root Directory** to `chickaudit-client`.

4. Add the environment variable:

   ```
   NEXT_PUBLIC_API_URL = https://your-railway-url.up.railway.app
   ```

5. Deploy. Vercel auto-detects Next.js and configures the build.

6. Your app is live at `https://your-app.vercel.app`.

---

### Post-deployment checklist

- [ ] Can log in as owner
- [ ] Can log in as each employee
- [ ] Dashboard loads with zeros (expected on first day)
- [ ] Daily log form saves and appears in the list
- [ ] Sales form saves correctly
- [ ] Expenses form saves correctly
- [ ] Health events log correctly
- [ ] Employee cannot delete entries (403 expected)
- [ ] App installs on phone home screen (PWA)

---

## User Roles

| Capability | Owner | Employee |
|---|---|---|
| View dashboard | ✅ | ✅ |
| Submit daily log | ✅ | ✅ |
| Record sales | ✅ | ✅ |
| Record expenses | ✅ | ✅ |
| Log health events | ✅ | ✅ |
| Edit own entries | ✅ | ✅ |
| Edit others' entries | ✅ | ❌ |
| Delete any entry | ✅ | ❌ |
| Create user accounts | ✅ | ❌ |
| View all users | ✅ | ❌ |
| Reset any password | ✅ | ❌ (own only) |

---

## Growth Path

The system is intentionally simple for 200 chickens and 3 users. When the farm grows, here is exactly what to change — the schema and code are already structured for it:

### Adding more employees
The owner creates new accounts via `POST /users`. No schema change needed. Each new employee gets their own login and their entries are attributed to them automatically.

### Adding multiple pens
1. Create a new migration adding a `pens` table and a `pen_id` column to `daily_logs` (and optionally `sales`, `health_events`).
2. Remove the `unique(log_date)` constraint on `daily_logs` — you'll need one log per pen per day instead.
3. Add a pen selector to the daily log form in the frontend.

### Adding inventory tracking
Add a `feed_inventory` table that records purchases and calculates running stock from daily feed consumption in `daily_logs`. This can be a new Express route and a new page in the frontend with no changes to the existing tables.

### Adding monthly PDF reports
Add a `/reports/monthly` route on the backend that queries all four tables for a given month, formats the data, and generates a PDF using a library like `pdfkit`. The frontend adds a download button on the dashboard.

### Adding more expense categories
In `001_initial_schema.sql` the `category` check constraint lists the allowed values. Create a new migration that alters the constraint to include the new category. Update the dropdown in `app/expenses/page.tsx` to match.

### Adding TypeScript to the backend
The backend is plain JavaScript by design (faster to start). When ready, rename files to `.ts`, add `ts-node` and `@types/express`, and run `tsc`. The structure doesn't need to change.

---

## Environment Variables Reference

### `chickaudit-server/.env`

| Variable | Required | Example | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | `postgres://user:pass@host:5432/chickaudit` | PostgreSQL connection string |
| `JWT_SECRET` | Yes | `a1b2c3...` (48+ chars) | Secret used to sign and verify JWT tokens |
| `JWT_EXPIRES_IN` | No | `7d` | How long tokens stay valid (default: 7d) |
| `PORT` | No | `4000` | Port the Express server listens on |
| `CLIENT_ORIGIN` | Yes | `https://your-app.vercel.app` | Allowed CORS origin |
| `STARTING_FLOCK` | No | `200` | Starting chicken count for flock calculation |
| `NODE_ENV` | No | `production` | Enables SSL for DB, disables request logging |

### `chickaudit-client/.env.local`

| Variable | Required | Example | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `http://localhost:4000` | Base URL of the Express backend |

---

## Common Issues

**Login returns 401 immediately**
The seed script hasn't been run, or the email/password don't match what was set in `seed.js`. Re-run `node src/db/seed.js` after editing the file.

**CORS errors in the browser**
`CLIENT_ORIGIN` on the server doesn't match the exact URL of the frontend (including protocol and port, no trailing slash). Update the environment variable and restart the server.

**"A log for this date already exists" error**
Only one daily log is allowed per day (by design, since there's one pen). Edit the existing log for that date using the PUT endpoint, or ask the owner to delete it first.

**Dashboard shows all zeros**
Expected on first use — no data has been entered yet. Submit one daily log and one sale and the dashboard will populate.

**App doesn't install on phone**
The PWA manifest requires the app to be served over HTTPS. Installation works on the Vercel production URL, not on `localhost`.

**Railway deployment fails with "relation does not exist"**
The migration hasn't been run after deployment. Open the Railway shell and run `npm run migrate`.