create table if not exists public.customer_reviews (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default '' check (char_length(btrim(display_name)) <= 80),
  service_type text not null default 'other' check (service_type in ('trip','airport_transfer','ride','other')),
  rating smallint not null check (rating between 1 and 5),
  review_text text not null check (char_length(btrim(review_text)) between 10 and 2000),
  moderation_status text not null default 'pending' check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists customer_reviews_created_at_idx
  on public.customer_reviews (created_at desc);

alter table public.customer_reviews enable row level security;
revoke all on public.customer_reviews from anon, authenticated;
grant select on public.customer_reviews to authenticated;

drop policy if exists "Admins can read customer reviews" on public.customer_reviews;
create policy "Admins can read customer reviews"
  on public.customer_reviews
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users au
      where au.user_id = (select auth.uid())
    )
  );