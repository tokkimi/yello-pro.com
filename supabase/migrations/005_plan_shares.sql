create table if not exists public.plan_shares (
 id uuid primary key default gen_random_uuid(),
 record_id uuid not null references public.records(id) on delete cascade,
 token_hash text not null unique,
 plan jsonb not null,
 version integer not null default 1,
 expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.plan_shares enable row level security;
revoke all on public.plan_shares from anon, authenticated;
grant all on public.plan_shares to service_role;
