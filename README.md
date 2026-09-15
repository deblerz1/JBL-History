# JBL History

A private-data, read-only historical analytics platform for the **Joey Bags Fantasy League**, backed by ESPN Fantasy Football and Supabase.

> **Status:** Milestone 4C.1 identity and draft correction complete
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
- [x] Reconcile and idempotency-test the 2025 baseline import
- [x] Import seasons 2017–2026
- [x] Preserve recoverable raw provider payloads
- [x] Normalize settings, members, teams, drafts, matchups, rosters, and transactions
- [x] Make imports idempotent and safely resumable
- [x] Reconcile imported totals against ESPN

### Verified 2025 baseline

The initial 2025 import was run twice through GitHub Actions. Both runs returned
the same normalized counts: 12 ESPN members, 10 season teams, and 86 scheduled
matchups. Supabase contains one league row, one 2025 season row, no duplicate
matchup keys, and no teams without an owner link. Team totals reconcile at 70 wins,
70 losses, zero ties, and 16,666.8 points on both the for and against sides.

This baseline covers league settings, members, season teams, standings, and matchup
scores. Draft picks, weekly roster snapshots, and transactions remain separate
backfill stages and will be reconciled before the full historical import runs.

The extended importer now collects draft picks for any season ESPN exposes and
weekly roster snapshots plus transaction activity for 2019 and later. Each season
runs independently, records structured availability warnings, and upserts stable
provider identities so interrupted or repeated backfills can resume safely.

The extended 2025 validation also passed twice with identical results: 160 unique
draft picks and 2,819 unique roster rows spanning 17 weeks, 10 teams, and 277
players. All draft picks link to a team and player. ESPN returned
`ESPNInvalidLeague` from its historical communication endpoint, so 2025
transactions are recorded as unavailable rather than silently treated as an empty
transaction history.

### Verified full-history backfill

The 2017–2026 backfill contains 10 seasons, 86 season-team records, 694 matchups,
1,376 draft picks, and 16,464 weekly roster rows. The active 2026 season currently
contains 21 transactions with 36 transaction items; historical ESPN communication
requests for 2019–2025 returned an explicit endpoint-availability warning. Weekly
rosters and transactions are unavailable through the client for 2017–2018.

Final integrity checks found zero duplicate matchup, draft-pick, or roster keys;
zero teams without member links; zero draft picks without team/player links; and
zero transactions without items. Seasons 2017–2025 are marked complete and 2026
remains active for future refreshes.

### 4. Dashboard

- [x] Build the private analytics contract for the dashboard
- [x] Add a shared league access gate
- [x] Build the trophy-room museum shell and champions timeline
- [x] Add all-time manager, season, rivalry, draft, and records pages
- [ ] Add the read-only league historian chatbot

### Private museum access

The dashboard now has a public, no-index landing page and a protected `/museum`
route. Members and invited guests enter one shared league access code. A successful
entry creates a signed, HTTP-only, same-site session cookie that expires after 30
days; the shared code itself is never stored in the browser. The museum reads the
private analytics views with a new Supabase secret key created only inside each
server request. Neither that key nor the underlying private data is included in
client-side JavaScript.

The first responsive trophy-room shell includes the full champions timeline, a
five-manager leaderboard preview, collection entrances for seasons, rivalries,
drafts, and records, and a placeholder for the league historian. Original team
names appear only after the access gate and never in page metadata or URLs.

Configure these additional server-only deployment variables before opening the
museum:

```dotenv
JBL_ACCESS_CODE=choose-a-long-shared-league-code
JBL_SESSION_SECRET=generate-a-different-random-32-byte-or-longer-value
```

Changing `JBL_ACCESS_CODE` changes what members use on their next login. Changing
`JBL_SESSION_SECRET` immediately invalidates every existing museum session.

### Core museum exhibits

The protected museum now includes five server-rendered exhibits backed by the
private analytics contract:

- The full 11-manager career table with championships, regular-season and playoff
  records, win percentages, playoff appearances, and career points
- A 10-season archive with 86 final standings rows, season-specific team names,
  champions, title-game scores, seeds, and points for/against
- A 53-pair head-to-head rivalry ledger with wins, ties, meetings, and total points
- A 10-season draft archive with 1,376 actual selections grouped by historical
  team, including round, pick, player, position, keeper, and available bid data
- Top-ten galleries for the highest and lowest completed weekly scores

### Identity and draft correction

The archive now preserves ESPN's canonical season-specific team name instead of
falling back to labels such as `Team 3`. All 86 team-season records resolve to 53
distinct historical team names. Career views continue to use each manager's most
recent team identity, while season, championship, draft, rivalry, and weekly-record
exhibits retain the name used at that point in league history.

Approved privacy-safe owner labels appear beneath team names throughout the
protected museum. Labels use first names only, with `Jack P` and `Jack V` to
disambiguate the two active Jacks and `Foz` as Joe's approved display name. Full
names remain excluded from the dashboard contract. A private import trigger
reapplies both canonical team names and approved labels after future ESPN refreshes.

The draft exhibit now shows the actual players selected instead of auction-spend
summaries. ESPN classified 2017–2018 as snake drafts and later imported seasons as
offline drafts. Stored bid values are zero, so the interface only displays a bid
when ESPN supplies a positive amount rather than implying reliable auction prices.

Authentication is enforced by the shared `/museum` layout, so every current and
future exhibit inherits the same signed-cookie access check. All data fetching
remains inside server components and uses the server-only Supabase client.

### Verified private analytics foundation

Ten `security_invoker` views now provide a stable, read-only contract for the web
application: season configuration and standings, reconstructed championship-bracket
games, champions, manager careers, head-to-head rivalries, draft summaries, game
performances, league records, and transaction totals.

ESPN did not populate its playoff flag for the imported history. The analytics
layer therefore derives each postseason from the season's schedule settings and
reconstructs the championship bracket from playoff seeds and final standings. The
result contains exactly five bracket games for each six-team playoff, three for
each four-team playoff, and one championship matchup for every completed season.
All nine champions from 2017–2025 are championship-matchup winners and match the
season's first-place finisher.

The analytics layer currently resolves 11 career managers, 53 head-to-head rivalry
pairs, 1,376 draft selections, and 1,220 completed team-game performances. Only the
approved privacy-safe labels are exposed to the server-side dashboard contract;
full member names remain private. `anon` and `authenticated` have no access; only
the server-side `service_role` can select the views. The access gate proxies
approved requests without sending the service-role secret to a browser.

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
