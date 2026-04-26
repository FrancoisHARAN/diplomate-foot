-- Le Diplomate — schema MVP Supabase
-- NOTE SECURITE:
-- Cette version MVP conserve une logique pseudo + code côté frontend.
-- Les règles RLS liées aux écritures de pronostics seront renforcées
-- dans une prochaine étape via RPC et/ou Edge Functions.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null unique,
  code_hash text not null,
  is_admin boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  home_team text not null,
  away_team text not null,
  kickoff timestamptz not null,
  status text not null default 'upcoming',
  home_score integer,
  away_score integer,
  stage text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  home_score integer not null,
  away_score integer not null,
  points integer default 0,
  locked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(player_id, match_id)
);

create table if not exists public.admin_settings (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

create index if not exists idx_predictions_player_id on public.predictions(player_id);
create index if not exists idx_predictions_match_id on public.predictions(match_id);
create index if not exists idx_matches_kickoff on public.matches(kickoff);
create index if not exists idx_matches_status on public.matches(status);

alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.admin_settings enable row level security;

-- Lecture publique minimale pour MVP (frontend en mode lecture).
drop policy if exists "players are readable" on public.players;
create policy "players are readable"
  on public.players
  for select
  using (is_active = true);

drop policy if exists "matches are publicly readable" on public.matches;
create policy "matches are publicly readable"
  on public.matches
  for select
  using (true);

drop policy if exists "predictions are readable for leaderboard" on public.predictions;
create policy "predictions are readable for leaderboard"
  on public.predictions
  for select
  using (true);

-- Ecriture temporaire ouverte pour intégration MVP pseudo+code.
-- TODO prochaine étape: remplacer ces policies par des appels RPC / Edge Functions
-- qui valident l'identité joueur et verrouillent les modifications.
drop policy if exists "mvp players insert" on public.players;
create policy "mvp players insert"
  on public.players
  for insert
  with check (true);

drop policy if exists "mvp predictions upsert" on public.predictions;
create policy "mvp predictions upsert"
  on public.predictions
  for all
  using (true)
  with check (true);

drop policy if exists "mvp matches admin seed" on public.matches;
create policy "mvp matches admin seed"
  on public.matches
  for insert
  with check (true);

create or replace view public.standings_view as
select
  p.id as player_id,
  p.nickname,
  coalesce(sum(pr.points), 0)::int as total_points,
  count(pr.id)::int as prediction_count
from public.players p
left join public.predictions pr on pr.player_id = p.id
where p.is_active = true
group by p.id, p.nickname
order by total_points desc, prediction_count desc;

-- Grants MVP (clé publishable/anon)
grant usage on schema public to anon;

grant select, insert on public.players to anon;
grant select, insert on public.matches to anon;
grant select, insert, update on public.predictions to anon;

grant select on public.standings_view to anon;
