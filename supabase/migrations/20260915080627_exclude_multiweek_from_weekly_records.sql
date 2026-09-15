-- A matchup period may contain multiple NFL scoring weeks. Preserve those games
-- for brackets, but exclude their aggregate totals from single-week records.
create or replace view public.analytics_game_performances
with (security_invoker = true)
as
select s.league_id, s.year, m.matchup_period, m.id as matchup_id,
  h.id as season_team_id, h.member_id, h.team_name,
  m.home_score as points, a.team_name as opponent_team_name,
  m.away_score as opponent_points,
  case when m.winner_team_id = h.id then 'win' when m.winner_team_id is null then 'tie' else 'loss' end as result,
  jsonb_array_length(coalesce(
    ss.settings -> 'scheduleSettings' -> 'matchupPeriods' -> (m.matchup_period::text),
    jsonb_build_array(m.matchup_period)
  )) as scoring_period_count
from public.matchups m
join public.seasons s on s.id = m.season_id
join public.season_teams h on h.id = m.home_team_id
join public.season_teams a on a.id = m.away_team_id
left join public.scoring_settings ss on ss.season_id = s.id
where m.is_complete and m.home_score is not null and m.away_score is not null
union all
select s.league_id, s.year, m.matchup_period, m.id,
  a.id, a.member_id, a.team_name,
  m.away_score, h.team_name, m.home_score,
  case when m.winner_team_id = a.id then 'win' when m.winner_team_id is null then 'tie' else 'loss' end,
  jsonb_array_length(coalesce(
    ss.settings -> 'scheduleSettings' -> 'matchupPeriods' -> (m.matchup_period::text),
    jsonb_build_array(m.matchup_period)
  ))
from public.matchups m
join public.seasons s on s.id = m.season_id
join public.season_teams h on h.id = m.home_team_id
join public.season_teams a on a.id = m.away_team_id
left join public.scoring_settings ss on ss.season_id = s.id
where m.is_complete and m.home_score is not null and m.away_score is not null;

create or replace view public.analytics_league_records
with (security_invoker = true)
as
select
  league_id,
  'highest_score'::text as record_type,
  year,
  matchup_period,
  season_team_id,
  member_id,
  team_name,
  opponent_team_name,
  points as record_value,
  dense_rank() over (partition by league_id order by points desc) as record_rank
from public.analytics_game_performances
where scoring_period_count = 1
union all
select
  league_id,
  'lowest_score'::text,
  year,
  matchup_period,
  season_team_id,
  member_id,
  team_name,
  opponent_team_name,
  points,
  dense_rank() over (partition by league_id order by points asc)
from public.analytics_game_performances
where scoring_period_count = 1;

revoke all on public.analytics_game_performances, public.analytics_league_records
from public, anon, authenticated;
grant select on public.analytics_game_performances, public.analytics_league_records
to service_role;
