# Historian acceptance checks

The 80 synthetic questions in `src/lib/historian-questions.ts` cover manager names,
metrics, rolling windows, lists, participation requirements, rivalries, playoffs,
date ranges, and unsupported or ambiguous requests. They contain no private league data.

## Free checks

`npm test` runs the statistical executor tests and all 80 shortcut-boundary cases.
These prove that narrow shortcuts preserve their supported filters and leave other
questions to the planner. They do **not** establish Luna's interpretation accuracy.
The daily maintenance workflow already runs these checks.

## Live Luna acceptance

With a server-side `OPENAI_API_KEY` configured, run:

```sh
JBL_LIVE_EVAL=1 JBL_EVAL_LIMIT=10 npm test -- src/lib/historian-live.test.ts
```

Set `JBL_EVAL_LIMIT=80` for the whole inventory, or add
`JBL_EVAL_CATEGORY=rivalry` for a targeted run. Supported categories are manager,
metric, rolling, list_cohort, rivalry, playoffs, scope, clarify_or_unsupported.
Each selected case makes at most one API request; shortcuts make none. Tests run
sequentially and do not retry. `OPENAI_MODEL` selects the model just as in production.
The default live limit is 10. A request limit is not a dollar spending cap.

Live checks exercise the actual production planner with synthetic identities.
They compare returned plan fields with expectations; they never accept a timeout
as a successful refusal. Failures are a backlog for improving the planner, not a
reason to weaken expectations. Passing synthetic tests still requires spot checks
against real league data and production identity aliases.

Live evaluations are not scheduled yet and are skipped by normal test runs.
They require a key in the environment where they run; a Vercel key is not
automatically available in GitHub Actions. Never paste the key into a test file.
