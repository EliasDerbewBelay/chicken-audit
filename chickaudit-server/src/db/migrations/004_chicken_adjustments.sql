create table if not exists chicken_adjustments (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  type text not null check (type in ('addition', 'reduction', 'audit')),
  quantity int not null,
  reason text,
  recorded_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
