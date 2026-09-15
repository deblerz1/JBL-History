alter table public.transaction_items
  add column source_item_key text;

alter table public.transaction_items
  add constraint transaction_items_source_key_unique
  unique (transaction_id, source_item_key);

create or replace function public.import_espn_history(p_payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
  v_league_id uuid;
  v_season_id uuid;
  v_draft_id uuid;
  v_transaction_id uuid;
  v_player_id uuid;
  v_team_id uuid;
  v_item jsonb;
  v_subitem jsonb;
  v_history jsonb := coalesce(p_payload -> 'jblHistory', '{}'::jsonb);
  v_year smallint := (p_payload ->> 'seasonId')::smallint;
begin
  -- The existing RPC enforces JBL league 1550163 and the 2017-2026 range.
  v_result := public.import_espn_season(p_payload);

  select l.id, s.id into strict v_league_id, v_season_id
  from public.leagues l
  join public.seasons s on s.league_id = l.id
  where l.espn_league_id = 1550163 and s.year = v_year;

  for v_item in
    select value from jsonb_array_elements(coalesce(v_history -> 'players', '[]'::jsonb))
  loop
    insert into public.players (
      espn_player_id, full_name, pro_team, default_position,
      eligible_positions, active
    ) values (
      (v_item ->> 'espn_player_id')::bigint,
      coalesce(nullif(v_item ->> 'full_name', ''), 'ESPN Player ' || (v_item ->> 'espn_player_id')),
      nullif(v_item ->> 'pro_team', ''),
      nullif(v_item ->> 'default_position', ''),
      array(select jsonb_array_elements_text(coalesce(v_item -> 'eligible_positions', '[]'::jsonb))),
      (v_item ->> 'active')::boolean
    )
    on conflict (espn_player_id) do update set
      full_name = case
        when excluded.full_name like 'ESPN Player %' then public.players.full_name
        else excluded.full_name
      end,
      pro_team = coalesce(excluded.pro_team, public.players.pro_team),
      default_position = coalesce(excluded.default_position, public.players.default_position),
      eligible_positions = case
        when cardinality(excluded.eligible_positions) = 0 then public.players.eligible_positions
        else excluded.eligible_positions
      end,
      active = coalesce(excluded.active, public.players.active);
  end loop;

  if jsonb_typeof(v_history -> 'draft') = 'object' then
    insert into public.drafts (
      season_id, draft_type, drafted_at, rounds, seconds_per_pick
    ) values (
      v_season_id,
      nullif(v_history #>> '{draft,draft_type}', ''),
      case
        when nullif(v_history #>> '{draft,drafted_at}', '') is null then null
        when (v_history #>> '{draft,drafted_at}') ~ '^[0-9]+$'
          then to_timestamp((v_history #>> '{draft,drafted_at}')::double precision / 1000)
        else (v_history #>> '{draft,drafted_at}')::timestamptz
      end,
      nullif((v_history #>> '{draft,rounds}')::integer, 0),
      nullif((v_history #>> '{draft,seconds_per_pick}')::integer, 0)
    )
    on conflict (season_id) do update set
      draft_type = excluded.draft_type,
      drafted_at = excluded.drafted_at,
      rounds = excluded.rounds,
      seconds_per_pick = excluded.seconds_per_pick
    returning id into v_draft_id;

    for v_item in
      select value from jsonb_array_elements(coalesce(v_history #> '{draft,picks}', '[]'::jsonb))
    loop
      insert into public.players (espn_player_id, full_name)
      values (
        (v_item ->> 'espn_player_id')::bigint,
        'ESPN Player ' || (v_item ->> 'espn_player_id')
      )
      on conflict (espn_player_id) do nothing;

      select id into v_player_id from public.players
      where espn_player_id = (v_item ->> 'espn_player_id')::bigint;
      select id into v_team_id from public.season_teams
      where season_id = v_season_id
        and espn_team_id = (v_item ->> 'espn_team_id')::integer;

      insert into public.draft_picks (
        draft_id, season_team_id, player_id, espn_player_id, round_number,
        round_pick_number, overall_pick_number, bid_amount, is_keeper, raw_data
      ) values (
        v_draft_id, v_team_id, v_player_id,
        (v_item ->> 'espn_player_id')::bigint,
        (v_item ->> 'round_number')::integer,
        (v_item ->> 'round_pick_number')::integer,
        (v_item ->> 'overall_pick_number')::integer,
        (v_item ->> 'bid_amount')::numeric,
        coalesce((v_item ->> 'is_keeper')::boolean, false),
        coalesce(v_item -> 'raw_data', '{}'::jsonb)
      )
      on conflict (draft_id, overall_pick_number) do update set
        season_team_id = excluded.season_team_id,
        player_id = excluded.player_id,
        espn_player_id = excluded.espn_player_id,
        round_number = excluded.round_number,
        round_pick_number = excluded.round_pick_number,
        bid_amount = excluded.bid_amount,
        is_keeper = excluded.is_keeper,
        raw_data = excluded.raw_data;
    end loop;
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(v_history -> 'roster_snapshots', '[]'::jsonb))
  loop
    insert into public.players (espn_player_id, full_name)
    values (
      (v_item ->> 'espn_player_id')::bigint,
      'ESPN Player ' || (v_item ->> 'espn_player_id')
    ) on conflict (espn_player_id) do nothing;

    select id into v_player_id from public.players
    where espn_player_id = (v_item ->> 'espn_player_id')::bigint;
    select id into v_team_id from public.season_teams
    where season_id = v_season_id
      and espn_team_id = (v_item ->> 'espn_team_id')::integer;

    if v_team_id is not null then
      insert into public.roster_snapshots (
        season_id, season_team_id, player_id, matchup_period, lineup_slot,
        lineup_slot_id, points, projected_points, raw_data
      ) values (
        v_season_id, v_team_id, v_player_id,
        (v_item ->> 'matchup_period')::integer,
        nullif(v_item ->> 'lineup_slot', ''),
        (v_item ->> 'lineup_slot_id')::integer,
        (v_item ->> 'points')::numeric,
        (v_item ->> 'projected_points')::numeric,
        coalesce(v_item -> 'raw_data', '{}'::jsonb)
      )
      on conflict (season_id, matchup_period, season_team_id, player_id) do update set
        lineup_slot = excluded.lineup_slot,
        lineup_slot_id = excluded.lineup_slot_id,
        points = excluded.points,
        projected_points = excluded.projected_points,
        raw_data = excluded.raw_data;
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(v_history -> 'transactions', '[]'::jsonb))
  loop
    insert into public.transactions (
      season_id, espn_transaction_id, transaction_type, status, processed_at, raw_data
    ) values (
      v_season_id,
      v_item ->> 'espn_transaction_id',
      coalesce(nullif(v_item ->> 'transaction_type', ''), 'UNKNOWN'),
      nullif(v_item ->> 'status', ''),
      (v_item ->> 'processed_at')::timestamptz,
      coalesce(v_item -> 'raw_data', '{}'::jsonb)
    )
    on conflict (season_id, espn_transaction_id) do update set
      transaction_type = excluded.transaction_type,
      status = excluded.status,
      processed_at = excluded.processed_at,
      raw_data = excluded.raw_data
    returning id into v_transaction_id;

    for v_subitem in
      select value from jsonb_array_elements(coalesce(v_item -> 'items', '[]'::jsonb))
    loop
      insert into public.players (espn_player_id, full_name)
      values (
        (v_subitem ->> 'espn_player_id')::bigint,
        'ESPN Player ' || (v_subitem ->> 'espn_player_id')
      ) on conflict (espn_player_id) do nothing;
      select id into v_player_id from public.players
      where espn_player_id = (v_subitem ->> 'espn_player_id')::bigint;
      select id into v_team_id from public.season_teams
      where season_id = v_season_id
        and espn_team_id = (v_subitem ->> 'espn_team_id')::integer;

      insert into public.transaction_items (
        transaction_id, source_item_key, player_id, from_team_id, to_team_id,
        item_type, bid_amount, raw_data
      ) values (
        v_transaction_id,
        v_subitem ->> 'source_item_key',
        v_player_id,
        case when v_subitem ->> 'item_type' in ('DROPPED', 'TRADE_SENT') then v_team_id end,
        case when v_subitem ->> 'item_type' not in ('DROPPED', 'TRADE_SENT') then v_team_id end,
        coalesce(nullif(v_subitem ->> 'item_type', ''), 'UNKNOWN'),
        (v_subitem ->> 'bid_amount')::numeric,
        coalesce(v_subitem -> 'raw_data', '{}'::jsonb)
      )
      on conflict (transaction_id, source_item_key) do update set
        player_id = excluded.player_id,
        from_team_id = excluded.from_team_id,
        to_team_id = excluded.to_team_id,
        item_type = excluded.item_type,
        bid_amount = excluded.bid_amount,
        raw_data = excluded.raw_data;
    end loop;
  end loop;

  update public.seasons set data_availability = data_availability || jsonb_build_object(
    'draft_picks', jsonb_array_length(coalesce(v_history #> '{draft,picks}', '[]'::jsonb)),
    'roster_snapshots', jsonb_array_length(coalesce(v_history -> 'roster_snapshots', '[]'::jsonb)),
    'transactions', jsonb_array_length(coalesce(v_history -> 'transactions', '[]'::jsonb)),
    'warnings', coalesce(v_history -> 'warnings', '[]'::jsonb)
  ) where id = v_season_id;

  update public.sync_runs set
    sync_type = case when v_year < extract(year from current_date) then 'backfill' else 'refresh' end,
    records_written = records_written || jsonb_build_object(
      'draft_picks', (select count(*) from public.draft_picks dp join public.drafts d on d.id = dp.draft_id where d.season_id = v_season_id),
      'roster_snapshots', (select count(*) from public.roster_snapshots where season_id = v_season_id),
      'transactions', (select count(*) from public.transactions where season_id = v_season_id),
      'transaction_items', (select count(*) from public.transaction_items ti join public.transactions t on t.id = ti.transaction_id where t.season_id = v_season_id)
    ),
    warnings = coalesce(v_history -> 'warnings', '[]'::jsonb)
  where id = (
    select id from public.sync_runs where season_id = v_season_id order by started_at desc limit 1
  );

  return v_result || jsonb_build_object(
    'draft_picks', (select count(*) from public.draft_picks dp join public.drafts d on d.id = dp.draft_id where d.season_id = v_season_id),
    'roster_snapshots', (select count(*) from public.roster_snapshots where season_id = v_season_id),
    'transactions', (select count(*) from public.transactions where season_id = v_season_id),
    'transaction_items', (select count(*) from public.transaction_items ti join public.transactions t on t.id = ti.transaction_id where t.season_id = v_season_id),
    'warnings', coalesce(v_history -> 'warnings', '[]'::jsonb)
  );
end;
$$;

revoke all on function public.import_espn_history(jsonb)
  from public, anon, authenticated;
grant execute on function public.import_espn_history(jsonb) to service_role;
