-- Replace the partial member identity index with a regular unique constraint so
-- PostgREST can target it with ON CONFLICT during idempotent imports. PostgreSQL
-- still permits multiple NULL member IDs under a regular unique constraint.
drop index public.members_espn_identity_unique;

alter table public.members
  add constraint members_league_espn_identity_unique
  unique (league_id, espn_member_id);

create or replace function public.import_espn_season(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_league_id uuid;
  v_season_id uuid;
  v_espn_league_id bigint;
  v_year smallint;
  v_item jsonb;
  v_member_id uuid;
  v_home_team_id uuid;
  v_away_team_id uuid;
  v_winner_team_id uuid;
  v_status text;
begin
  v_espn_league_id := (p_payload ->> 'id')::bigint;
  v_year := (p_payload ->> 'seasonId')::smallint;

  if v_espn_league_id <> 1550163 then
    raise exception 'Refusing to import a non-JBL ESPN league';
  end if;

  if v_year < 2017 or v_year > 2026 then
    raise exception 'Season year is outside the configured JBL history range';
  end if;

  insert into public.leagues (espn_league_id, name, is_private)
  values (
    v_espn_league_id,
    coalesce(nullif(p_payload #>> '{settings,name}', ''), 'Joey Bags Fantasy League'),
    true
  )
  on conflict (espn_league_id) do update
    set name = excluded.name,
        is_private = true
  returning id into v_league_id;

  v_status := case
    when coalesce((p_payload #>> '{status,isActive}')::boolean, false) then 'active'
    else 'complete'
  end;

  insert into public.seasons (
    league_id, year, status, is_legacy, data_availability
  )
  values (
    v_league_id,
    v_year,
    v_status,
    v_year < 2018,
    jsonb_build_object(
      'league', true,
      'members', jsonb_array_length(coalesce(p_payload -> 'members', '[]'::jsonb)),
      'teams', jsonb_array_length(coalesce(p_payload -> 'teams', '[]'::jsonb)),
      'matchups', jsonb_array_length(coalesce(p_payload -> 'schedule', '[]'::jsonb))
    )
  )
  on conflict (league_id, year) do update
    set status = excluded.status,
        is_legacy = excluded.is_legacy,
        data_availability = excluded.data_availability
  returning id into v_season_id;

  insert into public.scoring_settings (season_id, settings)
  values (v_season_id, coalesce(p_payload -> 'settings', '{}'::jsonb))
  on conflict (season_id) do update
    set settings = excluded.settings;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'members', '[]'::jsonb))
  loop
    insert into public.members (
      league_id, espn_member_id, display_name, normalized_name
    )
    values (
      v_league_id,
      nullif(v_item ->> 'id', ''),
      coalesce(nullif(v_item ->> 'displayName', ''), 'Unknown manager'),
      lower(trim(coalesce(nullif(v_item ->> 'displayName', ''), 'Unknown manager')))
    )
    on conflict (league_id, espn_member_id) do update
      set display_name = excluded.display_name,
          normalized_name = excluded.normalized_name;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'teams', '[]'::jsonb))
  loop
    select id into v_member_id
    from public.members
    where league_id = v_league_id
      and espn_member_id = v_item #>> '{owners,0}';

    insert into public.season_teams (
      season_id, member_id, espn_team_id, team_name, abbreviation, logo_url,
      wins, losses, ties, points_for, points_against, final_standing, playoff_seed
    )
    values (
      v_season_id,
      v_member_id,
      (v_item ->> 'id')::integer,
      coalesce(
        nullif(trim(concat_ws(' ', v_item ->> 'location', v_item ->> 'nickname')), ''),
        'Team ' || (v_item ->> 'id')
      ),
      nullif(v_item ->> 'abbrev', ''),
      nullif(v_item ->> 'logo', ''),
      coalesce((v_item #>> '{record,overall,wins}')::integer, 0),
      coalesce((v_item #>> '{record,overall,losses}')::integer, 0),
      coalesce((v_item #>> '{record,overall,ties}')::integer, 0),
      coalesce((v_item #>> '{record,overall,pointsFor}')::numeric, 0),
      coalesce((v_item #>> '{record,overall,pointsAgainst}')::numeric, 0),
      (v_item ->> 'rankCalculatedFinal')::integer,
      (v_item ->> 'playoffSeed')::integer
    )
    on conflict (season_id, espn_team_id) do update
      set member_id = excluded.member_id,
          team_name = excluded.team_name,
          abbreviation = excluded.abbreviation,
          logo_url = excluded.logo_url,
          wins = excluded.wins,
          losses = excluded.losses,
          ties = excluded.ties,
          points_for = excluded.points_for,
          points_against = excluded.points_against,
          final_standing = excluded.final_standing,
          playoff_seed = excluded.playoff_seed;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload -> 'schedule', '[]'::jsonb))
  loop
    select id into v_home_team_id
    from public.season_teams
    where season_id = v_season_id
      and espn_team_id = (v_item #>> '{home,teamId}')::integer;

    v_away_team_id := null;
    if v_item #>> '{away,teamId}' is not null then
      select id into v_away_team_id
      from public.season_teams
      where season_id = v_season_id
        and espn_team_id = (v_item #>> '{away,teamId}')::integer;
    end if;

    v_winner_team_id := case v_item ->> 'winner'
      when 'HOME' then v_home_team_id
      when 'AWAY' then v_away_team_id
      else null
    end;

    insert into public.matchups (
      season_id, espn_matchup_id, matchup_period, home_team_id, away_team_id,
      home_score, away_score, winner_team_id, is_playoff, is_complete, raw_data
    )
    values (
      v_season_id,
      nullif(v_item ->> 'id', ''),
      (v_item ->> 'matchupPeriodId')::integer,
      v_home_team_id,
      v_away_team_id,
      (v_item #>> '{home,totalPoints}')::numeric,
      (v_item #>> '{away,totalPoints}')::numeric,
      v_winner_team_id,
      coalesce(v_item ->> 'playoffTierType', 'NONE') <> 'NONE',
      coalesce(v_item ->> 'winner', 'UNDECIDED') <> 'UNDECIDED',
      v_item
    )
    on conflict (season_id, matchup_period, home_team_id) do update
      set espn_matchup_id = excluded.espn_matchup_id,
          away_team_id = excluded.away_team_id,
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          winner_team_id = excluded.winner_team_id,
          is_playoff = excluded.is_playoff,
          is_complete = excluded.is_complete,
          raw_data = excluded.raw_data;
  end loop;

  insert into public.raw_imports (
    league_id, season_id, endpoint, request_key, payload
  )
  values (
    v_league_id, v_season_id, 'league', 'league:' || v_year, p_payload
  );

  insert into public.sync_runs (
    league_id, season_id, sync_type, status, records_written, finished_at
  )
  values (
    v_league_id,
    v_season_id,
    'season',
    'succeeded',
    jsonb_build_object(
      'members', (select count(*) from public.members where league_id = v_league_id),
      'teams', (select count(*) from public.season_teams where season_id = v_season_id),
      'matchups', (select count(*) from public.matchups where season_id = v_season_id)
    ),
    now()
  );

  return jsonb_build_object(
    'league_id', v_espn_league_id,
    'season', v_year,
    'members', (select count(*) from public.members where league_id = v_league_id),
    'teams', (select count(*) from public.season_teams where season_id = v_season_id),
    'matchups', (select count(*) from public.matchups where season_id = v_season_id)
  );
end;
$$;

revoke all on function public.import_espn_season(jsonb)
  from public, anon, authenticated;
grant execute on function public.import_espn_season(jsonb) to service_role;
