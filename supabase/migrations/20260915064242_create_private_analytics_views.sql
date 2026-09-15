-- Private, read-only analytics contract for the JBL History application.
-- These views intentionally expose team identities, never member display names.

create view public.analytics_season_config
with (security_invoker = true)
as
select
  s.id as season_id,
  s.league_id,
  s.year,
  s.status,
  coalesce(
    (ss.settings -> 'scheduleSettings' ->> 'matchupPeriodCount')::integer,
    0
  ) as regular_season_periods,
  coalesce(
    (ss.settings -> 'scheduleSettings' ->> 'playoffTeamCount')::integer,
    0
  ) as playoff_team_count,
  (
    select max(key::integer)
    from jsonb_object_keys(
      coalesce(ss.settings -> 'scheduleSettings' -> 'matchupPeriods', '{}'::jsonb)
    ) as periods(key)
  ) as final_matchup_period
from public.seasons s
left join public.scoring_settings ss on ss.season_id = s.id;

create view public.analytics_season_standings
with (security_invoker = true)
as
select
  s.league_id,
  s.id as season_id,
  s.year,
  s.status,
  st.id as season_team_id,
  st.member_id,
  st.team_name,
  st.abbreviation,
  st.logo_url,
  st.wins,
  st.losses,
  st.ties,
  st.points_for,
  st.points_against,
  st.final_standing,
  st.playoff_seed
from public.seasons s
join public.season_teams st on st.season_id = s.id;

create view public.analytics_playoff_games
with (security_invoker = true)
as
with postseason as (
  select
    c.*,
    m.id as matchup_id,
    m.matchup_period,
    m.home_team_id,
    m.away_team_id,
    m.home_score,
    m.away_score,
    m.winner_team_id,
    h.final_standing as home_final_standing,
    a.final_standing as away_final_standing,
    m.matchup_period - c.regular_season_periods as playoff_round,
    c.final_matchup_period - c.regular_season_periods as playoff_round_count
  from public.analytics_season_config c
  join public.matchups m on m.season_id = c.season_id
  join public.season_teams h on h.id = m.home_team_id
  join public.season_teams a on a.id = m.away_team_id
  where c.status = 'complete'
    and m.is_complete
    and m.away_team_id is not null
    and m.matchup_period > c.regular_season_periods
    and h.playoff_seed <= c.playoff_team_count
    and a.playoff_seed <= c.playoff_team_count
), bracket as (
  select
    postseason.*,
    least(
      playoff_team_count,
      power(2::numeric, playoff_round_count - playoff_round + 1)::integer
    ) as bracket_finish_threshold
  from postseason
)
select
  league_id,
  season_id,
  year,
  matchup_id,
  matchup_period,
  playoff_round,
  playoff_round_count,
  home_team_id,
  away_team_id,
  home_score,
  away_score,
  winner_team_id,
  playoff_round = playoff_round_count as is_championship
from bracket
where greatest(home_final_standing, away_final_standing) <= bracket_finish_threshold;

create view public.analytics_champions
with (security_invoker = true)
as
select
  pg.league_id,
  pg.season_id,
  pg.year,
  pg.matchup_id as championship_matchup_id,
  champion.id as season_team_id,
  champion.member_id,
  champion.team_name,
  champion.logo_url,
  runner_up.team_name as runner_up_team_name,
  case when pg.winner_team_id = pg.home_team_id then pg.home_score else pg.away_score end as champion_score,
  case when pg.winner_team_id = pg.home_team_id then pg.away_score else pg.home_score end as runner_up_score
from public.analytics_playoff_games pg
join public.season_teams champion on champion.id = pg.winner_team_id
join public.season_teams runner_up
  on runner_up.id = case
    when pg.winner_team_id = pg.home_team_id then pg.away_team_id
    else pg.home_team_id
  end
where pg.is_championship;

create view public.analytics_manager_careers
with (security_invoker = true)
as
with current_identity as (
  select distinct on (st.member_id)
    s.league_id,
    st.member_id,
    st.team_name as current_team_name,
    st.logo_url as current_logo_url
  from public.season_teams st
  join public.seasons s on s.id = st.season_id
  where st.member_id is not null
  order by st.member_id, s.year desc
), regular_records as (
  select
    s.league_id,
    st.member_id,
    count(*) filter (where s.status = 'complete') as seasons_completed,
    sum(st.wins) filter (where s.status = 'complete') as regular_season_wins,
    sum(st.losses) filter (where s.status = 'complete') as regular_season_losses,
    sum(st.ties) filter (where s.status = 'complete') as regular_season_ties,
    sum(st.points_for) filter (where s.status = 'complete') as regular_season_points_for,
    count(*) filter (
      where s.status = 'complete'
        and st.playoff_seed <= c.playoff_team_count
    ) as playoff_appearances
  from public.season_teams st
  join public.seasons s on s.id = st.season_id
  join public.analytics_season_config c on c.season_id = s.id
  where st.member_id is not null
  group by s.league_id, st.member_id
), playoff_sides as (
  select pg.league_id, h.member_id,
    (pg.winner_team_id = pg.home_team_id)::integer as win,
    (pg.winner_team_id <> pg.home_team_id)::integer as loss
  from public.analytics_playoff_games pg
  join public.season_teams h on h.id = pg.home_team_id
  union all
  select pg.league_id, a.member_id,
    (pg.winner_team_id = pg.away_team_id)::integer as win,
    (pg.winner_team_id <> pg.away_team_id)::integer as loss
  from public.analytics_playoff_games pg
  join public.season_teams a on a.id = pg.away_team_id
), playoff_records as (
  select league_id, member_id, sum(win) as playoff_wins, sum(loss) as playoff_losses
  from playoff_sides
  where member_id is not null
  group by league_id, member_id
), titles as (
  select league_id, member_id, count(*) as championships
  from public.analytics_champions
  where member_id is not null
  group by league_id, member_id
)
select
  rr.league_id,
  rr.member_id,
  ci.current_team_name,
  ci.current_logo_url,
  rr.seasons_completed,
  coalesce(t.championships, 0) as championships,
  rr.playoff_appearances,
  coalesce(pr.playoff_wins, 0) as playoff_wins,
  coalesce(pr.playoff_losses, 0) as playoff_losses,
  round(
    coalesce(pr.playoff_wins, 0)::numeric /
      nullif(coalesce(pr.playoff_wins, 0) + coalesce(pr.playoff_losses, 0), 0),
    4
  ) as playoff_win_percentage,
  rr.regular_season_wins,
  rr.regular_season_losses,
  rr.regular_season_ties,
  round(
    (rr.regular_season_wins + rr.regular_season_ties * 0.5)::numeric /
      nullif(rr.regular_season_wins + rr.regular_season_losses + rr.regular_season_ties, 0),
    4
  ) as regular_season_win_percentage,
  rr.regular_season_points_for
from regular_records rr
join current_identity ci using (league_id, member_id)
left join playoff_records pr using (league_id, member_id)
left join titles t using (league_id, member_id);

create view public.analytics_head_to_head
with (security_invoker = true)
as
with sides as (
  select
    s.league_id,
    m.id as matchup_id,
    h.member_id as home_member_id,
    a.member_id as away_member_id,
    m.home_score,
    m.away_score,
    m.winner_team_id,
    h.id as home_team_id,
    a.id as away_team_id
  from public.matchups m
  join public.seasons s on s.id = m.season_id
  join public.season_teams h on h.id = m.home_team_id
  join public.season_teams a on a.id = m.away_team_id
  where m.is_complete and h.member_id is not null and a.member_id is not null
), normalized as (
  select
    league_id,
    least(home_member_id::text, away_member_id::text)::uuid as member_a_id,
    greatest(home_member_id::text, away_member_id::text)::uuid as member_b_id,
    case when home_member_id::text < away_member_id::text then home_score else away_score end as member_a_points,
    case when home_member_id::text < away_member_id::text then away_score else home_score end as member_b_points,
    case
      when winner_team_id is null then null
      when winner_team_id = home_team_id then home_member_id
      else away_member_id
    end as winner_member_id
  from sides
)
select
  n.league_id,
  n.member_a_id,
  a.current_team_name as member_a_team_name,
  n.member_b_id,
  b.current_team_name as member_b_team_name,
  count(*) as games,
  count(*) filter (where winner_member_id = member_a_id) as member_a_wins,
  count(*) filter (where winner_member_id = member_b_id) as member_b_wins,
  count(*) filter (where winner_member_id is null) as ties,
  sum(member_a_points) as member_a_points,
  sum(member_b_points) as member_b_points
from normalized n
join public.analytics_manager_careers a on a.member_id = n.member_a_id and a.league_id = n.league_id
join public.analytics_manager_careers b on b.member_id = n.member_b_id and b.league_id = n.league_id
group by n.league_id, n.member_a_id, a.current_team_name, n.member_b_id, b.current_team_name;

create view public.analytics_draft_summary
with (security_invoker = true)
as
select
  s.league_id,
  s.id as season_id,
  s.year,
  st.id as season_team_id,
  st.member_id,
  st.team_name,
  count(dp.id) as picks,
  sum(dp.bid_amount) as total_spend,
  round(avg(dp.bid_amount), 2) as average_bid,
  max(dp.bid_amount) as highest_bid,
  count(*) filter (where dp.bid_amount = 1) as one_dollar_picks,
  count(*) filter (where dp.is_keeper) as keeper_picks
from public.seasons s
join public.drafts d on d.season_id = s.id
join public.season_teams st on st.season_id = s.id
left join public.draft_picks dp on dp.draft_id = d.id and dp.season_team_id = st.id
group by s.league_id, s.id, s.year, st.id, st.member_id, st.team_name;

create view public.analytics_game_performances
with (security_invoker = true)
as
select s.league_id, s.year, m.matchup_period, m.id as matchup_id,
  h.id as season_team_id, h.member_id, h.team_name,
  m.home_score as points, a.team_name as opponent_team_name,
  m.away_score as opponent_points,
  case when m.winner_team_id = h.id then 'win' when m.winner_team_id is null then 'tie' else 'loss' end as result
from public.matchups m
join public.seasons s on s.id = m.season_id
join public.season_teams h on h.id = m.home_team_id
join public.season_teams a on a.id = m.away_team_id
where m.is_complete and m.home_score is not null and m.away_score is not null
union all
select s.league_id, s.year, m.matchup_period, m.id,
  a.id, a.member_id, a.team_name,
  m.away_score, h.team_name, m.home_score,
  case when m.winner_team_id = a.id then 'win' when m.winner_team_id is null then 'tie' else 'loss' end
from public.matchups m
join public.seasons s on s.id = m.season_id
join public.season_teams h on h.id = m.home_team_id
join public.season_teams a on a.id = m.away_team_id
where m.is_complete and m.home_score is not null and m.away_score is not null;

create view public.analytics_league_records
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
from public.analytics_game_performances;

create view public.analytics_transaction_totals
with (security_invoker = true)
as
with touched as (
  select distinct ti.transaction_id, ti.to_team_id as season_team_id
  from public.transaction_items ti where ti.to_team_id is not null
  union
  select distinct ti.transaction_id, ti.from_team_id
  from public.transaction_items ti where ti.from_team_id is not null
)
select
  s.league_id,
  s.year,
  st.id as season_team_id,
  st.member_id,
  st.team_name,
  count(distinct t.transaction_id) as transactions
from touched t
join public.season_teams st on st.id = t.season_team_id
join public.seasons s on s.id = st.season_id
group by s.league_id, s.year, st.id, st.member_id, st.team_name;

revoke all on
  public.analytics_season_config,
  public.analytics_season_standings,
  public.analytics_playoff_games,
  public.analytics_champions,
  public.analytics_manager_careers,
  public.analytics_head_to_head,
  public.analytics_draft_summary,
  public.analytics_game_performances,
  public.analytics_league_records,
  public.analytics_transaction_totals
from public, anon, authenticated;

grant select on
  public.analytics_season_config,
  public.analytics_season_standings,
  public.analytics_playoff_games,
  public.analytics_champions,
  public.analytics_manager_careers,
  public.analytics_head_to_head,
  public.analytics_draft_summary,
  public.analytics_game_performances,
  public.analytics_league_records,
  public.analytics_transaction_totals
to service_role;
