"""Scheduled refresh of one season, using the existing JBL-only importer."""

from datetime import UTC, datetime
import os
from pathlib import Path

from .config import EspnConfig, SupabaseConfig
from .importer import import_season


def season_for_date(now: datetime) -> int:
    # January/February games and corrections belong to the preceding NFL season.
    return now.year - 1 if now.month <= 2 else now.year


def validate_receipt(result: dict, year: int) -> None:
    if result.get("league_id") != 1550163 or result.get("season") != year:
        raise ValueError("Import receipt has an unexpected league or season.")
    if not isinstance(result.get("teams"), int) or result["teams"] < 2:
        raise ValueError("Import receipt contains fewer than two teams.")


def main() -> None:
    now = datetime.now(UTC)
    year = season_for_date(now)
    os.environ["ESPN_END_YEAR"] = str(year)
    try:
        result = import_season(
            EspnConfig.from_environment(), SupabaseConfig.from_environment(), year
        )
        validate_receipt(result, year)
    except Exception as exc:
        # Provider errors can contain URLs/cookies; keep scheduled logs sanitized.
        raise SystemExit(f"JBL refresh failed ({type(exc).__name__}); no successful refresh confirmed.") from None
    lines = [
        "## JBL refresh completed",
        f"- Season: {year}",
        f"- Finished (UTC): {datetime.now(UTC).isoformat()}",
        f"- Teams: {result['teams']}",
        f"- Matchups: {result.get('matchups', 0)}",
        f"- Roster rows: {result.get('roster_snapshots', 0)}",
        f"- Import warnings: {len(result.get('warnings') or [])}",
        "- Receipt validated; this does not independently reconcile ESPN scores.",
    ]
    summary = "\n".join(lines) + "\n"
    print(summary)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with Path(os.environ["GITHUB_STEP_SUMMARY"]).open("a") as handle:
            handle.write(summary)


if __name__ == "__main__":
    main()
