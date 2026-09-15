-- Kent used a separate ESPN member account in 2017–2018 before continuing as
-- Jack V from 2019 onward. Keep both provider identities for future imports,
-- but resolve their season teams to one canonical JBL manager career.
create table private.member_aliases (
  league_id uuid not null references public.leagues(id) on delete cascade,
  source_member_id uuid not null references public.members(id) on delete cascade,
  canonical_member_id uuid not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (league_id, source_member_id),
  check (source_member_id <> canonical_member_id)
);

revoke all on private.member_aliases from public, anon, authenticated;
grant usage on schema private to service_role;
grant select on private.member_aliases to service_role;

do $$
declare
  source_count integer;
  target_count integer;
  overlapping_seasons integer;
begin
  select count(*) into source_count
  from public.members m
  join public.leagues l on l.id = m.league_id
  where l.espn_league_id = 1550163 and m.public_name = 'Kent';
  select count(*) into target_count
  from public.members m
  join public.leagues l on l.id = m.league_id
  where l.espn_league_id = 1550163 and m.public_name = 'Jack V';

  if source_count <> 1 or target_count <> 1 then
    raise exception 'Expected exactly one Kent and one Jack V member';
  end if;

  select count(*) into overlapping_seasons
  from public.season_teams source_team
  join public.members source_member on source_member.id = source_team.member_id
  join public.season_teams target_team on target_team.season_id = source_team.season_id
  join public.members target_member on target_member.id = target_team.member_id
  join public.leagues league on league.id = source_member.league_id
  where source_member.public_name = 'Kent'
    and target_member.public_name = 'Jack V'
    and source_member.league_id = target_member.league_id
    and league.espn_league_id = 1550163;

  if overlapping_seasons > 0 then
    raise exception 'Kent and Jack V have overlapping seasons';
  end if;
end;
$$;

insert into private.member_aliases (league_id, source_member_id, canonical_member_id)
select source.league_id, source.id, target.id
from public.members source
join public.members target on target.league_id = source.league_id
join public.leagues league on league.id = source.league_id
where source.public_name = 'Kent'
  and target.public_name = 'Jack V'
  and league.espn_league_id = 1550163;

update public.season_teams st
set member_id = alias.canonical_member_id
from private.member_aliases alias
join public.seasons s on s.league_id = alias.league_id
where st.member_id = alias.source_member_id
  and st.season_id = s.id;

create function private.apply_member_aliases_after_import()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.season_teams st
  set member_id = alias.canonical_member_id
  from private.member_aliases alias
  where st.season_id = new.season_id
    and alias.league_id = new.league_id
    and st.member_id = alias.source_member_id;
  return new;
end;
$$;

revoke all on function private.apply_member_aliases_after_import()
from public, anon, authenticated;
grant execute on function private.apply_member_aliases_after_import()
to service_role;

create trigger raw_imports_apply_member_aliases
after insert on public.raw_imports
for each row execute function private.apply_member_aliases_after_import();
