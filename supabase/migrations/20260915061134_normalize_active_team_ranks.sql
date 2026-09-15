-- ESPN represents undetermined active-season ranks as zero. The JBL schema uses
-- NULL for "not decided" and reserves positive integers for actual ranks.
create function public.normalize_active_team_ranks()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.final_standing := nullif(new.final_standing, 0);
  new.playoff_seed := nullif(new.playoff_seed, 0);
  return new;
end;
$$;

revoke all on function public.normalize_active_team_ranks()
  from public, anon, authenticated;

create trigger season_teams_normalize_active_ranks
before insert or update on public.season_teams
for each row execute function public.normalize_active_team_ranks();
