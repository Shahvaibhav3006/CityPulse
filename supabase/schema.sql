-- CityPulse AI v2 — run once in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null,
 email text not null,
 department text not null default 'Unassigned',
 role text not null default 'DEPARTMENT' check(role in ('COMMAND_CENTER','DEPARTMENT','FLEET_MANAGER','FIELD_TEAM','SENIOR_AUTHORITY')),
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')),
 created_at timestamptz not null default now()
);
create table if not exists public.fleets(id text primary key,name text not null,duty text not null,coverage text,total int,online int,health int);
create table if not exists public.coverage(id bigint generated always as identity primary key,area text not null,state text not null,fresh int not null,last_observed timestamptz default now());
create table if not exists public.incidents(
 id text primary key,type text not null,area text not null,severity text not null,confidence int,department text,status text not null default 'Detected',
 sla_hours int not null default 48,recurring boolean default false,occurrences int default 1,created_at timestamptz default now(),updated_at timestamptz default now()
);
create table if not exists public.work_orders(id uuid primary key default gen_random_uuid(),incident_id text references public.incidents(id) on delete cascade,department text,assignee text,status text default 'Assigned',note text,created_at timestamptz default now());
create table if not exists public.verifications(id uuid primary key default gen_random_uuid(),incident_id text references public.incidents(id) on delete cascade,result text not null,verified_by uuid references auth.users(id),created_at timestamptz default now());
create table if not exists public.audit_log(id bigint generated always as identity primary key,incident_id text,actor uuid,action text not null,details jsonb default '{}'::jsonb,created_at timestamptz default now());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,name,email,department,role,status)
 values(new.id,coalesce(new.raw_user_meta_data->>'name','New User'),new.email,coalesce(new.raw_user_meta_data->>'department','Unassigned'),'DEPARTMENT','PENDING');
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security; alter table public.fleets enable row level security; alter table public.coverage enable row level security;
alter table public.incidents enable row level security; alter table public.work_orders enable row level security; alter table public.verifications enable row level security; alter table public.audit_log enable row level security;

create or replace function public.is_approved() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and status='APPROVED') $$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from profiles where id=auth.uid() and status='APPROVED' and role in ('COMMAND_CENTER','SENIOR_AUTHORITY')) $$;

create policy "profile self read" on profiles for select using(id=auth.uid() or public.is_admin());
create policy "admin profile update" on profiles for update using(public.is_admin()) with check(public.is_admin());
create policy "approved read fleets" on fleets for select using(public.is_approved());
create policy "approved read coverage" on coverage for select using(public.is_approved());
create policy "approved read incidents" on incidents for select using(public.is_approved());
create policy "approved update incidents" on incidents for update using(public.is_approved()) with check(public.is_approved());
create policy "approved read work orders" on work_orders for select using(public.is_approved());
create policy "approved create work orders" on work_orders for insert with check(public.is_approved());
create policy "approved update work orders" on work_orders for update using(public.is_approved());
create policy "approved read verifications" on verifications for select using(public.is_approved());
create policy "approved create verifications" on verifications for insert with check(public.is_approved());
create policy "approved read audit" on audit_log for select using(public.is_approved());
create policy "approved create audit" on audit_log for insert with check(public.is_approved());

insert into fleets values
('BUS','Public Transport','Passenger Transport','Main roads / fixed routes',136,128,96),
('WASTE','Waste Fleet','Waste Collection','Local / society roads',34,31,91),
('CIVIC','Municipal Field Fleet','Field Operations','Variable civic routes',20,18,94)
on conflict(id) do nothing;
insert into coverage(area,state,fresh) select * from (values ('SG Highway','Fresh',96),('Satellite Internal Roads','Stale',58),('Riverfront Service Road','Fresh',89),('Industrial Back Road','Gap',18)) v(area,state,fresh) where not exists(select 1 from coverage);
insert into incidents(id,type,area,severity,confidence,department,status,sla_hours,recurring,occurrences) values
('CP-1042','Pothole','SG Highway','Critical',94,'Road Maintenance','Assigned',24,true,3),
('CP-1047','Waterlogging','Satellite','High',91,'Drainage','Repairing',48,false,1),
('CP-1051','Damaged Sign','Riverfront','Medium',88,'Traffic','Awaiting Verification',72,false,1),
('CP-1058','Road Damage','Industrial Road','High',93,'Road Maintenance','Detected',48,true,2)
on conflict(id) do nothing;
