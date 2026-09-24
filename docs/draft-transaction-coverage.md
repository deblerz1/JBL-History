# Draft and transaction coverage

Audit date: September 24, 2026. Scope: JBL History only.

- 1,376 draft entries are preserved across 2017–2026. Draft reads now paginate rather than relying on a single API response.
- ESPN labels 2017–2018 SNAKE and 2019–2026 OFFLINE. Offline entry order does not establish the original draft order or format.
- No positive auction bid amounts are preserved. Zero values must not be presented as verified free purchases.
- Week 1 matchup links provide access to preserved lineups from 2019 onward. These may include post-draft transactions and are not verified pre-transaction rosters.
- The audit found 73 transaction events in 2026 and no preserved transaction events in 2017–2025. Missing events do not establish zero activity. Counts can change with later imports.
- Transaction events and items now paginate. Season coverage is shown explicitly, and team totals describe preserved moves rather than all-time trade rankings.

Validation: lint, TypeScript, 216 local tests, and production build passed. Pagination tests cover multi-page results, exact boundaries, and failing without returning a partial archive.
