alter table public.members
  add column public_name text;

alter table public.members
  add constraint members_public_name_length
  check (public_name is null or char_length(public_name) between 1 and 40);

-- Recover privacy-safe owner labels from the newest saved ESPN payload.
with raw_members as (
  select distinct on (ri.league_id, member ->> 'id')
    ri.league_id,
    member ->> 'id' as espn_member_id,
    nullif(btrim(member ->> 'firstName'), '') as first_name,
    nullif(btrim(member ->> 'lastName'), '') as last_name
  from public.raw_imports ri
  cross join lateral jsonb_array_elements(coalesce(ri.payload -> 'members', '[]'::jsonb)) member
  where member ->> 'id' is not null
  order by ri.league_id, member ->> 'id', ri.fetched_at desc
)
update public.members m
set public_name = case lower(r.first_name)
  when 'joe' then 'Foz'
  when 'jack' then 'Jack ' || upper(left(r.last_name, 1))
  else initcap(r.first_name)
end
from raw_members r
where m.league_id = r.league_id
  and m.espn_member_id = r.espn_member_id;

-- Restore the actual season-specific team names from the raw archive.
with latest_imports as (
  select distinct on (ri.season_id) ri.season_id, ri.payload
  from public.raw_imports ri
  where ri.season_id is not null and ri.payload ? 'teams'
  order by ri.season_id, ri.fetched_at desc
), raw_teams as (
  select
    li.season_id,
    (team ->> 'id')::integer as espn_team_id,
    coalesce(
      nullif(btrim(team ->> 'name'), ''),
      nullif(btrim(concat_ws(' ', team ->> 'location', team ->> 'nickname')), '')
    ) as team_name
  from latest_imports li
  cross join lateral jsonb_array_elements(li.payload -> 'teams') team
)
update public.season_teams st
set team_name = rt.team_name
from raw_teams rt
where st.season_id = rt.season_id
  and st.espn_team_id = rt.espn_team_id
  and rt.team_name is not null;

-- Future imports write raw_imports after teams and members. This private trigger
-- reapplies the canonical ESPN team name and JBL's approved display label.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.refresh_imported_identities()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  item jsonb;
  first_name text;
  last_name text;
begin
  for item in select value from jsonb_array_elements(coalesce(new.payload -> 'members', '[]'::jsonb))
  loop
    first_name := nullif(btrim(item ->> 'firstName'), '');
    last_name := nullif(btrim(item ->> 'lastName'), '');
    update public.members
    set public_name = case lower(first_name)
      when 'joe' then 'Foz'
      when 'jack' then 'Jack ' || upper(left(last_name, 1))
      else initcap(first_name)
    end
    where league_id = new.league_id and espn_member_id = item ->> 'id';
  end loop;

  for item in select value from jsonb_array_elements(coalesce(new.payload -> 'teams', '[]'::jsonb))
  loop
    update public.season_teams
    set team_name = coalesce(
      nullif(btrim(item ->> 'name'), ''),
      nullif(btrim(concat_ws(' ', item ->> 'location', item ->> 'nickname')), ''),
      team_name
    )
    where season_id = new.season_id and espn_team_id = (item ->> 'id')::integer;
  end loop;
  return new;
end;
$$;

revoke all on function private.refresh_imported_identities() from public, anon, authenticated;

create trigger raw_imports_refresh_identities
after insert on public.raw_imports
for each row execute function private.refresh_imported_identities();

create view public.analytics_member_identities
with (security_invoker = true)
as
select id as member_id, league_id, public_name
from public.members;

create view public.analytics_draft_picks
with (security_invoker = true)
as
select
  s.league_id,
  s.year,
  coalesce(nullif(ss.settings #>> '{draftSettings,type}', ''), d.draft_type, 'UNKNOWN') as draft_type,
  st.id as season_team_id,
  st.member_id,
  st.team_name,
  dp.overall_pick_number,
  dp.round_number,
  dp.round_pick_number,
  dp.bid_amount,
  dp.is_keeper,
  p.full_name as player_name,
  p.default_position,
  p.pro_team
from public.draft_picks dp
join public.drafts d on d.id = dp.draft_id
join public.seasons s on s.id = d.season_id
join public.season_teams st on st.id = dp.season_team_id
left join public.scoring_settings ss on ss.season_id = s.id
left join public.players p on p.id = dp.player_id;

revoke all on public.analytics_member_identities, public.analytics_draft_picks
from public, anon, authenticated;
grant select on public.analytics_member_identities, public.analytics_draft_picks
to service_role;
