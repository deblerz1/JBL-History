"""Read-only ESPN connectivity and historical availability probes."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Callable

from espn_api.football import League

from .config import EspnConfig


LeagueFactory = Callable[..., Any]


def _safe_error(exc: Exception) -> str:
    """Return only an exception type; provider messages can contain request secrets."""

    return type(exc).__name__


@dataclass
class Probe:
    available: bool
    count: int | None = None
    note: str | None = None


@dataclass
class SeasonAvailability:
    year: int
    accessible: bool = False
    legacy: bool = False
    league_name: str | None = None
    current_week: int | None = None
    previous_seasons: list[int] = field(default_factory=list)
    probes: dict[str, Probe] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _count_attribute(league: Any, name: str) -> Probe:
    try:
        value = getattr(league, name)
        return Probe(available=True, count=len(value) if value is not None else 0)
    except Exception as exc:  # provider responses vary by historical season
        return Probe(available=False, note=_safe_error(exc))


def probe_season(
    config: EspnConfig,
    year: int,
    league_factory: LeagueFactory = League,
    include_live_details: bool = False,
) -> SeasonAvailability:
    """Probe one ESPN season without mutating ESPN or Supabase."""

    result = SeasonAvailability(year=year, legacy=year < 2018)
    try:
        league = league_factory(
            league_id=config.league_id,
            year=year,
            espn_s2=config.espn_s2,
            swid=config.swid,
        )
    except Exception as exc:
        result.warnings.append(_safe_error(exc))
        return result

    result.accessible = True
    result.league_name = getattr(getattr(league, "settings", None), "name", None)
    result.current_week = getattr(league, "current_week", None)
    result.previous_seasons = sorted(getattr(league, "previousSeasons", []) or [])
    for attribute in ("teams", "members", "draft"):
        result.probes[attribute] = _count_attribute(league, attribute)

    if year < 2019:
        result.probes["weekly_box_scores"] = Probe(
            available=False,
            note="espn-api supports box scores only for 2019 and later",
        )
        result.probes["transactions"] = Probe(
            available=False,
            note="espn-api supports activity only for 2019 and later",
        )
    elif include_live_details:
        try:
            result.probes["weekly_box_scores"] = Probe(
                available=True, count=len(league.box_scores(week=1))
            )
        except Exception as exc:
            result.probes["weekly_box_scores"] = Probe(False, note=_safe_error(exc))
        try:
            result.probes["transactions"] = Probe(
                available=True, count=len(league.recent_activity(size=1))
            )
        except Exception as exc:
            result.probes["transactions"] = Probe(False, note=_safe_error(exc))
    else:
        result.probes["weekly_box_scores"] = Probe(
            available=False, note="not requested; rerun with --details"
        )
        result.probes["transactions"] = Probe(
            available=False, note="not requested; rerun with --details"
        )
    return result


def discover_seasons(
    config: EspnConfig,
    years: list[int],
    league_factory: LeagueFactory = League,
    include_live_details: bool = False,
) -> dict[str, Any]:
    seasons = [
        probe_season(config, year, league_factory, include_live_details)
        for year in years
    ]
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "league_id": config.league_id,
        "requested_years": years,
        "accessible_years": [item.year for item in seasons if item.accessible],
        "seasons": [item.to_dict() for item in seasons],
    }
