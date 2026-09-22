# Historian next steps

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
