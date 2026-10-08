create extension if not exists pgcrypto;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name text not null, email text not null, role text not null check(role in ('admin','worker','client')), client_id uuid, active boolean not null default true);
create table public.records (id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('client','request','project','task','visit','quote','invoice','expense','message','document','settings','journal')), client_id uuid, project_id uuid, data jsonb not null default '{}', version integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index records_kind on public.records(kind);
create index records_client on public.records(client_id);
create index records_project on public.records(project_id);
create table public.memberships (project_id uuid references public.records(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, primary key(project_id,user_id));
create table public.audit_log (id bigint generated always as identity primary key, actor_id uuid, action text not null, record_id uuid, details jsonb, created_at timestamptz not null default now());
create table public.rate_limits (key text primary key, hits integer not null default 1, expires_at timestamptz not null);
create table public.deliveries (id uuid primary key default gen_random_uuid(), record_id uuid references public.records(id), recipient text not null, provider_id text, status text not null, created_at timestamptz default now());
alter table public.profiles enable row level security;
alter table public.records enable row level security;
alter table public.memberships enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;
alter table public.deliveries enable row level security;
-- Data is accessible only through authenticated, role-checked server routes.
-- No browser or anonymous policies intentionally. Service key stays server-only.
create or replace function public.rate_limit(p_key text) returns boolean language plpgsql security definer set search_path=public as $$
declare n integer;
begin
 insert into rate_limits(key,hits,expires_at) values(p_key,1,now()+interval '1 hour') on conflict(key) do update set hits=case when rate_limits.expires_at<now() then 1 else rate_limits.hits+1 end, expires_at=case when rate_limits.expires_at<now() then now()+interval '1 hour' else rate_limits.expires_at end returning hits into n;
 return n<=8;
end; $$;
revoke all on function public.rate_limit(text) from public,anon,authenticated;
grant execute on function public.rate_limit(text) to service_role;
create or replace function public.audit_record() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into audit_log(action,record_id,details) values(TG_OP,coalesce(NEW.id,OLD.id),jsonb_build_object('before',to_jsonb(OLD),'after',to_jsonb(NEW)));
 return coalesce(NEW,OLD);
end; $$;
create trigger records_audit after insert or update or delete on records for each row execute function public.audit_record();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('documents','documents',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
-- Create the first owner in Supabase Auth, then insert their UUID below manually:
-- insert into profiles(id,name,email,role) values ('AUTH_USER_UUID','Mohamed Ghamraoui','info@renovationsmgpro.com','admin');
