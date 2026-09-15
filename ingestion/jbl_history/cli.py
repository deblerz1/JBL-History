"""Command-line interface for the JBL History ESPN importer."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from .config import ConfigurationError, EspnConfig, SupabaseConfig
from .discovery import discover_seasons
from .importer import ImportError as SeasonImportError, import_season


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="jbl-history")
    subparsers = parser.add_subparsers(dest="command", required=True)
    auth = subparsers.add_parser("auth-test", help="Test one season without printing secrets")
    auth.add_argument("--year", type=int, default=2025)
    discover = subparsers.add_parser("discover", help="Probe the configured season range")
    discover.add_argument("--year", type=int, action="append", dest="years")
    discover.add_argument("--details", action="store_true")
    discover.add_argument(
        "--output", type=Path, default=Path("reports/espn-availability.json")
    )
    import_parser = subparsers.add_parser(
        "import-season", help="Atomically import one ESPN season into JBL Supabase"
    )
    import_parser.add_argument("--year", type=int, required=True)
    import_parser.add_argument("--output", type=Path)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        config = EspnConfig.from_environment()
    except ConfigurationError as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2

    if args.command == "import-season":
        try:
            result = import_season(
                config, SupabaseConfig.from_environment(), year=args.year
            )
        except (ConfigurationError, SeasonImportError) as exc:
            print(f"Import failed: {exc}", file=sys.stderr)
            return 1
        rendered = json.dumps(result, sort_keys=True)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(rendered + "\n", encoding="utf-8")
        print(rendered)
        return 0

    years = (
        [args.year]
        if args.command == "auth-test"
        else args.years or list(range(config.start_year, config.end_year + 1))
    )
    report = discover_seasons(
        config, years, include_live_details=getattr(args, "details", False)
    )
    if args.command == "auth-test":
        result = report["seasons"][0]
        if result["accessible"]:
            print(
                f"ESPN authentication succeeded for league {config.league_id}, "
                f"season {args.year}."
            )
            return 0
        print(
            f"ESPN authentication failed for league {config.league_id}, season {args.year}.",
            file=sys.stderr,
        )
        print(result["warnings"][0], file=sys.stderr)
        return 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        f"Probed {len(years)} season(s); {len(report['accessible_years'])} accessible. "
        f"Report: {args.output}"
    )
    return 0 if report["accessible_years"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
