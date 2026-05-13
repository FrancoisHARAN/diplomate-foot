# Debug scoring

Ces requetes servent a verifier un joueur dans Supabase SQL Editor, sans modifier les donnees.

Remplacer `PLAYER_UUID` par l'id du joueur.

## Detail matchs + flashs

```sql
with target_player as (
  select 'PLAYER_UUID'::uuid as player_id
),
epoch as (
  select public.app_private_scoring_epoch_start() as reset_at
),
match_rows as (
  select
    'match'::text as source,
    m.kickoff as event_at,
    m.home_team->>'shortName' || ' - ' || m.away_team->>'shortName' as label,
    pr.home_score || ' - ' || pr.away_score as prediction,
    coalesce(m.home_score::text, '?') || ' - ' || coalesce(m.away_score::text, '?') as final_score,
    public.app_private_match_is_final(m.status) as is_final,
    public.app_private_match_multiplier(
      m.points_multiplier,
      m.competition_code,
      m.competition_name,
      m.stage,
      m.round,
      m.matchday,
      m.home_team,
      m.away_team
    ) as boost,
    sp.points,
    sp.id is not null as included_in_current_score
  from public.app_rpc_predictions pr
  join target_player tp on tp.player_id = pr.player_id
  join public.app_rpc_matches m on m.id = pr.match_id
  left join public.app_rpc_scored_predictions sp on sp.id = pr.id
),
flash_rows as (
  select
    'flash'::text as source,
    coalesce(ch.updated_at, fp.updated_at) as event_at,
    ch.title as label,
    fo.label as prediction,
    result.label as final_score,
    ch.status = 'resolved' as is_final,
    1 as boost,
    fsp.points,
    fsp.id is not null as included_in_current_score
  from public.app_rpc_flash_predictions fp
  join target_player tp on tp.player_id = fp.player_id
  join public.app_rpc_flash_challenges ch on ch.id = fp.flash_id
  join public.app_rpc_flash_options fo on fo.id = fp.option_id
  left join public.app_rpc_flash_options result on result.id = ch.result_option_id
  left join public.app_rpc_flash_scored_predictions fsp on fsp.id = fp.id
)
select *
from (
  select * from match_rows
  union all
  select * from flash_rows
) rows
order by event_at desc;
```

## Total compare au classement

```sql
with target_player as (
  select 'PLAYER_UUID'::uuid as player_id
),
detail_total as (
  select player_id, sum(points)::int as points
  from (
    select sp.player_id, sp.points
    from public.app_rpc_scored_predictions sp
    join target_player tp on tp.player_id = sp.player_id
    union all
    select fsp.player_id, fsp.points
    from public.app_rpc_flash_scored_predictions fsp
    join target_player tp on tp.player_id = fsp.player_id
  ) rows
  group by player_id
)
select
  lb.player_id,
  lb.display_name,
  coalesce(dt.points, 0) as detail_points,
  lb.points as leaderboard_points,
  lb.exact_scores,
  lb.two_point_results,
  lb.one_point_results,
  lb.correct_results
from public.app_rpc_leaderboard lb
join target_player tp on tp.player_id = lb.player_id
left join detail_total dt on dt.player_id = lb.player_id;
```

Si `detail_points` et `leaderboard_points` different, le probleme vient du SQL central. Si les deux sont identiques mais l'interface affiche autre chose, le probleme vient de l'affichage ou d'un cache local.
