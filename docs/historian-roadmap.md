# Historian next steps

## Composable analytics foundation
- Implemented: a shared, bounded arithmetic metric catalog drives planner instructions and calculation.
- Implemented: total points against, PA/PF, PF/PA, losses and ties alongside existing metrics.
- All catalog metrics compose with manager selection, regular season/playoffs/combined,
  dates, minimum games, consecutive-season windows, participation cohort, sort and list output.
- Ratios divide aggregate totals. Undefined denominators are excluded and disclosed, never treated as zero.
- Bare best/worst in playoffs defaults to playoff win percentage; explicit scoring metrics override it.
- Show record/sample, formula, statistical ties and matchup-versus-week limitations.
- Scoring ratios describe scoring balance, not pure luck. Model selects operations; code does arithmetic.
- Still planned: grouping by season/player/position, multiple metrics per query, audited weekly expected wins.
- Preserve the existing question suite as regression coverage, not a dictionary of permitted wording.

## Worst manager and positional scoring (planned)
- Worst-manager composite: last-place rate, low regular-season win percentage and season-relative scoring.
- Publish components and weights; regular-season last place is proposed but must be distinguished
  from final standings after consolation. Do not quietly reverse title counts or invent weights.
- Audit historical lineup coverage and reconcile starting-player points to team totals before RB/WR queries.
- Default positional scoring to actual starter points, including FLEX by player position, excluding bench.
- Attribute points to the manager that week; retain scoring-period keys for multi-week playoffs.
- Disclose missing seasons, scoring corrections, roster-slot changes and differing season lengths.

## Conversation
- Implemented: one prior question and validated plan per open chat; explicit New topic reset.
- Implemented: ambiguous first-name clarification and visible interpretation.
- Verify live multi-turn behavior before extending memory beyond one turn.
- Conversation context is untrusted input, revalidated on the server; calculations remain deterministic.

## Luck analysis (planned)
- Ask which definition, or offer a clearly labeled default: schedule luck.
- Calculate weekly expected wins as (opponents outscored + half tied) / eligible opponents.
- Schedule luck = actual regular-season wins minus summed weekly expected wins.
- Show lowest points against per game, close-game results, sample size and coverage as supporting statistics.
- Separate manager-season identity from career identity. Count only complete comparable scoring weeks;
  exclude byes and incomplete games; do not treat two-week playoff totals as single weeks.
- Requires week-level game keys and a completeness audit before implementation.
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
