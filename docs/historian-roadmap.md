# Historian next steps

## Conditional historical outcomes
- Added opening W-L-T records and below-.500 checkpoints for playoff qualification
  or championship outcomes. One manager or all league team-seasons; optional dates.
- Default: match latest recorded team count and playoff-slot count. Never broaden
  silently. Named-year formats also match regular-season length, byes implied by
  standard seeded bracket size, and actual scoring-week lengths for each playoff round.
- Explicit all-format pooling, team-count eras and side-by-side format comparisons.
- Display numerator/denominator, matching season team names, compared seasons,
  exclusions and small-sample language. Historical frequency is not a calibrated forecast.
- Exclude active seasons; require unique final seeds, verified qualifier participation
  (including first-round byes), and a complete single-week regular-season schedule.
- Still unsupported: arbitrary predictive probabilities, positional conditions,
  injuries and multi-manager conditional comparisons. Never substitute a career statistic.

## Composable analytics foundation
- Implemented: a shared, bounded arithmetic metric catalog drives planner instructions and calculation.
- Implemented: total points against, PA/PF, PF/PA, losses and ties alongside existing metrics.
- All catalog metrics compose with manager selection, regular season/playoffs/combined,
  dates, minimum games, consecutive-season windows, participation cohort, sort and list output.
- Ratios divide aggregate totals. Undefined denominators are excluded and disclosed, never treated as zero.
- Bare best/worst in playoffs defaults to playoff win percentage; explicit scoring metrics override it.
- Show record/sample, formula, statistical ties and matchup-versus-week limitations.
- Scoring ratios describe scoring balance, not pure luck. Model selects operations; code does arithmetic.
- Still planned: grouping by season/player, multiple metrics per query.
- Preserve the existing question suite as regression coverage, not a dictionary of permitted wording.

## Worst manager (planned) and positional scoring (implemented)
- Worst-manager composite: last-place rate, low regular-season win percentage and season-relative scoring.
- Publish components and weights; regular-season last place is proposed but must be distinguished
  from final standings after consolation. Do not quietly reverse title counts or invent weights.
- Implemented: QB/RB/WR/TE/K/D-ST starter totals, points per completed matchup, and share of official team scoring.
- Position is an independent query dimension; metrics compose with dates, managers, phase,
  participation, rolling windows, minimum games and lists. Follow-ups can change position.
- Lazy server-side roster loading uses stable pagination and historical snapshot positions.
  Ordinary queries do not fetch lineups. Bench/IR excluded; FLEX counts by historical position.
- Every requested matchup must have scoring-week mapping, recorded starters with finite points
  and known positions, and starter totals within 0.02 of official scoring. Multi-week playoffs
  sum their constituent weeks once; per-game means per matchup, not per scoring week.
- Any failed requested matchup blocks the full positional result; disclose affected seasons,
  verified alternative seasons and reasons instead of silently removing missing data.
- Audit found no 2017–2018 snapshots and four later reconciliation exceptions. Runtime checks,
  rather than year whitelists, determine whether a particular query is supported.
- Reconciliation is necessary but not proof of perfect lineups (e.g. missing zero-point players).
  Scoring corrections, position changes and different season lengths still affect comparisons.
- Bench-inclusive, individual-player, FLEX-slot-only and opponent-positional queries remain unsupported.
- Positional unit coverage checks arithmetic, FLEX/bench, missing data, zero denominators,
  multi-week playoffs and manager scope. Live evaluation adds six paid planner requests.

## Conversation
- Implemented: one prior question and validated plan per open chat; explicit New topic reset.
- Implemented: ambiguous first-name clarification and visible interpretation.
- Verify live multi-turn behavior before extending memory beyond one turn.
- Conversation context is untrusted input, revalidated on the server; calculations remain deterministic.

## Luck analysis
- Implemented: expected wins, schedule luck, luck per game; regular season only.
- Luckiest/unluckiest select highest/lowest schedule luck, with dates/windows/sample filters.
- Weekly league population is checked before manager filtering; incomplete/duplicate,
  unmapped, non-finite, nonreciprocal and multiweek groups are excluded and disclosed.
- Matchup history now uses ordered pagination rather than a fixed 1,000-row limit.
- Completed data audit: see `historian-data-audit.md`. All completed regular-season
  weeks have complete team coverage; lineup anomalies do not block team-score luck.
- Ask which definition, or offer a clearly labeled default: schedule luck.
- Calculate weekly expected wins as (opponents outscored + half tied) / eligible opponents.
- Schedule luck = actual regular-season wins minus summed weekly expected wins.
- Show lowest points against per game, close-game results, sample size and coverage as supporting statistics.
- Separate manager-season identity from career identity. Count only complete comparable scoring weeks;
  exclude byes and incomplete games; do not treat two-week playoff totals as single weeks.
- Week-level game keys and runtime completeness gates implemented; initial audit passed.
- Explain that scoring settings, schedule and season lengths affect comparisons.

## Best manager (planned)
- Clarify: most championships, highest win percentage, best recent stretch, or balanced career ranking?
- Offer a published, versioned composite using championships, career win percentage,
  playoff appearances/rate and playoff win percentage. Agree on weights with the league first.
- Normalize components, publish minimum sample requirements, show every component and ties.
- Let users adjust weights; label results as a chosen definition, not an objective official ranking.
- Model explains definitions and findings. Database/code computes metrics; the model must not invent weights or values.

## Evaluation
- Add live conversations: phase changes, manager comparisons, date overrides, Jack clarification, new-topic reset.
- Maintain separate results for planner interpretation and correctness of stored statistics.
