insert into public.leagues (espn_league_id, name, is_private)
values (1550163, 'Joey Bags Fantasy League', true)
on conflict (espn_league_id) do update
set name = excluded.name,
    is_private = excluded.is_private;
