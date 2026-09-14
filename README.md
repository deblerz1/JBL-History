# JBL History

A private-data, read-only historical analytics platform for the **Joey Bags Fantasy League**, backed by ESPN Fantasy Football and Supabase.

> **Status:** Foundation  
> **ESPN league ID:** `1550163`  
> **Target seasons:** `2017–2026`  
> **Current season:** `2026`  
> **Supabase project:** `ksoecnzmisoiyyfdgyoa`

The source code is public, but the ESPN league and all credentials remain private.

## Goals

JBL History will preserve the league's history independently of ESPN and provide:

- All-time standings and manager records
- Championships and playoff finishes
- Head-to-head records and rivalries
- Weekly scores, closest games, and largest blowouts
- Historical drafts and draft-value analysis
- Transactions and roster history where ESPN makes them available
- Expected-win and luck metrics
- Season and manager profile pages
- A future read-only MCP connection for natural-language league queries

## Architecture

```text
Private ESPN League
        |
        | server-side read-only importer
        v
Supabase / PostgreSQL
   |                 |
   |                 +--> Future read-only MCP server
   v
Next.js dashboard
```

Planned stack:

- **Next.js + TypeScript** for the web application
- **Supabase/PostgreSQL** for permanent storage and authentication
- **Python + espn-api** for ESPN ingestion where practical
- **Supabase migrations** for version-controlled database changes
- **Sanitized fixtures** for automated tests
- **GitHub Actions or another server-side scheduler** for current-season refreshes

## Historical Scope

Modern ESPN Fantasy endpoints will be tested for seasons **2018–2026**.

The **2017 season is a legacy compatibility case** because ESPN changed its Fantasy API around 2018. The importer must test it separately and report missing data without failing the remaining backfill. Historical settings and scores may remain accessible even when older transactions, roster snapshots, or draft details do not.

## Planned Data Model

- `leagues`
- `seasons`
- `members`
- `season_teams`
- `scoring_settings`
- `drafts`
- `draft_picks`
- `matchups`
- `roster_snapshots`
- `transactions`
- `players`
- `raw_imports`
- `sync_runs`

Persistent members will be modeled separately from season-specific teams because team names and ownership can change.

## Milestones

### 1. Foundation

- Scaffold the Next.js and Python workspaces
- Configure local Supabase development
- Add database migrations and sanitized ESPN fixtures
- Add environment templates, linting, type checking, and tests

### 2. ESPN Connectivity

- Test private-league authentication
- Discover accessible seasons
- Validate one active and one completed season
- Handle 2017 through a legacy compatibility path
- Produce a data-availability report for every season

### 3. Historical Backfill

- Import seasons 2017–2026
- Preserve recoverable raw provider payloads
- Normalize settings, members, teams, drafts, matchups, rosters, and transactions
- Make imports idempotent and safely resumable
- Reconcile imported totals against ESPN

### 4. Dashboard

- League overview and all-time standings
- Season history and manager profiles
- Head-to-head and matchup history
- Draft history, championships, and playoff finishes
- Import status and data-availability views

### 5. Analytics and MCP

- Add documented historical analytics views
- Build a read-only MCP server over Supabase
- Expose league-history, matchup, member, draft, and aggregate-record queries
- Never expose ESPN or database write operations through MCP

## Security

Sensitive credentials must never be committed, logged, included in client-side code, or pasted into an AI chat.

Server-only secrets include:

- `ESPN_SWID`
- `ESPN_S2`
- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase database passwords and access tokens

Only placeholder values belong in the repository:

```dotenv
ESPN_LEAGUE_ID=1550163
ESPN_START_YEAR=2017
ESPN_END_YEAR=2026
ESPN_SWID=
ESPN_S2=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Actual secrets belong in ignored local environment files or protected deployment secrets. The ESPN integration is strictly **read-only** and will never submit lineups, transactions, trades, or league-setting changes.

## Importer Requirements

The importer must support:

- Authentication testing without printing secrets
- Season discovery
- Single-season imports
- Historical range backfills
- Incremental current-season refreshes
- Idempotent upserts and partial-failure recovery
- Structured warnings for unavailable fields
- Sync audits and reconciliation summaries

Re-running an import must update existing records without creating duplicates.

## Local Setup

Detailed commands will be added when the project is scaffolded. Expected prerequisites:

- Node.js and Corepack
- Python 3.11+
- Docker Desktop
- Supabase CLI
- Git

Expected workflow:

1. Clone the repository.
2. Install JavaScript and Python dependencies.
3. Copy committed environment templates to ignored local files.
4. Start local Supabase and apply migrations.
5. Run fixture-based tests.
6. Add private credentials locally.
7. Test one completed ESPN season.
8. Backfill remaining seasons only after reconciliation succeeds.

## Links

- [GitHub repository](https://github.com/deblerz1/JBL-History)
- [Supabase project](https://supabase.com/dashboard/project/ksoecnzmisoiyyfdgyoa)

## Disclaimer

ESPN does not provide a documented public Fantasy Football developer API for this use case. The importer relies on endpoints used by ESPN's fantasy applications and/or community libraries. Those endpoints may change, and historical completeness is not guaranteed.
