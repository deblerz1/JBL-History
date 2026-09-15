-- ESPN's status.isActive describes the league instance, not whether its NFL
-- season has ended. Enforce the historical invariant at the database boundary.
create function public.enforce_past_season_complete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.year < extract(year from current_date)::integer then
    new.status := 'complete';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_past_season_complete()
  from public, anon, authenticated;

create trigger seasons_enforce_past_complete
before insert or update on public.seasons
for each row execute function public.enforce_past_season_complete();

update public.seasons
set status = 'complete'
where year <= 2025 and status <> 'complete';
