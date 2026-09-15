"""Fetch an ESPN season and atomically import it through the JBL Supabase RPC."""

from __future__ import annotations

from typing import Any, Callable

from espn_api.football import League
import requests

from .config import EspnConfig, SupabaseConfig


PayloadFetcher = Callable[[EspnConfig, int], dict[str, Any]]


class ImportError(RuntimeError):
    """Raised when a provider fetch or database import cannot complete."""


def fetch_espn_payload(config: EspnConfig, year: int) -> dict[str, Any]:
    """Fetch the raw league payload without performing an ESPN mutation."""

    league = League(
        league_id=config.league_id,
        year=year,
        espn_s2=config.espn_s2,
        swid=config.swid,
        fetch_league=False,
    )
    payload = league.espn_request.get_league()
    if int(payload.get("id", 0)) != config.league_id:
        raise ImportError("ESPN returned an unexpected league ID.")
    if int(payload.get("seasonId", 0)) != year:
        raise ImportError("ESPN returned an unexpected season year.")
    return payload


def import_season(
    espn: EspnConfig,
    supabase: SupabaseConfig,
    year: int,
    fetcher: PayloadFetcher = fetch_espn_payload,
) -> dict[str, Any]:
    """Import one season; the database function provides transaction atomicity."""

    if year < espn.start_year or year > espn.end_year:
        raise ImportError("Requested season is outside the configured range.")

    payload = fetcher(espn, year)
    response = requests.post(
        f"{supabase.url}/rest/v1/rpc/import_espn_season",
        headers={
            "apikey": supabase.secret_key,
            "Authorization": f"Bearer {supabase.secret_key}",
            "Content-Type": "application/json",
        },
        json={"p_payload": payload},
        timeout=90,
    )
    if not response.ok:
        raise ImportError(f"Supabase import failed with HTTP {response.status_code}.")

    result = response.json()
    if not isinstance(result, dict):
        raise ImportError("Supabase returned an unexpected import result.")
    return result
