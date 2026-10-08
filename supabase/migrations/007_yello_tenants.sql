-- Apply ONLY to a new independent Yello Pro Supabase project, after migrations 001–006.
create table public.workspaces(id uuid primary key default gen_random_uuid(),name text not null,owner_id uuid not null references auth.users(id),created_at timestamptz not null default now());
create table public.subscriptions(id uuid primary key default gen_random_uuid(),workspace_id uuid not null unique references public.workspaces(id),plan_code text not null default 'essential' check(plan_code in ('essential','business','team','scale')),status text not null default 'trialing',interval text not null default 'month',trial_ends_at timestamptz default now()+interval '14 days',period_end timestamptz,cancel_at_period_end boolean default false,stripe_customer_id text unique,stripe_subscription_id text unique,updated_at timestamptz not null default now(),last_event_created bigint not null default 0);
create table public.platform_payments(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id),stripe_invoice_id text unique,amount_cents integer not null,currency text default 'cad',status text not null,receipt_url text,created_at timestamptz default now());
create table public.stripe_events(id text primary key,created_at timestamptz default now());
do $$ declare t text;begin foreach t in array array['profiles','records','memberships','audit_log','deliveries','plan_shares'] loop execute format('alter table public.%I add column workspace_id uuid not null references public.workspaces(id)',t);execute format('create index on public.%I(workspace_id)',t);end loop;end $$;
alter table public.records add constraint records_tenant_unique unique(id,workspace_id);
alter table public.profiles add constraint profiles_tenant_unique unique(id,workspace_id);
alter table public.records add constraint client_same_workspace foreign key(client_id,workspace_id) references public.records(id,workspace_id);
alter table public.records add constraint project_same_workspace foreign key(project_id,workspace_id) references public.records(id,workspace_id);
alter table public.memberships add constraint membership_project_workspace foreign key(project_id,workspace_id) references public.records(id,workspace_id);
alter table public.memberships add constraint membership_user_workspace foreign key(user_id,workspace_id) references public.profiles(id,workspace_id);
alter table public.deliveries add constraint delivery_workspace foreign key(record_id,workspace_id) references public.records(id,workspace_id);
alter table public.plan_shares add constraint share_workspace foreign key(record_id,workspace_id) references public.records(id,workspace_id);
alter table public.workspaces enable row level security;
alter table public.subscriptions enable row level security;
alter table public.platform_payments enable row level security;
alter table public.stripe_events enable row level security;
create or replace function public.audit_record() returns trigger language plpgsql security definer set search_path=public as $$begin insert into audit_log(workspace_id,action,record_id,details) values(coalesce(NEW.workspace_id,OLD.workspace_id),TG_OP,coalesce(NEW.id,OLD.id),jsonb_build_object('before',to_jsonb(OLD),'after',to_jsonb(NEW)));return coalesce(NEW,OLD);end;$$;
create function public.create_yello_workspace(p_user uuid,p_name text,p_email text,p_company text,p_plan text) returns uuid language plpgsql security definer set search_path=public as $$declare w uuid;begin
 if exists(select 1 from profiles where id=p_user) then raise exception 'Compte déjà associé';end if;
 if p_plan not in ('essential','business','team','scale') then raise exception 'Offre invalide';end if;
 insert into workspaces(name,owner_id) values(p_company,p_user) returning id into w;
 insert into profiles(id,name,email,role,workspace_id) values(p_user,p_name,p_email,'admin',w);
 insert into subscriptions(workspace_id,plan_code) values(w,p_plan);
 insert into records(kind,workspace_id,data) values('settings',w,jsonb_build_object('name',p_company,'email',p_email,'phone','','address','','rbq',''));
 return w;end;$$;
revoke all on function public.create_yello_workspace(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_yello_workspace(uuid,text,text,text,text) to service_role;
