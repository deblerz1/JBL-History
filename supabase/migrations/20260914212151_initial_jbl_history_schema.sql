-- JBL History foundation schema.
-- Private by default: every table has RLS enabled and no browser-facing policies.

create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  espn_league_id bigint not null unique,
  name text not null,
  is_private boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  year smallint not null check (year between 2000 and 2100),
  status text not null default 'unknown'
    check (status in ('unknown', 'preseason', 'active', 'complete')),
  is_legacy boolean not null default false,
  data_availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, year)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  espn_member_id text,
  display_name text not null,
  normalized_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index members_espn_identity_unique
  on public.members (league_id, espn_member_id)
  where espn_member_id is not null;
create index members_league_id_idx on public.members (league_id);

create table public.season_teams (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  espn_team_id integer not null,
  team_name text not null,
  abbreviation text,
  logo_url text,
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  ties integer not null default 0 check (ties >= 0),
  points_for numeric(12, 2) not null default 0,
  points_against numeric(12, 2) not null default 0,
  final_standing integer check (final_standing > 0),
  playoff_seed integer check (playoff_seed > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, espn_team_id)
);

create index season_teams_member_id_idx on public.season_teams (member_id);

create table public.scoring_settings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null unique references public.seasons(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  espn_player_id bigint not null unique,
  full_name text not null,
  pro_team text,
  default_position text,
  eligible_positions text[] not null default '{}',
  active boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_full_name_idx on public.players (full_name);

create table public.drafts (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null unique references public.seasons(id) on delete cascade,
  draft_type text,
  drafted_at timestamptz,
  rounds integer check (rounds > 0),
  seconds_per_pick integer check (seconds_per_pick > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.draft_picks (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  season_team_id uuid references public.season_teams(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  espn_player_id bigint,
  round_number integer not null check (round_number > 0),
  round_pick_number integer check (round_pick_number > 0),
  overall_pick_number integer not null check (overall_pick_number > 0),
  bid_amount numeric(10, 2) check (bid_amount >= 0),
  is_keeper boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (draft_id, overall_pick_number)
);

create index draft_picks_team_id_idx on public.draft_picks (season_team_id);
create index draft_picks_player_id_idx on public.draft_picks (player_id);

create table public.matchups (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  espn_matchup_id text,
  matchup_period integer not null check (matchup_period > 0),
  home_team_id uuid not null references public.season_teams(id) on delete cascade,
  away_team_id uuid references public.season_teams(id) on delete cascade,
  home_score numeric(12, 2),
  away_score numeric(12, 2),
  winner_team_id uuid references public.season_teams(id) on delete set null,
  is_playoff boolean not null default false,
  is_complete boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, matchup_period, home_team_id)
);

create unique index matchups_espn_identity_unique
  on public.matchups (season_id, espn_matchup_id)
  where espn_matchup_id is not null;
create index matchups_away_team_id_idx on public.matchups (away_team_id);
create index matchups_home_team_id_idx on public.matchups (home_team_id);
create index matchups_winner_team_id_idx on public.matchups (winner_team_id);
create index matchups_season_period_idx on public.matchups (season_id, matchup_period);

create table public.roster_snapshots (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  season_team_id uuid not null references public.season_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  matchup_period integer not null check (matchup_period > 0),
  lineup_slot text,
  lineup_slot_id integer,
  points numeric(12, 2),
  projected_points numeric(12, 2),
  raw_data jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  unique (season_id, matchup_period, season_team_id, player_id)
);

create index roster_snapshots_team_id_idx
  on public.roster_snapshots (season_team_id);
create index roster_snapshots_player_id_idx
  on public.roster_snapshots (player_id);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  espn_transaction_id text not null,
  transaction_type text not null,
  status text,
  processed_at timestamptz,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (season_id, espn_transaction_id)
);

create index transactions_season_processed_idx
  on public.transactions (season_id, processed_at desc);

create table public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  from_team_id uuid references public.season_teams(id) on delete set null,
  to_team_id uuid references public.season_teams(id) on delete set null,
  item_type text not null,
  bid_amount numeric(10, 2) check (bid_amount >= 0),
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index transaction_items_transaction_id_idx
  on public.transaction_items (transaction_id);
create index transaction_items_player_id_idx on public.transaction_items (player_id);
create index transaction_items_from_team_id_idx on public.transaction_items (from_team_id);
create index transaction_items_to_team_id_idx on public.transaction_items (to_team_id);

create table public.raw_imports (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  provider text not null default 'espn',
  endpoint text not null,
  request_key text not null,
  payload jsonb not null,
  payload_sha256 text,
  fetched_at timestamptz not null default now(),
  unique (league_id, request_key, fetched_at)
);

create index raw_imports_season_id_idx on public.raw_imports (season_id);
create index raw_imports_league_fetched_idx
  on public.raw_imports (league_id, fetched_at desc);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  season_id uuid references public.seasons(id) on delete cascade,
  sync_type text not null
    check (sync_type in ('auth_test', 'discovery', 'season', 'backfill', 'refresh')),
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  records_written jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index sync_runs_season_id_idx on public.sync_runs (season_id);
create index sync_runs_league_started_idx
  on public.sync_runs (league_id, started_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leagues_set_updated_at before update on public.leagues
for each row execute function public.set_updated_at();
create trigger seasons_set_updated_at before update on public.seasons
for each row execute function public.set_updated_at();
create trigger members_set_updated_at before update on public.members
for each row execute function public.set_updated_at();
create trigger season_teams_set_updated_at before update on public.season_teams
for each row execute function public.set_updated_at();
create trigger scoring_settings_set_updated_at before update on public.scoring_settings
for each row execute function public.set_updated_at();
create trigger players_set_updated_at before update on public.players
for each row execute function public.set_updated_at();
create trigger drafts_set_updated_at before update on public.drafts
for each row execute function public.set_updated_at();
create trigger matchups_set_updated_at before update on public.matchups
for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.leagues enable row level security;
alter table public.seasons enable row level security;
alter table public.members enable row level security;
alter table public.season_teams enable row level security;
alter table public.scoring_settings enable row level security;
alter table public.players enable row level security;
alter table public.drafts enable row level security;
alter table public.draft_picks enable row level security;
alter table public.matchups enable row level security;
alter table public.roster_snapshots enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.raw_imports enable row level security;
alter table public.sync_runs enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;
