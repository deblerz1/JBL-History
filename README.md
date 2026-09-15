# JBL History

A private-data, read-only historical analytics platform for the **Joey Bags Fantasy League**, backed by ESPN Fantasy Football and Supabase.

> **Status:** Milestone 2 ESPN connectivity complete
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
- `transaction_items`
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

- [x] Add a credential-safe private-league authentication command
- [x] Add independent season discovery and JSON availability reporting
- [x] Authenticate through encrypted GitHub Actions secrets
- [x] Validate the completed 2025 and active 2026 seasons
- [x] Confirm league-level access for every season from 2017–2026
- [x] Handle 2017 through a non-blocking legacy compatibility path
- [x] Produce a sanitized data-availability summary for every season

### 3. Historical Backfill

- [x] Deploy the private-first JBL Supabase schema
- [x] Add an atomic, JBL-project-locked season import RPC
- [ ] Reconcile and idempotency-test the 2025 baseline import
- [ ] Import seasons 2017–2026
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
- `SUPABASE_SECRET_KEY`
- Supabase database passwords and access tokens

Only placeholder values belong in the repository:

```dotenv
ESPN_LEAGUE_ID=1550163
ESPN_START_YEAR=2017
ESPN_END_YEAR=2026
ESPN_SWID=
ESPN_S2=

NEXT_PUBLIC_SUPABASE_URL=https://ksoecnzmisoiyyfdgyoa.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
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

Prerequisites:

- Node.js 20.9+
- Python 3.11+
- Docker Desktop
- Git

Clone and install the pinned dependencies:

```bash
git clone https://github.com/deblerz1/JBL-History.git
cd JBL-History
npm install
python -m venv .venv
```

Activate the Python environment on macOS/Linux:

```bash
source .venv/bin/activate
```

Or activate it in Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

Then install the ingestion package and create your ignored local environment file:

```bash
python -m pip install -e ".[dev]"
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

The Supabase CLI is pinned as a project dependency. Run it through `npx`:

```bash
npx supabase start
npx supabase db reset
npx supabase migration list --local
```

Run all application checks:

```bash
npm run check
python -m pytest
```

The current development workflow is:

1. Start local Supabase and reset it from the committed migration and seed.
2. Run fixture-based JavaScript and Python tests.
3. Add private credentials only to the ignored `.env.local` file.
4. Test one completed ESPN season in Milestone 2.
5. Backfill remaining seasons only after reconciliation succeeds.

## Milestone 2: Private ESPN Connection

Sign in to ESPN in Chrome or Edge, open Developer Tools, and select **Application →
Storage → Cookies**. Copy the values of the `SWID` and `espn_s2` cookies into the
ignored `.env.local` file. Never paste these values into chat, issues, commits, or
client-side environment variables.

```dotenv
ESPN_SWID={your-value-including-braces}
ESPN_S2=your-long-cookie-value
```

Test a completed season first:

```bash
jbl-history auth-test --year 2025
```

Then probe the completed 2025 season and active 2026 season with detailed checks:

```bash
jbl-history discover --year 2025 --year 2026 --details
```

Finally, probe the full configured range. Each season is isolated, so an unavailable
legacy season does not stop the rest of the report:

```bash
jbl-history discover --details
```

Reports are written to the ignored `reports/espn-availability.json` path because
they can contain private league metadata. These commands only read ESPN; they do not
change lineups or write to Supabase.

### Browser-only connectivity test

If local command-line access is unavailable, store `ESPN_SWID` and `ESPN_S2` as
GitHub Actions repository secrets. Then open **Actions → ESPN connectivity → Run
workflow**. Start with the `validation` scope; it requires both 2025 and 2026 to be
accessible. The `full-history` scope probes 2017–2026 independently.

The workflow has read-only repository permissions, does not receive Supabase
credentials, and never uploads the private availability report as an artifact.

### Verified connectivity

On September 14, 2026, the GitHub Actions full-history probe authenticated to the
private JBL league and confirmed league-level access for all 10 requested seasons,
2017–2026. The 2017 season remains a legacy normalization case, and the community
`espn-api` package does not expose weekly box-score or transaction helpers before
2019; those gaps will be handled explicitly during the historical backfill.

## Current Verification

Milestone 1 includes:

- A pinned Next.js and Supabase JavaScript toolchain
- A pinned Python ingestion package using `espn-api`
- A private-first Postgres migration with RLS enabled and no browser policies
- A local seed for ESPN league `1550163`
- Sanitized ESPN fixtures with deterministic transformation tests
- Lint, type-check, unit-test, and production-build scripts

The foundation does not make live ESPN requests and does not apply its migration to the hosted Supabase project.

## Links

- [GitHub repository](https://github.com/deblerz1/JBL-History)
- [Supabase project](https://supabase.com/dashboard/project/ksoecnzmisoiyyfdgyoa)

## Disclaimer

ESPN does not provide a documented public Fantasy Football developer API for this use case. The importer relies on endpoints used by ESPN's fantasy applications and/or community libraries. Those endpoints may change, and historical completeness is not guaranteed.
