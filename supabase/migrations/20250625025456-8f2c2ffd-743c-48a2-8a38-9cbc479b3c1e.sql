
-- Enable RLS
alter table if exists public.users enable row level security;
alter table if exists public.user_profiles enable row level security;
alter table if exists public.game_matches enable row level security;
alter table if exists public.game_replays enable row level security;

-- Users table (extends Supabase auth.users)
create table if not exists public.user_profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  email text unique not null,
  rank text not null default 'C-',
  rating integer not null default 1000,
  games_played integer not null default 0,
  games_won integer not null default 0,
  total_score bigint not null default 0,
  total_lines integer not null default 0,
  best_pps decimal not null default 0,
  best_apm decimal not null default 0,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Game matches table
create table if not exists public.game_matches (
  id uuid default gen_random_uuid() primary key,
  player1_id uuid references public.user_profiles(id) on delete cascade not null,
  player2_id uuid references public.user_profiles(id) on delete cascade,
  winner_id uuid references public.user_profiles(id) on delete set null,
  game_type text not null check (game_type in ('sprint40', 'ultra2min', 'endless', 'ranked')),
  player1_score integer not null default 0,
  player2_score integer not null default 0,
  player1_lines integer not null default 0,
  player2_lines integer not null default 0,
  player1_pps decimal not null default 0,
  player2_pps decimal not null default 0,
  player1_apm decimal not null default 0,
  player2_apm decimal not null default 0,
  duration integer not null default 0, -- in seconds
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished', 'abandoned')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  finished_at timestamp with time zone
);

-- Game replays table
create table if not exists public.game_replays (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references public.game_matches(id) on delete cascade not null,
  user_id uuid references public.user_profiles(id) on delete cascade not null,
  replay_data jsonb not null, -- stores move sequence and game state
  final_score integer not null,
  final_lines integer not null,
  pps decimal not null,
  apm decimal not null,
  duration integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Advertisements table
create table if not exists public.advertisements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  image_url text,
  target_url text,
  position text not null check (position in ('left_sidebar', 'right_sidebar', 'top_banner', 'bottom_banner')),
  is_active boolean not null default true,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  impressions integer not null default 0,
  clicks integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
create policy "Users can view their own profile" on public.user_profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.user_profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on public.user_profiles
  for insert with check (auth.uid() = id);

create policy "Users can view public match data" on public.game_matches
  for select using (true);

create policy "Users can create matches" on public.game_matches
  for insert with check (auth.uid() = player1_id);

create policy "Users can update their own matches" on public.game_matches
  for update using (auth.uid() = player1_id or auth.uid() = player2_id);

create policy "Users can view their own replays" on public.game_replays
  for select using (auth.uid() = user_id);

create policy "Users can create their own replays" on public.game_replays
  for insert with check (auth.uid() = user_id);

create policy "Everyone can view active advertisements" on public.advertisements
  for select using (is_active = true);

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user registration
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger handle_updated_at before update on public.user_profiles
  for each row execute procedure public.handle_updated_at();
