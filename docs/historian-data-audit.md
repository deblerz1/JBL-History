# Historian data coverage audit — 2026-09-22

Read-only audit of JBL History project `ksoecnzmisoiyyfdgyoa`. No other project
queried or changed. Findings describe stored data, not a fresh ESPN re-fetch.

## Regular-season schedule luck

All recorded completed regular-season periods have exactly one score per season
team and one scoring week per matchup period. No incomplete or duplicate team
populations were found among completed periods.

| Season | Complete regular-season weeks |
| --- | ---: |
| 2017 | 13 |
| 2018 | 13 |
| 2019 | 13 |
| 2020 | 13 |
| 2021 | 14 |
| 2022 | 14 |
| 2023 | 13 |
| 2024 | 14 |
| 2025 | 14 |
| 2026 | 2 |

This supports implementing regular-season expected wins from official team scores:
each week, (other teams outscored + half of tied teams) / (number of other teams).
Schedule luck = actual wins plus half of actual ties minus summed expected wins.
Positive means more result-equivalent wins than scoring rank predicts; negative
means fewer. Also offer luck per completed game for unequal participation lengths.

Required runtime safeguards: retain season/week keys; verify every season team has
one completed score; exclude incomplete, duplicate, bye, multiweek and playoff
periods; apply manager filters only AFTER calculating the full-week comparison
population. Report excluded weeks and actual coverage. Do not claim this measures
injuries, drafting skill or every kind of luck. 2026 is in progress, not a full season.

## Historical lineups

The importer intentionally fetches weekly box scores only from 2019 onward.
Roster snapshot `matchup_period` is a scoring WEEK, while matchups use matchup
periods. Reconciliation expanded the stored schedule mapping to sum starters over
all scoring weeks belonging to a completed matchup. Bench and IR were excluded.
The audit includes completed consolation matchups as well as championship games;
analytics must separately apply the requested phase.

| Year | Completed team-matchups | Reconciled within 0.02 | Missing lineups | Mismatches |
| --- | ---: | ---: | ---: | ---: |
| 2017 | 126 | 0 | 126 | 0 |
| 2018 | 126 | 0 | 126 | 0 |
| 2019 | 126 | 125 | 0 | 1 |
| 2020 | 126 | 126 | 0 | 0 |
| 2021 | 134 | 133 | 0 | 1 |
| 2022 | 134 | 133 | 0 | 1 |
| 2023 | 120 | 120 | 0 | 0 |
| 2024 | 160 | 159 | 0 | 1 |
| 2025 | 168 | 168 | 0 | 0 |
| 2026 | 20 | 20 | 0 | 0 |

2019 onward: 1,084/1,088 completed team-matchups reconcile. No stored snapshot
rows have null points, null current player position, or an unknown lineup slot.
That does not establish that every zero point value is correct or every player is present.
2026 includes three weeks of roster snapshots but only two completed scoring weeks;
never count the third week as completed solely because roster rows exist.

Unresolved exceptions (official total minus starter total):
- 2019 Week 11: 118.80 − 101.70 = 17.10; nine starter rows.
- 2021 Week 2: 143.58 − 118.68 = 24.90; nine starter rows.
- 2022 Week 17: 112.40 − 97.40 = 15.00; nine starter rows.
- 2024 Week 3: 77.42 − 61.52 = 15.90; seven starter rows, no RB starter rows.

Official scores agree with the stored raw ESPN matchup totals in all four cases.
The checked raw `adjustment` fields are absent; this does not rule out adjustments
elsewhere or prove the cause. Do not fabricate player points to close these gaps.
Targeted ESPN re-fetch and raw snapshot review are required before repairing data.

## Position identity

Ten historical roster rows have a snapshot position of QB while the player's
current record says TE: four rows in 2020 and six in 2021. Three were starters
(one FLEX in 2020 and two QB starts in 2021). Use historical snapshot position,
not the mutable current player table, for positional attribution. FLEX is a slot,
not a position. Count actual starters, including FLEX, excluding bench/IR by default.

## Release gates

1. Implement regular-season schedule luck with runtime completeness checks and tests.
2. Positional scoring can initially use fully reconciled seasons (2020, 2023, 2025;
   completed 2026 games). Still verify each requested range at runtime.
3. Decline full-range positional totals involving 2017–2018 or unresolved lineup
   discrepancies. Offer explicitly labeled verified-only coverage rather than
   silently omitting weeks or returning misleading full-history rankings.
4. Keep playoff expected-wins/luck disabled pending a separate definition for
   changing bracket populations and multiweek matchups.
5. Replace the historian's fixed 1,000-matchup fetch cap with pagination before
   relying on full-history completeness at larger league sizes/history lengths.

No luck or positional metric was enabled as part of this audit.

## September 24 follow-up: official versus weekly totals

Read-only inspection of the preserved ESPN matchup payloads found the same
pattern in all four exceptions. `pointsByScoringPeriod` exactly equals the
summed roster starters; `totalPoints` equals our official matchup score.

| Season / week | ESPN team ID | Starter sum | ESPN weekly total | ESPN official total | Unattributed difference |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2019 / 11 | 2 | 101.70 | 101.70 | 118.80 | 17.10 |
| 2021 / 2 | 6 | 118.68 | 118.68 | 143.58 | 24.90 |
| 2022 / 17 | 9 | 97.40 | 97.40 | 112.40 | 15.00 |
| 2024 / 3 | 6 | 61.52 | 61.52 | 77.42 | 15.90 |

This localizes the discrepancy to the preserved source's two score fields; it
is not explained by an arithmetic error in summing our stored starter points.
A commissioner adjustment or historical source inconsistency is plausible, but
neither is proven by these fields. No score or lineup was edited. Do not allocate
the difference to a position, change a bench player into a starter, or replace an
official matchup total just to make reconciliation pass.

Next evidence needed: the ESPN matchup/commissioner record for these exact
season-week-team combinations, or a targeted authenticated re-fetch preserving
both score fields and historical lineup entries. Agreement between roster and
weekly score alone does not prove a complete lineup or establish who earned the
extra official points. The existing positional-query gate remains in place.

## Ranking regression coverage — September 24

The actual homepage ranking presenter and Historian dispatcher are now checked
against independently hand-calculated scores and ranks. Tests cover name/input
order changes and missing coverage with no substitute title-order ranking.
These complement existing checks for provisional careers, ties, date ranges,
active seasons, and the distinct poor-performance index. They run in the free
local/maintenance test suite and do not make paid model calls.

## Commissioner confirmation — September 24

The commissioner confirmed all four adjustments and supplied ESPN screenshots
showing +17.1, +24.9, +15.0 and +15.9 respectively. These supersede the earlier
unresolved-cause notes above. The reviewed registry is stored in
`src/lib/commissioner-adjustments.ts`, keyed by season, season-team ID and week.
No database scores, winners or roster entries were changed.

Position verification now requires starter total plus only these confirmed
adjustments to equal the official total within the existing 0.02 tolerance.
Other missing/duplicate/invalid lineup checks remain. Adjustment points stay
team-level, never player- or position-level. Position scoring share retains the
official team total as denominator, explicitly disclosed in answers. Matchup
pages display the arithmetic when it reconciles, or a discrepancy notice if
source data changes. These four records do not authorize inferred adjustments
for any other game. Regression tests cover each adjustment and ensure an extra
unexplained point still fails verification.
