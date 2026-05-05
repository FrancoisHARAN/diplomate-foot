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

create extension if not exists pgcrypto;

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
  points_multiplier integer not null default 1 check (points_multiplier between 1 and 10),
  source text,
  last_updated timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_rpc_predictions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.app_rpc_players(id) on delete cascade,
  match_id text not null,
  home_score integer not null check (home_score between 0 and 30),
  away_score integer not null check (away_score between 0 and 30),
  updated_at timestamptz not null default now(),
  unique(player_id, match_id)
);

create index if not exists idx_app_rpc_players_nickname_key on public.app_rpc_players(nickname_key);
create index if not exists idx_app_rpc_sessions_player_id on public.app_rpc_sessions(player_id);
create index if not exists idx_app_rpc_sessions_expires_at on public.app_rpc_sessions(expires_at);
create index if not exists idx_app_rpc_matches_kickoff on public.app_rpc_matches(kickoff);
create index if not exists idx_app_rpc_matches_status on public.app_rpc_matches(status);
create index if not exists idx_app_rpc_predictions_player_id on public.app_rpc_predictions(player_id);
create index if not exists idx_app_rpc_predictions_match_id on public.app_rpc_predictions(match_id);
create index if not exists idx_app_rpc_predictions_updated_at on public.app_rpc_predictions(updated_at desc);

alter table public.app_rpc_players enable row level security;
alter table public.app_rpc_player_codes enable row level security;
alter table public.app_rpc_sessions enable row level security;
alter table public.app_rpc_matches enable row level security;
alter table public.app_rpc_predictions enable row level security;

revoke all on public.app_rpc_players from anon, authenticated;
revoke all on public.app_rpc_player_codes from anon, authenticated;
revoke all on public.app_rpc_sessions from anon, authenticated;
revoke all on public.app_rpc_matches from anon, authenticated;
revoke all on public.app_rpc_predictions from anon, authenticated;
grant usage on schema public to anon, authenticated;

drop policy if exists "app rpc matches public read" on public.app_rpc_matches;
create policy "app rpc matches public read"
  on public.app_rpc_matches
  for select
  using (true);

grant select on public.app_rpc_matches to anon;

create or replace function public.app_private_code_hash(p_player_id uuid, p_code text)
returns text
language sql
stable
as $$
  select encode(digest(p_player_id::text || ':' || coalesce(p_code, ''), 'sha256'), 'hex');
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
    when p_home_prediction = p_home_score and p_away_prediction = p_away_score then 3 * greatest(1, coalesce(p_multiplier, 1))
    when (p_home_prediction - p_away_prediction) = (p_home_score - p_away_score) then 2 * greatest(1, coalesce(p_multiplier, 1))
    when sign(p_home_prediction - p_away_prediction) = sign(p_home_score - p_away_score)
      and sign(p_home_score - p_away_score) <> 0 then 1 * greatest(1, coalesce(p_multiplier, 1))
    else 0
  end;
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
    m.points_multiplier
  ), 0) as points
from public.app_rpc_predictions pr
left join public.app_rpc_matches m on m.id = pr.match_id
where m.status = 'finished';

create or replace view public.app_rpc_leaderboard as
select
  ranked.rank,
  ranked.player_id,
  ranked.nickname,
  ranked.display_name,
  ranked.avatar_url,
  ranked.points,
  ranked.exact_scores,
  ranked.correct_results
from (
  select
    p.id as player_id,
    p.nickname,
    p.display_name,
    p.avatar_url,
    coalesce(sum(sp.points), 0)::int as points,
    coalesce(sum(case when sp.points >= 3 * coalesce(m.points_multiplier, 1) then 1 else 0 end), 0)::int as exact_scores,
    coalesce(sum(case when sp.points > 0 then 1 else 0 end), 0)::int as correct_results,
    (rank() over (order by coalesce(sum(sp.points), 0) desc, p.display_name asc))::int as rank
  from public.app_rpc_players p
  left join public.app_rpc_scored_predictions sp on sp.player_id = p.id
  left join public.app_rpc_matches m on m.id = sp.match_id
  group by p.id, p.nickname, p.display_name, p.avatar_url
) ranked
order by ranked.rank asc, ranked.display_name asc;

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
      'correct_results', coalesce(lb.correct_results, 0),
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
          'points', coalesce(sp.points, 0),
          'updated_at', pr.updated_at
        ) order by pr.updated_at desc)
        from public.app_rpc_predictions pr
        left join public.app_rpc_scored_predictions sp on sp.id = pr.id
        where pr.player_id = p.id
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

create or replace function public.app_get_leaderboard()
returns table (
  player_id uuid,
  nickname text,
  display_name text,
  avatar_url text,
  points int,
  exact_scores int,
  correct_results int,
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
    lb.correct_results,
    lb.rank
  from public.app_rpc_leaderboard lb
  order by lb.rank asc, lb.display_name asc;
$$;

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
    m.points_multiplier,
    m.source,
    m.last_updated
  from public.app_rpc_matches m
  order by m.kickoff asc;
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
    v_home := (v_item->>'home_score')::int;
    v_away := (v_item->>'away_score')::int;
    v_updated_at := coalesce((v_item->>'updated_at')::timestamptz, now());

    if v_match_id is null or v_home < 0 or v_home > 30 or v_away < 0 or v_away > 30 then
      continue;
    end if;

    insert into public.app_rpc_predictions (player_id, match_id, home_score, away_score, updated_at)
    values (v_player_id, v_match_id, v_home, v_away, v_updated_at)
    on conflict (player_id, match_id) do update set
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      updated_at = excluded.updated_at
    where public.app_rpc_predictions.updated_at <= excluded.updated_at;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('synced_count', v_count);
end;
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

  update public.app_rpc_players
  set avatar_url = nullif(p_avatar_url, ''),
      updated_at = now()
  where id = v_player_id;

  return public.app_private_player_state(v_player_id, p_session_token)->'player';
end;
$$;

create or replace function public.app_sync_matches(p_matches jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_count int := 0;
begin
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
revoke all on function public.app_private_code_hash(uuid, text) from public, anon, authenticated;
revoke all on function public.app_private_session_player(uuid) from public, anon, authenticated;
revoke all on function public.app_private_prediction_points(int, int, int, int, int) from public, anon, authenticated;
revoke all on function public.app_private_player_state(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_private_save_prediction(uuid, text, int, int) from public, anon, authenticated;

grant execute on function public.app_login_player(text, text) to anon;
grant execute on function public.app_get_player_state(uuid) to anon;
grant execute on function public.app_get_leaderboard() to anon;
grant execute on function public.app_get_matches() to anon;
grant execute on function public.app_save_prediction_by_session(uuid, text, int, int) to anon;
grant execute on function public.app_save_prediction(uuid, text, int, int, text) to anon;
grant execute on function public.app_sync_local_predictions(uuid, jsonb) to anon;
grant execute on function public.app_update_player_avatar(uuid, text) to anon;
grant execute on function public.app_sync_matches(jsonb) to anon;
