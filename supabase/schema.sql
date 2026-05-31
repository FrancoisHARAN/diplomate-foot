-- Le Diplomate - schema Supabase RPC
--
-- A coller dans le SQL Editor Supabase.
--
-- Objectif:
-- - aucune cle service_role cote frontend;
-- - aucun code joueur ni hash reel dans GitHub;
-- - RLS activee sur les tables;
-- - pas d'ecriture directe anon dans les tables sensibles;
-- - actions sensibles via RPC SECURITY DEFINER.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$
begin
  if exists (
    select 1
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pgcrypto'
      and n.nspname <> 'extensions'
  ) then
    alter extension pgcrypto set schema extensions;
  end if;
end $$;

-- Nettoyage defensif si un ancien MVP avait donne des droits directs.
do $$
begin
  if to_regclass('public.app_players') is not null then
    execute 'revoke all on public.app_players from anon, authenticated';
  end if;
  if to_regclass('public.app_predictions') is not null then
    execute 'revoke all on public.app_predictions from anon, authenticated';
  end if;
end $$;

create or replace function public.app_normalize_nickname(value text)
returns text
language sql
immutable
as $$
  select lower(
    translate(
      trim(coalesce(value, '')),
      'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ',
      'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy'
    )
  );
$$;

create table if not exists public.app_rpc_players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  nickname_key text not null unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_rpc_player_codes (
  player_id uuid primary key references public.app_rpc_players(id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_rpc_sessions (
  token uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.app_rpc_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

create table if not exists public.app_rpc_settings (
  key text primary key,
  value_hash text not null check (value_hash ~ '^[a-f0-9]{64}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_rpc_config (
  key text primary key,
  value_text text,
  value_timestamptz timestamptz,
  updated_at timestamptz not null default now()
);

-- Token de synchro des scores live:
-- insert into public.app_rpc_settings (key, value_hash)
-- values ('match_sync_token_hash', public.app_private_text_hash('TON_TOKEN_SECRET'))
-- on conflict (key) do update set value_hash = excluded.value_hash, updated_at = now();

create table if not exists public.app_rpc_matches (
  id text primary key,
  external_id text,
  competition_code text,
  competition_name text,
  home_team jsonb not null,
  away_team jsonb not null,
  kickoff timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'finished')),
  home_score integer check (home_score between 0 and 30),
  away_score integer check (away_score between 0 and 30),
  minute integer,
  venue text,
  matchday integer,
  stage text,
  round text,
  group_name text,
  season integer,
  source_competition_id text,
  points_multiplier integer not null default 1 check (points_multiplier between 1 and 10),
  source text,
  last_updated timestamptz,
  updated_at timestamptz not null default now()
);
-- home_score / away_score represent the regular-time score used for prediction scoring.

alter table public.app_rpc_matches add column if not exists stage text;
alter table public.app_rpc_matches add column if not exists round text;
alter table public.app_rpc_matches add column if not exists group_name text;
alter table public.app_rpc_matches add column if not exists season integer;
alter table public.app_rpc_matches add column if not exists source_competition_id text;

create table if not exists public.app_rpc_predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.app_rpc_players(id) on delete cascade,
  match_id text not null,
  home_score integer not null check (home_score between 0 and 30),
  away_score integer not null check (away_score between 0 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id, match_id)
);

create table if not exists public.app_rpc_world_cup_winner_predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.app_rpc_players(id) on delete cascade,
  first_choice_code text not null,
  second_choice_code text not null,
  third_choice_code text not null,
  first_choice_name text,
  second_choice_name text,
  third_choice_name text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(player_id),
  check (first_choice_code <> second_choice_code and first_choice_code <> third_choice_code and second_choice_code <> third_choice_code)
);

create table if not exists public.app_rpc_flash_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  match_id text,
  match_label text,
  closes_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  result_option_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_rpc_flash_options (
  id uuid primary key default gen_random_uuid(),
  flash_id uuid not null references public.app_rpc_flash_challenges(id) on delete cascade,
  label text not null,
  points_if_correct int not null check (points_if_correct between 0 and 50),
  sort_order int not null default 0
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_rpc_flash_result_option_fk'
      and conrelid = 'public.app_rpc_flash_challenges'::regclass
  ) then
    alter table public.app_rpc_flash_challenges
      add constraint app_rpc_flash_result_option_fk
      foreign key (result_option_id)
      references public.app_rpc_flash_options(id)
      deferrable initially deferred;
  end if;
end $$;

create table if not exists public.app_rpc_flash_predictions (
  id uuid primary key default gen_random_uuid(),
  flash_id uuid not null references public.app_rpc_flash_challenges(id) on delete cascade,
  option_id uuid not null references public.app_rpc_flash_options(id) on delete cascade,
  player_id uuid not null references public.app_rpc_players(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(flash_id, player_id)
);

create table if not exists public.app_rpc_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_type text not null default 'weekly',
  period_label text not null,
  week_start timestamptz,
  week_end timestamptz,
  snapshot_at timestamptz not null default now(),
  player_id uuid not null references public.app_rpc_players(id) on delete cascade,
  rank int not null,
  points int not null,
  exact_scores int not null default 0,
  two_point_results int not null default 0,
  first_prediction_at timestamptz,
  created_at timestamptz not null default now(),
  unique(period_type, week_start, player_id)
);

create index if not exists idx_app_rpc_players_nickname_key on public.app_rpc_players(nickname_key);
create index if not exists idx_app_rpc_sessions_player_id on public.app_rpc_sessions(player_id);
create index if not exists idx_app_rpc_sessions_expires_at on public.app_rpc_sessions(expires_at);
create index if not exists idx_app_rpc_matches_kickoff on public.app_rpc_matches(kickoff);
create index if not exists idx_app_rpc_matches_status on public.app_rpc_matches(status);
create index if not exists idx_app_rpc_matches_competition_code on public.app_rpc_matches(competition_code);
create index if not exists idx_app_rpc_predictions_player_id on public.app_rpc_predictions(player_id);
create index if not exists idx_app_rpc_predictions_match_id on public.app_rpc_predictions(match_id);
create index if not exists idx_app_rpc_predictions_updated_at on public.app_rpc_predictions(updated_at desc);
create index if not exists idx_app_rpc_world_cup_winner_player on public.app_rpc_world_cup_winner_predictions(player_id);
create index if not exists idx_app_rpc_flash_challenges_status on public.app_rpc_flash_challenges(status, closes_at desc);
create index if not exists idx_app_rpc_flash_options_flash on public.app_rpc_flash_options(flash_id, sort_order);
create index if not exists idx_app_rpc_flash_predictions_player on public.app_rpc_flash_predictions(player_id);
create index if not exists idx_app_rpc_flash_predictions_flash on public.app_rpc_flash_predictions(flash_id);
create index if not exists idx_app_rpc_leaderboard_snapshots_week on public.app_rpc_leaderboard_snapshots(period_type, week_start desc);
create index if not exists idx_app_rpc_leaderboard_snapshots_player on public.app_rpc_leaderboard_snapshots(player_id);

alter table public.app_rpc_players enable row level security;
alter table public.app_rpc_player_codes enable row level security;
alter table public.app_rpc_sessions enable row level security;
alter table public.app_rpc_settings enable row level security;
alter table public.app_rpc_config enable row level security;
alter table public.app_rpc_matches enable row level security;
alter table public.app_rpc_predictions enable row level security;
alter table public.app_rpc_world_cup_winner_predictions enable row level security;
alter table public.app_rpc_flash_challenges enable row level security;
alter table public.app_rpc_flash_options enable row level security;
alter table public.app_rpc_flash_predictions enable row level security;
alter table public.app_rpc_leaderboard_snapshots enable row level security;

alter table public.app_rpc_predictions
  add column if not exists created_at timestamptz not null default now();

revoke all on public.app_rpc_players from anon, authenticated;
revoke all on public.app_rpc_player_codes from anon, authenticated;
revoke all on public.app_rpc_sessions from anon, authenticated;
revoke all on public.app_rpc_settings from anon, authenticated;
revoke all on public.app_rpc_config from anon, authenticated;
revoke all on public.app_rpc_matches from anon, authenticated;
revoke all on public.app_rpc_predictions from anon, authenticated;
revoke all on public.app_rpc_world_cup_winner_predictions from anon, authenticated;
revoke all on public.app_rpc_flash_challenges from anon, authenticated;
revoke all on public.app_rpc_flash_options from anon, authenticated;
revoke all on public.app_rpc_flash_predictions from anon, authenticated;
revoke all on public.app_rpc_leaderboard_snapshots from anon, authenticated;
grant usage on schema public to anon, authenticated;

drop policy if exists "app rpc matches public read" on public.app_rpc_matches;
create policy "app rpc matches public read"
  on public.app_rpc_matches
  for select
  using (true);

grant select on public.app_rpc_matches to anon;

create or replace function public.app_private_text_hash(p_value text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(coalesce(p_value, ''), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.app_private_code_hash(p_player_id uuid, p_code text)
returns text
language sql
stable
set search_path = public, extensions
as $$
  select encode(extensions.digest(convert_to(p_player_id::text || ':' || coalesce(p_code, ''), 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.app_private_require_match_sync_token(p_sync_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_expected_hash text;
begin
  select value_hash
  into v_expected_hash
  from public.app_rpc_settings
  where key = 'match_sync_token_hash';

  if v_expected_hash is null then
    raise exception 'Token de synchro des matchs non configure';
  end if;

  if public.app_private_text_hash(p_sync_token) <> v_expected_hash then
    raise exception 'Token de synchro des matchs invalide';
  end if;
end;
$$;

create or replace function public.app_admin_create_player(p_nickname text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_key text := app_normalize_nickname(p_nickname);
begin
  if v_key = '' then
    raise exception 'Pseudo obligatoire';
  end if;
  if p_code !~ '^[0-9]{6}$' then
    raise exception 'Le code doit contenir 6 chiffres';
  end if;

  insert into public.app_rpc_players (nickname, nickname_key, display_name)
  values (p_nickname, v_key, p_nickname)
  on conflict (nickname_key) do update set
    nickname = excluded.nickname,
    display_name = excluded.display_name,
    updated_at = now()
  returning id into v_player_id;

  insert into public.app_rpc_player_codes (player_id, code_hash, updated_at)
  values (v_player_id, app_private_code_hash(v_player_id, p_code), now())
  on conflict (player_id) do update set
    code_hash = excluded.code_hash,
    updated_at = now();

  return v_player_id;
end;
$$;

create or replace function public.app_private_session_player(p_session_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  select player_id
  into v_player_id
  from public.app_rpc_sessions
  where token = p_session_token
    and expires_at > now();

  if v_player_id is null then
    raise exception 'Session joueur invalide ou expiree';
  end if;

  return v_player_id;
end;
$$;

create or replace function public.app_private_prediction_points(
  p_home_prediction int,
  p_away_prediction int,
  p_home_score int,
  p_away_score int,
  p_multiplier int
)
returns int
language sql
immutable
as $$
  select case
    when p_home_score is null or p_away_score is null then 0
    when p_home_prediction = p_home_score and p_away_prediction = p_away_score then 4 * greatest(1, coalesce(p_multiplier, 1))
    when sign(p_home_prediction - p_away_prediction) = 0
      and sign(p_home_score - p_away_score) = 0 then 1 * greatest(1, coalesce(p_multiplier, 1))
    when sign(p_home_prediction - p_away_prediction) = sign(p_home_score - p_away_score)
      and (p_home_prediction - p_away_prediction) = (p_home_score - p_away_score) then 2 * greatest(1, coalesce(p_multiplier, 1))
    when sign(p_home_prediction - p_away_prediction) = sign(p_home_score - p_away_score) then 1 * greatest(1, coalesce(p_multiplier, 1))
    else 0
  end;
$$;

create or replace function public.app_private_prediction_is_public(p_status text, p_kickoff timestamptz)
returns boolean
language sql
stable
as $$
  select lower(coalesce(p_status, 'upcoming')) <> 'upcoming'
    or p_kickoff < now();
$$;

create or replace function public.app_private_match_is_final(p_status text)
returns boolean
language sql
immutable
as $$
  select lower(replace(replace(coalesce(p_status, ''), '-', '_'), ' ', '_')) in (
    'finished',
    'ft',
    'full_time',
    'completed',
    'complete',
    'termine',
    'terminé',
    'final',
    'ended',
    'after_extra_time',
    'aet',
    'penalties'
  );
$$;

create or replace function public.app_private_scoring_epoch_start()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select value_timestamptz
  from public.app_rpc_config
  where key = 'scoring_epoch_start';
$$;

create or replace function public.app_private_is_after_scoring_epoch(p_event_at timestamptz)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_event_at is not null
    and (
      public.app_private_scoring_epoch_start() is null
      or p_event_at >= public.app_private_scoring_epoch_start()
    );
$$;

create or replace function public.app_private_match_scoring_event_at(
  p_kickoff timestamptz,
  p_last_updated timestamptz
)
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_kickoff is null then p_last_updated
    when p_last_updated is null then p_kickoff
    else greatest(p_kickoff, p_last_updated)
  end;
$$;

create or replace function public.app_private_match_in_current_season(
  p_status text,
  p_kickoff timestamptz,
  p_last_updated timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.app_private_match_is_final(p_status)
    or public.app_private_is_after_scoring_epoch(
      public.app_private_match_scoring_event_at(p_kickoff, p_last_updated)
    );
$$;

create or replace function public.app_private_flash_in_current_season(
  p_status text,
  p_closes_at timestamptz,
  p_updated_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(p_status, '')) = 'open'
    or public.app_private_is_after_scoring_epoch(coalesce(p_updated_at, p_closes_at));
$$;

create or replace function public.app_admin_set_scoring_epoch(p_reset_at timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset_at timestamptz := coalesce(p_reset_at, now());
begin
  insert into public.app_rpc_config (key, value_text, value_timestamptz, updated_at)
  values ('scoring_epoch_start', v_reset_at::text, v_reset_at, now())
  on conflict (key) do update set
    value_text = excluded.value_text,
    value_timestamptz = excluded.value_timestamptz,
    updated_at = now();

  return jsonb_build_object(
    'scoring_epoch_start', v_reset_at,
    'preserved_data', jsonb_build_array(
      'players',
      'sessions',
      'predictions',
      'world_cup_top_three',
      'avatars',
      'matches',
      'flash_challenges'
    )
  );
end;
$$;

create or replace function public.app_admin_reset_competition_for_world_cup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reset_at timestamptz := now();
  v_players_deleted int := 0;
  v_player_codes_deleted int := 0;
  v_sessions_deleted int := 0;
  v_predictions_deleted int := 0;
  v_world_cup_predictions_deleted int := 0;
  v_flash_predictions_deleted int := 0;
  v_flash_options_deleted int := 0;
  v_flash_challenges_deleted int := 0;
  v_snapshots_deleted int := 0;
  v_matches_deleted int := 0;
  v_world_cup_matches_kept int := 0;
begin
  with deleted as (
    delete from public.app_rpc_flash_predictions
    returning 1
  )
  select count(*) into v_flash_predictions_deleted from deleted;

  update public.app_rpc_flash_challenges
  set result_option_id = null
  where result_option_id is not null;

  with deleted as (
    delete from public.app_rpc_flash_options
    returning 1
  )
  select count(*) into v_flash_options_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_flash_challenges
    returning 1
  )
  select count(*) into v_flash_challenges_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_leaderboard_snapshots
    returning 1
  )
  select count(*) into v_snapshots_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_world_cup_winner_predictions
    returning 1
  )
  select count(*) into v_world_cup_predictions_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_predictions
    returning 1
  )
  select count(*) into v_predictions_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_sessions
    returning 1
  )
  select count(*) into v_sessions_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_player_codes
    returning 1
  )
  select count(*) into v_player_codes_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_players
    returning 1
  )
  select count(*) into v_players_deleted from deleted;

  with deleted as (
    delete from public.app_rpc_matches m
    where not (
      (
        coalesce(m.competition_code, '') = 'WC2026'
        or upper(coalesce(m.source_competition_id, '')) = 'WC'
        or lower(coalesce(m.competition_name, '')) like '%world cup%'
        or lower(coalesce(m.competition_name, '')) like '%coupe du monde%'
      )
      and coalesce(m.season, extract(year from m.kickoff)::int) = 2026
      and lower(coalesce(m.competition_name, '')) not like '%qualif%'
      and lower(coalesce(m.competition_name, '')) not like '%qualification%'
      and lower(coalesce(m.competition_name, '')) not like '%friendly%'
      and lower(coalesce(m.competition_name, '')) not like '%amical%'
      and lower(coalesce(m.competition_name, '')) not like '%preparation%'
    )
    returning 1
  )
  select count(*) into v_matches_deleted from deleted;

  select count(*)
  into v_world_cup_matches_kept
  from public.app_rpc_matches m
  where (
    coalesce(m.competition_code, '') = 'WC2026'
    or upper(coalesce(m.source_competition_id, '')) = 'WC'
    or lower(coalesce(m.competition_name, '')) like '%world cup%'
    or lower(coalesce(m.competition_name, '')) like '%coupe du monde%'
  )
    and coalesce(m.season, extract(year from m.kickoff)::int) = 2026
    and lower(coalesce(m.competition_name, '')) not like '%qualif%'
    and lower(coalesce(m.competition_name, '')) not like '%qualification%'
    and lower(coalesce(m.competition_name, '')) not like '%friendly%'
    and lower(coalesce(m.competition_name, '')) not like '%amical%'
    and lower(coalesce(m.competition_name, '')) not like '%preparation%';

  insert into public.app_rpc_config (key, value_text, value_timestamptz, updated_at)
  values ('scoring_epoch_start', v_reset_at::text, v_reset_at, now())
  on conflict (key) do update set
    value_text = excluded.value_text,
    value_timestamptz = excluded.value_timestamptz,
    updated_at = now();

  return jsonb_build_object(
    'reset_at', v_reset_at,
    'players_deleted', v_players_deleted,
    'player_codes_deleted', v_player_codes_deleted,
    'sessions_deleted', v_sessions_deleted,
    'predictions_deleted', v_predictions_deleted,
    'world_cup_winner_predictions_deleted', v_world_cup_predictions_deleted,
    'flash_predictions_deleted', v_flash_predictions_deleted,
    'flash_options_deleted', v_flash_options_deleted,
    'flash_challenges_deleted', v_flash_challenges_deleted,
    'leaderboard_snapshots_deleted', v_snapshots_deleted,
    'matches_deleted', v_matches_deleted,
    'world_cup_matches_kept', v_world_cup_matches_kept,
    'preserved_data', jsonb_build_array(
      'schema',
      'rpc_functions',
      'rls',
      'match_sync_token_hash',
      'world_cup_matches'
    )
  );
end;
$$;

create or replace function public.app_private_match_multiplier(
  p_points_multiplier int,
  p_competition_code text,
  p_competition_name text,
  p_stage text,
  p_round text,
  p_matchday int,
  p_home_team jsonb,
  p_away_team jsonb
)
returns int
language sql
immutable
as $$
  with match_values as (
    select
      lower(regexp_replace(coalesce(p_competition_code, '') || ' ' || coalesce(p_competition_name, ''), '[^a-zA-Z0-9]+', ' ', 'g')) as competition_text,
      lower(regexp_replace(coalesce(p_stage, '') || ' ' || coalesce(p_round, '') || ' ' || coalesce(p_matchday::text, ''), '[^a-zA-Z0-9]+', ' ', 'g')) as stage_text,
      lower(regexp_replace(coalesce(p_home_team->>'countryCode', '') || ' ' || coalesce(p_home_team->>'name', '') || ' ' || coalesce(p_home_team->>'shortName', '') || ' ' ||
            coalesce(p_away_team->>'countryCode', '') || ' ' || coalesce(p_away_team->>'name', '') || ' ' || coalesce(p_away_team->>'shortName', ''), '[^a-zA-Z0-9]+', ' ', 'g')) as teams_text
  )
  select greatest(
    1,
    coalesce(p_points_multiplier, 1),
    case
      when competition_text like '%wc2026%' or competition_text like '%world cup%' or competition_text like '%coupe du monde%' then
        case
          when stage_text like '%semi%' or stage_text like '%demi%' then 4
          when stage_text like '%third place%' or stage_text like '%3e place%' or stage_text like '%troisieme%' then 3
          when stage_text like '%quarter%' or stage_text like '%quart%' then 3
          when stage_text like '%round of 16%' or stage_text like '%last 16%' or stage_text like '%huitieme%' then 2
          when stage_text like '%round of 32%' or stage_text like '%last 32%' or stage_text like '%seizieme%' then 2
          when stage_text like '%final%' or stage_text like '%finale%' then 5
          else 1
        end
      else 1
    end,
    case
      when (competition_text like '%wc2026%' or competition_text like '%world cup%' or competition_text like '%coupe du monde%')
        and (teams_text like '%fra%' or teams_text like '%france%') then 2
      else 1
    end,
    1
  )
  from match_values;
$$;

create or replace view public.app_rpc_scored_predictions as
select
  pr.id,
  pr.player_id,
  pr.match_id,
  pr.home_score,
  pr.away_score,
  pr.updated_at,
  coalesce(app_private_prediction_points(
    pr.home_score,
    pr.away_score,
    m.home_score,
    m.away_score,
    public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team)
  ), 0) as points
from public.app_rpc_predictions pr
left join public.app_rpc_matches m on m.id = pr.match_id
where public.app_private_match_is_final(m.status)
  and m.home_score is not null
  and m.away_score is not null
  and public.app_private_is_after_scoring_epoch(
    public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)
  );

create or replace function public.app_private_world_cup_country_name(p_code text)
returns text
language sql
immutable
as $$
  select case upper(coalesce(p_code, ''))
    when 'FRA' then 'France'
    when 'ESP' then 'Espagne'
    when 'ARG' then 'Argentine'
    when 'ENG' then 'Angleterre'
    when 'POR' then 'Portugal'
    when 'BRA' then 'Bresil'
    when 'NED' then 'Pays-Bas'
    when 'MAR' then 'Maroc'
    when 'BEL' then 'Belgique'
    when 'GER' then 'Allemagne'
    when 'CRO' then 'Croatie'
    when 'COL' then 'Colombie'
    when 'SEN' then 'Senegal'
    when 'MEX' then 'Mexique'
    when 'RSA' then 'Afrique du Sud'
    when 'KOR' then 'Coree du Sud'
    when 'CZE' then 'Tchequie'
    when 'CAN' then 'Canada'
    when 'BIH' then 'Bosnie-Herzegovine'
    when 'QAT' then 'Qatar'
    when 'SUI' then 'Suisse'
    when 'HAI' then 'Haiti'
    when 'SCO' then 'Ecosse'
    when 'USA' then 'Etats-Unis'
    when 'PAR' then 'Paraguay'
    when 'AUS' then 'Australie'
    when 'TUR' then 'Turquie'
    when 'CUW' then 'Curacao'
    when 'CIV' then 'Cote d''Ivoire'
    when 'ECU' then 'Equateur'
    when 'JPN' then 'Japon'
    when 'SWE' then 'Suede'
    when 'TUN' then 'Tunisie'
    when 'EGY' then 'Egypte'
    when 'IRN' then 'Iran'
    when 'NZL' then 'Nouvelle-Zelande'
    when 'CPV' then 'Cap-Vert'
    when 'KSA' then 'Arabie saoudite'
    when 'URU' then 'Uruguay'
    when 'IRQ' then 'Irak'
    when 'NOR' then 'Norvege'
    when 'ALG' then 'Algerie'
    when 'AUT' then 'Autriche'
    when 'JOR' then 'Jordanie'
    when 'COD' then 'RD Congo'
    when 'UZB' then 'Ouzbekistan'
    when 'GHA' then 'Ghana'
    when 'PAN' then 'Panama'
    else upper(coalesce(p_code, ''))
  end;
$$;

create or replace view public.app_rpc_flash_scored_predictions as
select
  fp.id,
  fp.player_id,
  fp.flash_id,
  fp.option_id,
  fp.updated_at,
  case
    when ch.status = 'resolved' and ch.result_option_id = fp.option_id then opt.points_if_correct
    else 0
  end::int as points
from public.app_rpc_flash_predictions fp
join public.app_rpc_flash_challenges ch on ch.id = fp.flash_id
join public.app_rpc_flash_options opt on opt.id = fp.option_id
where ch.status = 'resolved'
  and public.app_private_is_after_scoring_epoch(coalesce(ch.updated_at, fp.updated_at));

create or replace view public.app_rpc_leaderboard as
select
  (row_number() over (
    order by
      ranked.points desc,
      ranked.exact_scores desc,
      ranked.two_point_results desc,
      ranked.first_prediction_at asc nulls last,
      ranked.display_name asc
  ))::int as rank,
  ranked.player_id,
  ranked.nickname,
  ranked.display_name,
  ranked.avatar_url,
  ranked.points,
  ranked.exact_scores,
  ranked.correct_results,
  ranked.two_point_results,
  ranked.one_point_results,
  ranked.first_prediction_at
from (
  select
    p.id as player_id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    (coalesce(match_stats.points, 0) + coalesce(flash_stats.points, 0))::int as points,
    coalesce(match_stats.exact_scores, 0)::int as exact_scores,
    coalesce(match_stats.two_point_results, 0)::int as two_point_results,
    coalesce(match_stats.one_point_results, 0)::int as one_point_results,
    coalesce(match_stats.correct_results, 0)::int as correct_results,
    case
      when match_stats.first_prediction_at is not null and flash_stats.first_prediction_at is not null
        then least(match_stats.first_prediction_at, flash_stats.first_prediction_at)
      else coalesce(match_stats.first_prediction_at, flash_stats.first_prediction_at)
    end as first_prediction_at
  from public.app_rpc_players p
  left join lateral (
    select
      coalesce(sum(sp.points), 0)::int as points,
      coalesce(sum(case when sp.points = 4 * public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team) then 1 else 0 end), 0)::int as exact_scores,
      coalesce(sum(case when sp.points = 2 * public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team) then 1 else 0 end), 0)::int as two_point_results,
      coalesce(sum(case when sp.points = 1 * public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team) then 1 else 0 end), 0)::int as one_point_results,
      coalesce(sum(case when sp.points > 0 then 1 else 0 end), 0)::int as correct_results,
      min(sp.updated_at) as first_prediction_at
    from public.app_rpc_scored_predictions sp
    join public.app_rpc_matches m on m.id = sp.match_id
    where sp.player_id = p.id
  ) match_stats on true
  left join lateral (
    select
      coalesce(sum(fsp.points), 0)::int as points,
      min(fsp.updated_at) as first_prediction_at
    from public.app_rpc_flash_scored_predictions fsp
    where fsp.player_id = p.id
  ) flash_stats on true
) ranked
order by rank asc, ranked.display_name asc;

create or replace function public.app_private_player_state(p_player_id uuid, p_session_token uuid default null)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'player_id', p.id,
      'nickname', p.nickname,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'points', coalesce(lb.points, 0),
      'exact_scores', coalesce(lb.exact_scores, 0),
      'two_point_results', coalesce(lb.two_point_results, 0),
      'one_point_results', coalesce(lb.one_point_results, 0),
      'correct_results', coalesce(lb.correct_results, 0),
      'first_prediction_at', lb.first_prediction_at,
      'rank', lb.rank,
      'session_token', p_session_token
    ),
    'predictions', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', pr.id,
          'player_id', pr.player_id,
          'match_id', pr.match_id,
          'home_score', pr.home_score,
          'away_score', pr.away_score,
          'points', case when sp.id is not null then sp.points else null end,
          'updated_at', pr.updated_at
        ) order by pr.updated_at desc)
        from public.app_rpc_predictions pr
        join public.app_rpc_matches m on m.id = pr.match_id
        left join public.app_rpc_scored_predictions sp on sp.id = pr.id
        where pr.player_id = p.id
          and public.app_private_match_in_current_season(m.status, m.kickoff, m.last_updated)
      ),
      '[]'::jsonb
    )
  )
  from public.app_rpc_players p
  left join public.app_rpc_leaderboard lb on lb.player_id = p.id
  where p.id = p_player_id;
$$;

create or replace function public.app_login_player(p_nickname text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.app_rpc_players%rowtype;
  v_session uuid;
begin
  select *
  into v_player
  from public.app_rpc_players
  where nickname_key = app_normalize_nickname(p_nickname);

  if v_player.id is null then
    raise exception 'Identifiants incorrects';
  end if;

  if not exists (
    select 1
    from public.app_rpc_player_codes c
    where c.player_id = v_player.id
      and c.code_hash = app_private_code_hash(v_player.id, p_code)
  ) then
    raise exception 'Identifiants incorrects';
  end if;

  insert into public.app_rpc_sessions (player_id)
  values (v_player.id)
  returning token into v_session;

  return public.app_private_player_state(v_player.id, v_session)->'player';
end;
$$;

create or replace function public.app_get_player_state(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  v_player_id := app_private_session_player(p_session_token);
  return public.app_private_player_state(v_player_id, p_session_token);
end;
$$;

drop function if exists public.app_get_leaderboard();

create or replace function public.app_get_leaderboard()
returns table (
  player_id uuid,
  nickname text,
  display_name text,
  avatar_url text,
  points int,
  exact_scores int,
  two_point_results int,
  correct_results int,
  first_prediction_at timestamptz,
  rank int
)
language sql
security definer
set search_path = public
as $$
  select
    lb.player_id,
    lb.nickname,
    lb.display_name,
    lb.avatar_url,
    lb.points,
    lb.exact_scores,
    lb.two_point_results,
    lb.correct_results,
    lb.first_prediction_at,
    lb.rank
  from public.app_rpc_leaderboard lb
  order by lb.rank asc, lb.display_name asc;
$$;

drop function if exists public.app_get_matches();

create or replace function public.app_get_matches()
returns table (
  id text,
  external_id text,
  competition_code text,
  competition_name text,
  home_team jsonb,
  away_team jsonb,
  kickoff timestamptz,
  status text,
  home_score int,
  away_score int,
  minute int,
  venue text,
  matchday int,
  stage text,
  round text,
  group_name text,
  season int,
  source_competition_id text,
  points_multiplier int,
  source text,
  last_updated timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    m.id,
    m.external_id,
    m.competition_code,
    m.competition_name,
    m.home_team,
    m.away_team,
    m.kickoff,
    m.status,
    m.home_score,
    m.away_score,
    m.minute,
    m.venue,
    m.matchday,
    m.stage,
    m.round,
    m.group_name,
    m.season,
    m.source_competition_id,
    public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team) as points_multiplier,
    m.source,
    m.last_updated
  from public.app_rpc_matches m
  where (
    coalesce(m.competition_code, '') = 'WC2026'
    or upper(coalesce(m.source_competition_id, '')) = 'WC'
    or lower(coalesce(m.competition_name, '')) like '%world cup%'
    or lower(coalesce(m.competition_name, '')) like '%coupe du monde%'
  )
    and coalesce(m.season, extract(year from m.kickoff)::int) = 2026
    and lower(coalesce(m.competition_name, '')) not like '%qualif%'
    and lower(coalesce(m.competition_name, '')) not like '%qualification%'
    and lower(coalesce(m.competition_name, '')) not like '%friendly%'
    and lower(coalesce(m.competition_name, '')) not like '%amical%'
    and lower(coalesce(m.competition_name, '')) not like '%preparation%'
  order by m.kickoff asc;
$$;

create or replace function public.app_get_public_player_profile(p_player_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'player', jsonb_build_object(
      'player_id', p.id,
      'nickname', p.nickname,
      'display_name', p.display_name,
      'avatar_url', p.avatar_url,
      'points', coalesce(lb.points, 0),
      'exact_scores', coalesce(lb.exact_scores, 0),
      'two_point_results', coalesce(lb.two_point_results, 0),
      'one_point_results', coalesce(lb.one_point_results, 0),
      'correct_results', coalesce(lb.correct_results, 0),
      'first_prediction_at', lb.first_prediction_at,
      'rank', lb.rank,
      'visible_predictions_count', coalesce(
        (
          select count(*)::int
          from public.app_rpc_predictions pr_count
          join public.app_rpc_matches m_count on m_count.id = pr_count.match_id
          where pr_count.player_id = p.id
            and public.app_private_prediction_is_public(m_count.status, m_count.kickoff)
            and public.app_private_match_in_current_season(m_count.status, m_count.kickoff, m_count.last_updated)
        ),
        0
      )
    ),
    'visible_predictions_count', coalesce(
      (
        select count(*)::int
        from public.app_rpc_predictions pr_count
        join public.app_rpc_matches m_count on m_count.id = pr_count.match_id
        where pr_count.player_id = p.id
          and public.app_private_prediction_is_public(m_count.status, m_count.kickoff)
          and public.app_private_match_in_current_season(m_count.status, m_count.kickoff, m_count.last_updated)
      ),
      0
    ),
    'world_cup_winner_prediction', (
      select jsonb_build_object(
        'id', wp.id,
        'player_id', wp.player_id,
        'first_choice_code', wp.first_choice_code,
        'second_choice_code', wp.second_choice_code,
        'third_choice_code', wp.third_choice_code,
        'first_choice_name', wp.first_choice_name,
        'second_choice_name', wp.second_choice_name,
        'third_choice_name', wp.third_choice_name,
        'locked_at', wp.locked_at,
        'created_at', wp.created_at,
        'updated_at', wp.updated_at
      )
      from public.app_rpc_world_cup_winner_predictions wp
      where wp.player_id = p.id
    ),
    'predictions', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', pr.id,
          'prediction_id', pr.id,
          'player_id', pr.player_id,
          'match_id', pr.match_id,
          'home_score', pr.home_score,
          'away_score', pr.away_score,
          'predicted_home_score', pr.home_score,
          'predicted_away_score', pr.away_score,
          'final_home_score', m.home_score,
          'final_away_score', m.away_score,
          'points', case
            when public.app_private_match_is_final(m.status)
              and m.home_score is not null
              and m.away_score is not null
              and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))
            then coalesce(sp.points, 0)
            else null
          end,
          'result_type', case
            when not public.app_private_match_is_final(m.status)
              or m.home_score is null
              or m.away_score is null
              or not public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)) then 'pending'
            when app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 4 then 'exact'
            when app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 2 then 'two-point'
            when app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 1
              and sign(pr.home_score - pr.away_score) = 0
              and sign(m.home_score - m.away_score) = 0 then 'draw'
            when app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 1 then 'winner'
            else 'lost'
          end,
          'is_finished', public.app_private_match_is_final(m.status),
          'is_live', lower(coalesce(m.status, '')) in ('live', 'in_progress', 'in-progress', 'inplay', 'in_play'),
          'is_locked', public.app_private_prediction_is_public(m.status, m.kickoff),
          'created_at', pr.created_at,
          'updated_at', pr.updated_at,
          'match', jsonb_build_object(
            'id', m.id,
            'external_id', m.external_id,
            'competition_code', m.competition_code,
            'competition_name', m.competition_name,
            'home_team', m.home_team,
            'away_team', m.away_team,
            'kickoff', m.kickoff,
            'status', m.status,
            'home_score', m.home_score,
            'away_score', m.away_score,
            'minute', m.minute,
            'venue', m.venue,
            'matchday', m.matchday,
            'stage', m.stage,
            'round', m.round,
            'group_name', m.group_name,
            'season', m.season,
            'source_competition_id', m.source_competition_id,
            'points_multiplier', public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team),
            'source', m.source,
            'last_updated', m.last_updated
          )
        ) order by m.kickoff desc)
        from public.app_rpc_predictions pr
        join public.app_rpc_matches m on m.id = pr.match_id
        left join public.app_rpc_scored_predictions sp on sp.id = pr.id
        where pr.player_id = p.id
          and public.app_private_prediction_is_public(m.status, m.kickoff)
          and public.app_private_match_in_current_season(m.status, m.kickoff, m.last_updated)
      ),
      '[]'::jsonb
    )
  )
  from public.app_rpc_players p
  left join public.app_rpc_leaderboard lb on lb.player_id = p.id
  where p.id = p_player_id;
$$;

create or replace function public.app_get_public_match_predictions(p_match_id text)
returns table (
  prediction_id uuid,
  player_id uuid,
  nickname text,
  display_name text,
  avatar_url text,
  match_id text,
  predicted_home_score int,
  predicted_away_score int,
  final_home_score int,
  final_away_score int,
  points int,
  result_type text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    pr.id as prediction_id,
    p.id as player_id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    pr.match_id,
    pr.home_score as predicted_home_score,
    pr.away_score as predicted_away_score,
    m.home_score as final_home_score,
    m.away_score as final_away_score,
    case
      when public.app_private_match_is_final(m.status)
        and m.home_score is not null
        and m.away_score is not null
        and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)) then coalesce(sp.points, 0)
      else null
    end as points,
    case
      when not public.app_private_match_is_final(m.status)
        or m.home_score is null
        or m.away_score is null
        or not public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated)) then 'pending'
      when public.app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 4 then 'exact'
      when public.app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 2 then 'two-point'
      when public.app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 1
        and sign(pr.home_score - pr.away_score) = 0
        and sign(m.home_score - m.away_score) = 0 then 'draw'
      when public.app_private_prediction_points(pr.home_score, pr.away_score, m.home_score, m.away_score, 1) = 1 then 'winner'
      else 'lost'
    end::text as result_type,
    pr.updated_at
  from public.app_rpc_predictions pr
  join public.app_rpc_matches m on m.id = pr.match_id
  join public.app_rpc_players p on p.id = pr.player_id
  left join public.app_rpc_scored_predictions sp on sp.id = pr.id
  where pr.match_id = p_match_id
    and public.app_private_prediction_is_public(m.status, m.kickoff)
    and public.app_private_match_in_current_season(m.status, m.kickoff, m.last_updated)
  order by pr.home_score asc, pr.away_score asc, p.display_name asc;
$$;

create or replace function public.app_get_recent_exact_predictions()
returns jsonb
language sql
security definer
set search_path = public
as $$
  with exact_rows as (
    select
      m.id as match_id,
      m.external_id,
      m.competition_code,
      m.competition_name,
      m.home_team,
      m.away_team,
      m.kickoff,
      m.status,
      m.home_score as final_home_score,
      m.away_score as final_away_score,
      m.minute,
      m.venue,
      m.matchday,
      m.stage,
      m.round,
      m.group_name,
      m.season,
      m.source_competition_id,
      public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team) as points_multiplier,
      m.source,
      m.last_updated,
      p.id as player_id,
      p.nickname,
      p.display_name,
      p.avatar_url,
      pr.home_score as prediction_home_score,
      pr.away_score as prediction_away_score
    from public.app_rpc_predictions pr
    join public.app_rpc_matches m on m.id = pr.match_id
    join public.app_rpc_players p on p.id = pr.player_id
    where public.app_private_match_is_final(m.status)
      and m.home_score is not null
      and m.away_score is not null
      and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))
      and pr.home_score = m.home_score
      and pr.away_score = m.away_score
  ),
  grouped as (
    select
      match_id,
      external_id,
      competition_code,
      competition_name,
      home_team,
      away_team,
      kickoff,
      status,
      final_home_score,
      final_away_score,
      minute,
      venue,
      matchday,
      stage,
      round,
      group_name,
      season,
      source_competition_id,
      points_multiplier,
      source,
      last_updated,
      jsonb_agg(jsonb_build_object(
        'player_id', player_id,
        'nickname', nickname,
        'display_name', display_name,
        'avatar_url', avatar_url,
        'home_score', prediction_home_score,
        'away_score', prediction_away_score
      ) order by display_name asc) as winners
    from exact_rows
    group by
      match_id,
      external_id,
      competition_code,
      competition_name,
      home_team,
      away_team,
      kickoff,
      status,
      final_home_score,
      final_away_score,
      minute,
      venue,
      matchday,
      stage,
      round,
      group_name,
      season,
      source_competition_id,
      points_multiplier,
      source,
      last_updated
    order by kickoff desc
    limit 3
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'match_id', match_id,
    'match', jsonb_build_object(
      'id', match_id,
      'external_id', external_id,
      'competition_code', competition_code,
      'competition_name', competition_name,
      'home_team', home_team,
      'away_team', away_team,
      'kickoff', kickoff,
      'status', status,
      'home_score', final_home_score,
      'away_score', final_away_score,
      'minute', minute,
      'venue', venue,
      'matchday', matchday,
      'stage', stage,
      'round', round,
      'group_name', group_name,
      'season', season,
      'source_competition_id', source_competition_id,
      'points_multiplier', points_multiplier,
      'source', source,
      'last_updated', last_updated
    ),
    'winners', winners
  ) order by kickoff desc), '[]'::jsonb)
  from grouped;
$$;

create or replace function public.app_create_weekly_leaderboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week_start timestamptz := ((date_trunc('week', timezone('Europe/Paris', now())) - interval '7 days') at time zone 'Europe/Paris');
  v_week_end timestamptz := (date_trunc('week', timezone('Europe/Paris', now())) at time zone 'Europe/Paris');
  v_period_label text;
  v_inserted int := 0;
begin
  select period_label
  into v_period_label
  from public.app_rpc_leaderboard_snapshots
  where period_type = 'weekly'
    and week_start = v_week_start
  limit 1;

  if v_period_label is null then
    select 'Semaine ' || (count(distinct week_start) + 1)::text
    into v_period_label
    from public.app_rpc_leaderboard_snapshots
    where period_type = 'weekly';
  end if;

  delete from public.app_rpc_leaderboard_snapshots
  where period_type = 'weekly'
    and week_start = v_week_start;

  insert into public.app_rpc_leaderboard_snapshots (
    period_type,
    period_label,
    week_start,
    week_end,
    snapshot_at,
    player_id,
    rank,
    points,
    exact_scores,
    two_point_results,
    first_prediction_at
  )
  select
    'weekly',
    v_period_label,
    v_week_start,
    v_week_end,
    now(),
    lb.player_id,
    lb.rank,
    lb.points,
    lb.exact_scores,
    lb.two_point_results,
    lb.first_prediction_at
  from public.app_rpc_leaderboard lb
  order by lb.rank asc;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'period_label', v_period_label,
    'week_start', v_week_start,
    'week_end', v_week_end,
    'inserted_count', v_inserted
  );
end;
$$;

drop function if exists public.app_get_leaderboard_history(int);

create or replace function public.app_get_leaderboard_history(p_limit_weeks int default 104)
returns table (
  period_label text,
  snapshot_at timestamptz,
  player_id uuid,
  nickname text,
  display_name text,
  avatar_url text,
  rank int,
  points int,
  exact_scores int,
  two_point_results int,
  first_prediction_at timestamptz,
  is_current boolean
)
language sql
security definer
set search_path = public
as $$
  with params as (
    select greatest(1, coalesce(p_limit_weeks, 104))::int as limit_weeks
  ),
  epoch as (
    select public.app_private_scoring_epoch_start() as start_at
  ),
  match_events as (
    select
      pr.player_id,
      date_trunc('day', public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))::date as event_day,
      coalesce(sp.points, 0)::int as points,
      case when coalesce(sp.points, 0) = 4 * mult.value then 1 else 0 end::int as exact_scores,
      case when coalesce(sp.points, 0) = 2 * mult.value then 1 else 0 end::int as two_point_results,
      pr.updated_at as first_prediction_at
    from public.app_rpc_predictions pr
    join public.app_rpc_matches m on m.id = pr.match_id
    left join public.app_rpc_scored_predictions sp on sp.id = pr.id
    cross join lateral (
      select public.app_private_match_multiplier(m.points_multiplier, m.competition_code, m.competition_name, m.stage, m.round, m.matchday, m.home_team, m.away_team) as value
    ) mult
    where public.app_private_match_is_final(m.status)
      and m.home_score is not null
      and m.away_score is not null
      and public.app_private_is_after_scoring_epoch(public.app_private_match_scoring_event_at(m.kickoff, m.last_updated))
  ),
  flash_events as (
    select
      fsp.player_id,
      date_trunc('day', coalesce(ch.updated_at, fsp.updated_at))::date as event_day,
      coalesce(fsp.points, 0)::int as points,
      0::int as exact_scores,
      0::int as two_point_results,
      fsp.updated_at as first_prediction_at
    from public.app_rpc_flash_scored_predictions fsp
    join public.app_rpc_flash_challenges ch on ch.id = fsp.flash_id
    where ch.status = 'resolved'
      and public.app_private_is_after_scoring_epoch(coalesce(ch.updated_at, fsp.updated_at))
  ),
  scoring_events as (
    select * from match_events
    union all
    select * from flash_events
  ),
  first_scoring as (
    select min(event_day) as first_day
    from scoring_events
    where points > 0
  ),
  bounds as (
    select
      greatest(
        first_day,
        coalesce((select start_at::date from epoch), first_day),
        (current_date - ((select limit_weeks from params) * 7 - 1))::date
      ) as start_day,
      current_date as end_day,
      first_day
    from first_scoring
    where first_day is not null
  ),
  days as (
    select generate_series(start_day, end_day, interval '1 day')::date as event_day
    from bounds
  ),
  daily_totals as (
    select
      player_id,
      event_day,
      sum(points)::int as points,
      sum(exact_scores)::int as exact_scores,
      sum(two_point_results)::int as two_point_results,
      min(first_prediction_at) as first_prediction_at
    from scoring_events
    group by player_id, event_day
  ),
  player_days as (
    select
      d.event_day,
      p.id as player_id,
      p.nickname,
      p.display_name,
      p.avatar_url
    from days d
    cross join public.app_rpc_players p
  ),
  cumulative_rows as (
    select
      pd.event_day,
      pd.player_id,
      pd.nickname,
      pd.display_name,
      pd.avatar_url,
      coalesce(sum(coalesce(dt.points, 0)) over (partition by pd.player_id order by pd.event_day rows between unbounded preceding and current row), 0)::int as points,
      coalesce(sum(coalesce(dt.exact_scores, 0)) over (partition by pd.player_id order by pd.event_day rows between unbounded preceding and current row), 0)::int as exact_scores,
      coalesce(sum(coalesce(dt.two_point_results, 0)) over (partition by pd.player_id order by pd.event_day rows between unbounded preceding and current row), 0)::int as two_point_results,
      min(dt.first_prediction_at) over (partition by pd.player_id order by pd.event_day rows between unbounded preceding and current row) as first_prediction_at
    from player_days pd
    left join daily_totals dt on dt.player_id = pd.player_id and dt.event_day = pd.event_day
  ),
  ranked_rows as (
    select
      to_char(event_day, 'DD/MM') as period_label,
      event_day::timestamptz as snapshot_at,
      player_id,
      nickname,
      display_name,
      avatar_url,
      (row_number() over (
        partition by event_day
        order by points desc, exact_scores desc, two_point_results desc, first_prediction_at asc nulls last, display_name asc
      ))::int as rank,
      points,
      exact_scores,
      two_point_results,
      first_prediction_at,
      event_day = current_date as is_current
    from cumulative_rows
  ),
  current_rows as (
    select
      'En cours'::text as period_label,
      now() as snapshot_at,
      lb.player_id,
      lb.nickname,
      lb.display_name,
      lb.avatar_url,
      lb.rank,
      lb.points,
      lb.exact_scores,
      lb.two_point_results,
      lb.first_prediction_at,
      true as is_current
    from public.app_rpc_leaderboard lb
    where not exists (select 1 from bounds)
  )
  select *
  from ranked_rows
  union all
  select *
  from current_rows
  order by is_current asc, snapshot_at asc, rank asc;
$$;

create or replace function public.app_private_save_prediction(
  p_player_id uuid,
  p_match_id text,
  p_home_score int,
  p_away_score int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.app_rpc_matches%rowtype;
  v_prediction public.app_rpc_predictions%rowtype;
begin
  if p_home_score < 0 or p_home_score > 30 or p_away_score < 0 or p_away_score > 30 then
    raise exception 'Score invalide';
  end if;

  select *
  into v_match
  from public.app_rpc_matches
  where id = p_match_id;

  if v_match.id is null then
    raise exception 'Match introuvable dans Supabase';
  end if;

  if not (
    (
      coalesce(v_match.competition_code, '') = 'WC2026'
      or upper(coalesce(v_match.source_competition_id, '')) = 'WC'
      or lower(coalesce(v_match.competition_name, '')) like '%world cup%'
      or lower(coalesce(v_match.competition_name, '')) like '%coupe du monde%'
    )
    and coalesce(v_match.season, extract(year from v_match.kickoff)::int) = 2026
    and lower(coalesce(v_match.competition_name, '')) not like '%qualif%'
    and lower(coalesce(v_match.competition_name, '')) not like '%qualification%'
    and lower(coalesce(v_match.competition_name, '')) not like '%friendly%'
    and lower(coalesce(v_match.competition_name, '')) not like '%amical%'
    and lower(coalesce(v_match.competition_name, '')) not like '%preparation%'
  ) then
    raise exception 'Match hors Coupe du Monde';
  end if;

  if v_match.status <> 'upcoming' or v_match.kickoff <= now() then
    raise exception 'Pronostics verrouilles pour ce match';
  end if;

  insert into public.app_rpc_predictions (player_id, match_id, home_score, away_score, updated_at)
  values (p_player_id, p_match_id, p_home_score, p_away_score, now())
  on conflict (player_id, match_id) do update set
    home_score = excluded.home_score,
    away_score = excluded.away_score,
    updated_at = excluded.updated_at
  returning * into v_prediction;

  return jsonb_build_object(
    'id', v_prediction.id,
    'player_id', v_prediction.player_id,
    'match_id', v_prediction.match_id,
    'home_score', v_prediction.home_score,
    'away_score', v_prediction.away_score,
    'updated_at', v_prediction.updated_at
  );
end;
$$;

create or replace function public.app_save_prediction_by_session(
  p_session_token uuid,
  p_match_id text,
  p_home_score int,
  p_away_score int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  v_player_id := app_private_session_player(p_session_token);
  return app_private_save_prediction(v_player_id, p_match_id, p_home_score, p_away_score);
end;
$$;

create or replace function public.app_save_prediction(
  p_player_id uuid,
  p_match_id text,
  p_home_score int,
  p_away_score int,
  p_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.app_rpc_player_codes c
    where c.player_id = p_player_id
      and c.code_hash = app_private_code_hash(p_player_id, p_code)
  ) then
    raise exception 'Identifiants incorrects';
  end if;

  return app_private_save_prediction(p_player_id, p_match_id, p_home_score, p_away_score);
end;
$$;

create or replace function public.app_sync_local_predictions(p_session_token uuid, p_predictions jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_item jsonb;
  v_count int := 0;
  v_home int;
  v_away int;
  v_match_id text;
  v_updated_at timestamptz;
begin
  v_player_id := app_private_session_player(p_session_token);

  for v_item in select * from jsonb_array_elements(coalesce(p_predictions, '[]'::jsonb))
  loop
    v_match_id := v_item->>'match_id';
    if coalesce(v_item->>'home_score', '') !~ '^[0-9]+$' or coalesce(v_item->>'away_score', '') !~ '^[0-9]+$' then
      continue;
    end if;
    v_home := (v_item->>'home_score')::int;
    v_away := (v_item->>'away_score')::int;
    begin
      v_updated_at := coalesce((v_item->>'updated_at')::timestamptz, now());
    exception
      when others then
        v_updated_at := now();
    end;

    if v_match_id is null or v_home < 0 or v_home > 30 or v_away < 0 or v_away > 30 then
      continue;
    end if;

    if exists (
      select 1
      from public.app_rpc_predictions existing
      where existing.player_id = v_player_id
        and existing.match_id = v_match_id
        and existing.updated_at > v_updated_at
    ) then
      continue;
    end if;

    begin
      perform public.app_private_save_prediction(v_player_id, v_match_id, v_home, v_away);
      update public.app_rpc_predictions
      set updated_at = v_updated_at
      where player_id = v_player_id
        and match_id = v_match_id;
      v_count := v_count + 1;
    exception
      when others then
        continue;
    end;
  end loop;

  return jsonb_build_object('synced_count', v_count);
end;
$$;

create or replace function public.app_get_world_cup_winner_prediction_by_session(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  v_player_id := app_private_session_player(p_session_token);

  return (
    select jsonb_build_object(
      'id', wp.id,
      'player_id', wp.player_id,
      'first_choice_code', wp.first_choice_code,
      'second_choice_code', wp.second_choice_code,
      'third_choice_code', wp.third_choice_code,
      'first_choice_name', wp.first_choice_name,
      'second_choice_name', wp.second_choice_name,
      'third_choice_name', wp.third_choice_name,
      'locked_at', wp.locked_at,
      'created_at', wp.created_at,
      'updated_at', wp.updated_at
    )
    from public.app_rpc_world_cup_winner_predictions wp
    where wp.player_id = v_player_id
  );
end;
$$;

create or replace function public.app_save_world_cup_winner_prediction_by_session(
  p_session_token uuid,
  p_first_code text,
  p_second_code text,
  p_third_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_prediction public.app_rpc_world_cup_winner_predictions%rowtype;
  v_first text := upper(trim(coalesce(p_first_code, '')));
  v_second text := upper(trim(coalesce(p_second_code, '')));
  v_third text := upper(trim(coalesce(p_third_code, '')));
begin
  v_player_id := app_private_session_player(p_session_token);

  if v_first = '' or v_second = '' or v_third = '' or v_first = v_second or v_first = v_third or v_second = v_third then
    raise exception 'Top 3 invalide';
  end if;

  if public.app_private_world_cup_country_name(v_first) = v_first
    or public.app_private_world_cup_country_name(v_second) = v_second
    or public.app_private_world_cup_country_name(v_third) = v_third then
    raise exception 'Pays indisponible pour le Top 3';
  end if;

  if now() >= timestamptz '2026-06-17T00:00:00Z' then
    raise exception 'Prediction champion du monde verrouillee';
  end if;

  insert into public.app_rpc_world_cup_winner_predictions (
    player_id,
    first_choice_code,
    second_choice_code,
    third_choice_code,
    first_choice_name,
    second_choice_name,
    third_choice_name,
    updated_at
  )
  values (
    v_player_id,
    v_first,
    v_second,
    v_third,
    public.app_private_world_cup_country_name(v_first),
    public.app_private_world_cup_country_name(v_second),
    public.app_private_world_cup_country_name(v_third),
    now()
  )
  on conflict (player_id) do update set
    first_choice_code = excluded.first_choice_code,
    second_choice_code = excluded.second_choice_code,
    third_choice_code = excluded.third_choice_code,
    first_choice_name = excluded.first_choice_name,
    second_choice_name = excluded.second_choice_name,
    third_choice_name = excluded.third_choice_name,
    updated_at = excluded.updated_at
  where public.app_rpc_world_cup_winner_predictions.locked_at is null
  returning * into v_prediction;

  if v_prediction.id is null then
    raise exception 'Top 3 verrouille';
  end if;

  return jsonb_build_object(
    'id', v_prediction.id,
    'player_id', v_prediction.player_id,
    'first_choice_code', v_prediction.first_choice_code,
    'second_choice_code', v_prediction.second_choice_code,
    'third_choice_code', v_prediction.third_choice_code,
    'first_choice_name', v_prediction.first_choice_name,
    'second_choice_name', v_prediction.second_choice_name,
    'third_choice_name', v_prediction.third_choice_name,
    'locked_at', v_prediction.locked_at,
    'created_at', v_prediction.created_at,
    'updated_at', v_prediction.updated_at
  );
end;
$$;

create or replace function public.app_private_flash_options_json(p_flash_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', fo.id,
    'flash_id', fo.flash_id,
    'label', fo.label,
    'points_if_correct', fo.points_if_correct,
    'sort_order', fo.sort_order
  ) order by fo.sort_order asc, fo.label asc), '[]'::jsonb)
  from public.app_rpc_flash_options fo
  where fo.flash_id = p_flash_id;
$$;

create or replace function public.app_private_flash_challenge_json(p_flash_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', ch.id,
    'title', ch.title,
    'description', ch.description,
    'match_id', ch.match_id,
    'match_label', ch.match_label,
    'closes_at', ch.closes_at,
    'status', ch.status,
    'result_option_id', ch.result_option_id,
    'created_at', ch.created_at,
    'updated_at', ch.updated_at,
    'options', public.app_private_flash_options_json(ch.id)
  )
  from public.app_rpc_flash_challenges ch
  where ch.id = p_flash_id;
$$;

create or replace function public.app_get_active_flash_challenges(p_session_token uuid default null)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(public.app_private_flash_challenge_json(ch.id) order by ch.closes_at asc), '[]'::jsonb)
  from public.app_rpc_flash_challenges ch
  where ch.status = 'open'
    and ch.closes_at > now();
$$;

create or replace function public.app_save_flash_prediction_by_session(
  p_session_token uuid,
  p_flash_id uuid,
  p_option_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_challenge public.app_rpc_flash_challenges%rowtype;
  v_prediction public.app_rpc_flash_predictions%rowtype;
begin
  v_player_id := app_private_session_player(p_session_token);

  select *
  into v_challenge
  from public.app_rpc_flash_challenges
  where id = p_flash_id;

  if v_challenge.id is null then
    raise exception 'Flash introuvable';
  end if;

  if v_challenge.status <> 'open' or v_challenge.closes_at <= now() then
    raise exception 'Flash ferme';
  end if;

  if not exists (
    select 1
    from public.app_rpc_flash_options fo
    where fo.id = p_option_id
      and fo.flash_id = p_flash_id
  ) then
    raise exception 'Option invalide';
  end if;

  insert into public.app_rpc_flash_predictions (flash_id, option_id, player_id, updated_at)
  values (p_flash_id, p_option_id, v_player_id, now())
  on conflict (flash_id, player_id) do update set
    option_id = excluded.option_id,
    updated_at = excluded.updated_at
  returning * into v_prediction;

  return jsonb_build_object(
    'id', v_prediction.id,
    'flash_id', v_prediction.flash_id,
    'option_id', v_prediction.option_id,
    'player_id', v_prediction.player_id,
    'points', null,
    'created_at', v_prediction.created_at,
    'updated_at', v_prediction.updated_at
  );
end;
$$;

create or replace function public.app_get_player_flash_predictions_by_session(p_session_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  v_player_id := app_private_session_player(p_session_token);

  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', fp.id,
      'flash_id', fp.flash_id,
      'option_id', fp.option_id,
      'player_id', fp.player_id,
      'points', case when fsp.id is not null then fsp.points else null end,
      'created_at', fp.created_at,
      'updated_at', fp.updated_at,
      'challenge', public.app_private_flash_challenge_json(fp.flash_id),
      'selected_option', jsonb_build_object(
        'id', fo.id,
        'flash_id', fo.flash_id,
        'label', fo.label,
        'points_if_correct', fo.points_if_correct,
        'sort_order', fo.sort_order
      )
    ) order by fp.updated_at desc), '[]'::jsonb)
    from public.app_rpc_flash_predictions fp
    join public.app_rpc_flash_challenges ch on ch.id = fp.flash_id
    join public.app_rpc_flash_options fo on fo.id = fp.option_id
    left join public.app_rpc_flash_scored_predictions fsp on fsp.id = fp.id
    where fp.player_id = v_player_id
      and public.app_private_flash_in_current_season(ch.status, ch.closes_at, coalesce(ch.updated_at, fp.updated_at))
  );
end;
$$;

create or replace function public.app_get_public_player_flash_predictions(p_player_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', fp.id,
    'flash_id', fp.flash_id,
    'option_id', fp.option_id,
    'player_id', fp.player_id,
    'points', case
      when ch.status = 'resolved'
        and public.app_private_is_after_scoring_epoch(coalesce(ch.updated_at, fp.updated_at))
      then coalesce(fsp.points, 0)
      else null
    end,
    'created_at', fp.created_at,
    'updated_at', fp.updated_at,
    'challenge', public.app_private_flash_challenge_json(fp.flash_id),
    'selected_option', jsonb_build_object(
      'id', fo.id,
      'flash_id', fo.flash_id,
      'label', fo.label,
      'points_if_correct', fo.points_if_correct,
      'sort_order', fo.sort_order
    )
  ) order by fp.updated_at desc), '[]'::jsonb)
  from public.app_rpc_flash_predictions fp
  join public.app_rpc_flash_challenges ch on ch.id = fp.flash_id
  join public.app_rpc_flash_options fo on fo.id = fp.option_id
  left join public.app_rpc_flash_scored_predictions fsp on fsp.id = fp.id
  where fp.player_id = p_player_id
    and (ch.status in ('closed', 'resolved') or ch.closes_at <= now())
    and public.app_private_flash_in_current_season(ch.status, ch.closes_at, coalesce(ch.updated_at, fp.updated_at));
$$;

create or replace function public.app_update_player_avatar(p_session_token uuid, p_avatar_url text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
begin
  v_player_id := app_private_session_player(p_session_token);

  if p_avatar_url is not null and length(p_avatar_url) > 350000 then
    raise exception 'Avatar trop lourd';
  end if;

  update public.app_rpc_players
  set avatar_url = nullif(p_avatar_url, ''),
      updated_at = now()
  where id = v_player_id;

  return public.app_private_player_state(v_player_id, p_session_token)->'player';
end;
$$;

drop function if exists public.app_sync_matches(jsonb);

create or replace function public.app_sync_matches(p_sync_token text, p_matches jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_count int := 0;
begin
  perform public.app_private_require_match_sync_token(p_sync_token);

  for v_item in select * from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb))
  loop
    if coalesce(v_item->>'id', '') = '' or coalesce(v_item->>'kickoff', '') = '' then
      continue;
    end if;

    insert into public.app_rpc_matches (
      id,
      external_id,
      competition_code,
      competition_name,
      home_team,
      away_team,
      kickoff,
      status,
      home_score,
      away_score,
      minute,
      venue,
      matchday,
      stage,
      round,
      group_name,
      season,
      source_competition_id,
      points_multiplier,
      source,
      last_updated,
      updated_at
    )
    values (
      v_item->>'id',
      nullif(v_item->>'external_id', ''),
      nullif(v_item->>'competition_code', ''),
      nullif(v_item->>'competition_name', ''),
      coalesce(v_item->'home_team', '{}'::jsonb),
      coalesce(v_item->'away_team', '{}'::jsonb),
      (v_item->>'kickoff')::timestamptz,
      coalesce(nullif(v_item->>'status', ''), 'upcoming'),
      nullif(v_item->>'home_score', '')::int,
      nullif(v_item->>'away_score', '')::int,
      nullif(v_item->>'minute', '')::int,
      nullif(v_item->>'venue', ''),
      nullif(v_item->>'matchday', '')::int,
      nullif(v_item->>'stage', ''),
      nullif(v_item->>'round', ''),
      nullif(v_item->>'group_name', ''),
      nullif(v_item->>'season', '')::int,
      nullif(v_item->>'source_competition_id', ''),
      greatest(1, coalesce(nullif(v_item->>'points_multiplier', '')::int, 1)),
      nullif(v_item->>'source', ''),
      nullif(v_item->>'last_updated', '')::timestamptz,
      now()
    )
    on conflict (id) do update set
      external_id = excluded.external_id,
      competition_code = excluded.competition_code,
      competition_name = excluded.competition_name,
      home_team = excluded.home_team,
      away_team = excluded.away_team,
      kickoff = excluded.kickoff,
      status = excluded.status,
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      minute = excluded.minute,
      venue = excluded.venue,
      matchday = excluded.matchday,
      stage = excluded.stage,
      round = excluded.round,
      group_name = excluded.group_name,
      season = excluded.season,
      source_competition_id = excluded.source_competition_id,
      points_multiplier = excluded.points_multiplier,
      source = excluded.source,
      last_updated = excluded.last_updated,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('synced_count', v_count);
end;
$$;

revoke all on function public.app_admin_create_player(text, text) from public, anon, authenticated;
revoke all on function public.app_private_text_hash(text) from public, anon, authenticated;
revoke all on function public.app_private_code_hash(uuid, text) from public, anon, authenticated;
revoke all on function public.app_private_require_match_sync_token(text) from public, anon, authenticated;
revoke all on function public.app_private_session_player(uuid) from public, anon, authenticated;
revoke all on function public.app_private_prediction_points(int, int, int, int, int) from public, anon, authenticated;
revoke all on function public.app_private_prediction_is_public(text, timestamptz) from public, anon, authenticated;
revoke all on function public.app_private_match_is_final(text) from public, anon, authenticated;
revoke all on function public.app_private_scoring_epoch_start() from public, anon, authenticated;
revoke all on function public.app_private_is_after_scoring_epoch(timestamptz) from public, anon, authenticated;
revoke all on function public.app_private_match_scoring_event_at(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.app_private_match_in_current_season(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.app_private_flash_in_current_season(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.app_admin_set_scoring_epoch(timestamptz) from public, anon, authenticated;
revoke all on function public.app_admin_reset_competition_for_world_cup() from public, anon, authenticated;
revoke all on function public.app_private_match_multiplier(int, text, text, text, text, int, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.app_private_player_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_private_save_prediction(uuid, text, int, int) from public, anon, authenticated;
revoke all on function public.app_create_weekly_leaderboard_snapshot() from public, anon, authenticated;
revoke all on function public.app_private_world_cup_country_name(text) from public, anon, authenticated;
revoke all on function public.app_private_flash_options_json(uuid) from public, anon, authenticated;
revoke all on function public.app_private_flash_challenge_json(uuid) from public, anon, authenticated;
revoke all on function public.app_save_prediction(uuid, text, int, int, text) from public, anon, authenticated;

grant execute on function public.app_login_player(text, text) to anon;
grant execute on function public.app_get_player_state(uuid) to anon;
grant execute on function public.app_get_leaderboard() to anon;
grant execute on function public.app_get_matches() to anon;
grant execute on function public.app_get_public_player_profile(uuid) to anon;
grant execute on function public.app_get_public_match_predictions(text) to anon;
grant execute on function public.app_get_recent_exact_predictions() to anon;
grant execute on function public.app_get_leaderboard_history(int) to anon;
grant execute on function public.app_save_prediction_by_session(uuid, text, int, int) to anon;
grant execute on function public.app_sync_local_predictions(uuid, jsonb) to anon;
grant execute on function public.app_update_player_avatar(uuid, text) to anon;
grant execute on function public.app_sync_matches(text, jsonb) to anon;
grant execute on function public.app_get_world_cup_winner_prediction_by_session(uuid) to anon;
grant execute on function public.app_save_world_cup_winner_prediction_by_session(uuid, text, text, text) to anon;
grant execute on function public.app_get_active_flash_challenges(uuid) to anon;
grant execute on function public.app_save_flash_prediction_by_session(uuid, uuid, uuid) to anon;
grant execute on function public.app_get_player_flash_predictions_by_session(uuid) to anon;
grant execute on function public.app_get_public_player_flash_predictions(uuid) to anon;

select pg_notify('pgrst', 'reload schema');
