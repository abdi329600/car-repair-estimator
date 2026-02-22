-- AutoFlip PRO — Supabase Schema
-- Run this in Supabase SQL Editor

-- Users table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  tier text default 'free' check (tier in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  estimates_this_month int default 0,
  estimates_reset_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Saved estimates
create table if not exists public.saved_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  auction_url text,
  vin text,
  vehicle_info jsonb,
  damage jsonb,
  estimate jsonb,
  parts_data jsonb,
  purchase_price numeric,
  resale_value numeric,
  profit numeric,
  status text default 'draft' check (status in ('draft', 'active', 'sold', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Parts price cache (auto-expire after 24h)
create table if not exists public.parts_cache (
  id uuid primary key default gen_random_uuid(),
  cache_key text unique not null,
  part_name text not null,
  vehicle text not null,
  search_results jsonb not null,
  cached_at timestamptz default now()
);

-- Auction scrape cache
create table if not exists public.auction_cache (
  id uuid primary key default gen_random_uuid(),
  listing_url text unique not null,
  source text not null check (source in ('copart', 'iaa')),
  auction_data jsonb not null,
  cached_at timestamptz default now()
);

-- Stock reference photos for comparison-based damage analysis
create table if not exists public.stock_photos (
  id uuid primary key default gen_random_uuid(),
  year int not null,
  make text not null,
  model text not null,
  photo_url text not null,
  source text, -- 'hardcoded', 'google_cse'
  created_at timestamptz default now(),
  unique(year, make, model)
);

-- Indexes
create index if not exists idx_saved_estimates_user on public.saved_estimates(user_id);
create index if not exists idx_saved_estimates_vin on public.saved_estimates(vin);
create index if not exists idx_parts_cache_expiry on public.parts_cache(cached_at);
create index if not exists idx_auction_cache_expiry on public.auction_cache(cached_at);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.saved_estimates enable row level security;

-- Profiles: users can only read/update their own
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Saved estimates: users can only CRUD their own
create policy "Users can view own estimates" on public.saved_estimates
  for select using (auth.uid() = user_id);
create policy "Users can insert own estimates" on public.saved_estimates
  for insert with check (auth.uid() = user_id);
create policy "Users can update own estimates" on public.saved_estimates
  for update using (auth.uid() = user_id);
create policy "Users can delete own estimates" on public.saved_estimates
  for delete using (auth.uid() = user_id);

-- Parts cache: public read (no auth needed for cached data)
alter table public.parts_cache enable row level security;
create policy "Anyone can read parts cache" on public.parts_cache
  for select using (true);

-- Function: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: create profile on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function: reset monthly estimate count (run via cron)
create or replace function public.reset_monthly_estimates()
returns void as $$
begin
  update public.profiles
  set estimates_this_month = 0, estimates_reset_at = now()
  where estimates_reset_at < now() - interval '30 days';
end;
$$ language plpgsql security definer;

-- Function: clean expired cache
create or replace function public.clean_expired_cache()
returns void as $$
begin
  delete from public.parts_cache where cached_at < now() - interval '24 hours';
  delete from public.auction_cache where cached_at < now() - interval '6 hours';
end;
$$ language plpgsql security definer;
