-- ============================================================
-- 001_initial_schema.sql
-- Run via: npm run migrate
-- ============================================================

-- USERS
-- Stores login credentials + role for the 3 users (owner + 2 employees)
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text not null unique,
  password    text not null,          -- bcrypt hash
  role        text not null default 'employee'
                check (role in ('owner', 'employee')),
  created_at  timestamptz not null default now()
);

-- DAILY LOGS
create table if not exists daily_logs (
  id               uuid primary key default gen_random_uuid(),
  logged_by        uuid not null references users(id),
  log_date         date not null default current_date,
  eggs_collected   int not null default 0,
  feed_given_kg    numeric(6,2) not null default 0,
  deaths           int not null default 0,
  notes            text,
  created_at       timestamptz not null default now(),
  unique(log_date)  -- one log per day; drop this when you add multiple pens
);

-- SALES
create table if not exists sales (
  id             uuid primary key default gen_random_uuid(),
  recorded_by    uuid not null references users(id),
  sale_date      date not null default current_date,
  type           text not null check (type in ('eggs', 'broiler')),
  quantity       numeric(8,2) not null,
  amount_etb     numeric(10,2) not null,
  buyer          text,
  created_at     timestamptz not null default now()
);

-- EXPENSES
create table if not exists expenses (
  id             uuid primary key default gen_random_uuid(),
  recorded_by    uuid not null references users(id),
  expense_date   date not null default current_date,
  category       text not null check (category in (
                   'feed','medicine','vaccine','wage',
                   'utilities','equipment','other'
                 )),
  amount_etb     numeric(10,2) not null,
  supplier       text,
  created_at     timestamptz not null default now()
);

-- HEALTH EVENTS
create table if not exists health_events (
  id             uuid primary key default gen_random_uuid(),
  recorded_by    uuid not null references users(id),
  event_date     date not null default current_date,
  event_type     text not null check (event_type in (
                   'death','vet_visit','vaccination','illness','recovery'
                 )),
  details        text not null,
  created_at     timestamptz not null default now()
);

-- Indexes for common query patterns
create index if not exists idx_daily_logs_date     on daily_logs(log_date desc);
create index if not exists idx_sales_date          on sales(sale_date desc);
create index if not exists idx_expenses_date       on expenses(expense_date desc);
create index if not exists idx_health_events_date  on health_events(event_date desc);
