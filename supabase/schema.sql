-- Fast & Furious Club — Supabase foundation
-- Apply this schema only after creating the Supabase project.
-- No secrets or API keys belong in this file or in the public website.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  membership_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  inquiry_type text not null check (inquiry_type in ('trip', 'ride', 'airport')),
  customer_name text not null,
  customer_email text,
  customer_phone text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.inquiries enable row level security;

-- A customer can read their own profile and edit only contact details.
drop policy if exists "Customers read own profile" on public.profiles;
create policy "Customers read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Customers create own profile" on public.profiles;
create policy "Customers create own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()) and membership_active = false);

drop policy if exists "Customers update own contact details" on public.profiles;
create policy "Customers update own contact details"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Column-level grants prevent customers from changing membership status.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Admin membership is managed only through the Supabase dashboard/service role.
drop policy if exists "Admins read admin list" on public.admin_users;
create policy "Admins read admin list"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Anyone may submit an inquiry; customers may submit it linked to their own account.
drop policy if exists "Submit inquiry" on public.inquiries;
create policy "Submit inquiry"
  on public.inquiries for insert to anon, authenticated
  with check (
    user_id is null
    or user_id = (select auth.uid())
  );

drop policy if exists "Admins read inquiries" on public.inquiries;
create policy "Admins read inquiries"
  on public.inquiries for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins update inquiries" on public.inquiries;
create policy "Admins update inquiries"
  on public.inquiries for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Automatically create a private profile when a customer registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- IMPORTANT:
-- Add the owner's auth.users UUID to public.admin_users from the Supabase
-- SQL editor after the first owner account has been registered.
-- Never expose the service_role key in index.html or any browser code.
