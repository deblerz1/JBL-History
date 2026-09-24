# Historian comparisons and usage — September 24, 2026

## Query dimensions

`groupBy` is manager (aggregate) or season (one row per manager/year).
`measures` contains at most four catalog metrics, each with its own gameType.
Examples: regular-season wins, regular-season points per game, playoff win
percentage in one table. The existing deterministic calculator computes each
measure; the language model selects dimensions and never supplies the answers.
Year-by-year records expose wins, losses, ties and win percentage. Historical
team names label season rows; current identities label aggregate rows.

Missing qualifying games are shown as a dash, not zero. A coverage refusal
aborts the comparison. Every-season participation is checked over the full
requested range before grouping. Rolling windows, positional measures and
composite formulas are not supported in this new comparison mode; existing
single-metric paths retain their capabilities. No unsupported filter is dropped.
Rows use the first measure as sort key within chronological years. Explicit
limits apply to output rows and are disclosed. Follow-ups carry the validated
resolved plan, including all measures and grouping, rather than the whole chat.
Exact phase/everyone/end-year-exclusion edits preserve other dimensions without
a paid call; other phrasings still use the planner. Interior exclusions are not
representable yet and must be refused.

## Application request controls

The server action validates the league session, then atomically reserves a
request in JBL History's `historian_usage_budget` singleton. Limits are shared
by all members and all Vercel instances: 10/minute, 100/day, 1,000/month, UTC
fixed windows. Shortcuts and provider failures still consume a reservation.
No question text, names, IP addresses or credentials are stored in the counter.
If the counter is unavailable, the app makes no model call. Only service_role
can call the invoker function; anon/authenticated have no table or function
access. RLS has deliberately no public policies. This is a request cap, NOT a
$5 guarantee; token prices, model configuration and non-app API use differ.

The migration was applied only to ksoecnzmisoiyyfdgyoa. Transaction-rolled-back
checks verified allow, minute/day/month denial and reset behavior. Privilege
checks verified anon/authenticated denial and service_role access.

## Live checks

`historian-live-eval.yml` runs a small synthetic comparison/follow-up suite on
Mondays at 12:41 UTC (GitHub may delay scheduled starts). At most six provider
requests per scheduled run, no retries; exact follow-up shortcuts typically
reduce this to three. Four/five scheduled Mondays imply at most 24/30 requests
per month. Push/analytics runs have a 39-request upper bound. Evaluations use
GitHub's existing API key and no database access. They are separate from the
application counters and are request-bounded, not dollar-capped. Paid tests
remain opt-in locally; free regression tests run normally.
