"""Fetch an ESPN season and atomically import it through the JBL Supabase RPC."""

from __future__ import annotations

from datetime import UTC, datetime
import hashlib
from typing import Any, Callable

from espn_api.football import League
import requests

from .config import EspnConfig, SupabaseConfig


PayloadFetcher = Callable[[EspnConfig, int], dict[str, Any]]


LINEUP_SLOTS = {
    0: "QB", 2: "RB", 4: "WR", 6: "TE", 16: "D/ST", 17: "K",
    20: "BE", 21: "IR", 23: "FLEX", 24: "ER", 25: "Rookie",
}


def _fetch_history_bundle(league: League, year: int) -> dict[str, Any]:
    """Fetch read-only draft, weekly roster, and transaction payloads."""

    warnings: list[str] = []
    players: dict[int, dict[str, Any]] = {}
    draft_picks: list[dict[str, Any]] = []
    roster_snapshots: list[dict[str, Any]] = []
    transactions: list[dict[str, Any]] = []

    try:
        draft_payload = league.espn_request.get_league_draft()
        draft_detail = draft_payload.get("draftDetail") or {}
        for pick in draft_detail.get("picks", []):
            player_id = int(pick["playerId"])
            draft_picks.append({
                "espn_player_id": player_id,
                "espn_team_id": int(pick["teamId"]),
                "round_number": int(pick.get("roundId") or 1),
                "round_pick_number": int(pick.get("roundPickNumber") or 1),
                "overall_pick_number": int(pick["overallPickNumber"]),
                "bid_amount": pick.get("bidAmount"),
                "is_keeper": bool(pick.get("keeper") or pick.get("reservedForKeeper")),
                "raw_data": pick,
            })
        draft = {
            "draft_type": str(draft_detail.get("type") or "unknown"),
            "drafted_at": draft_detail.get("date"),
            "rounds": draft_detail.get("rounds"),
            "seconds_per_pick": draft_detail.get("timePerSelection"),
            "picks": draft_picks,
        }
    except Exception as exc:
        draft = {"picks": []}
        warnings.append(f"draft:{type(exc).__name__}")

    if year >= 2019:
        configured_final_week = int(getattr(league, "finalScoringPeriod", 0) or 0)
        current_week = int(getattr(league, "current_week", 0) or 0)
        final_week = min(configured_final_week, current_week) if current_week else configured_final_week
        player_team_cache: dict[int, int] = {}
        for week in range(1, final_week + 1):
            try:
                boxes = league.box_scores(week=week, player_team_cache=player_team_cache)
                for box in boxes:
                    for side in ("home", "away"):
                        team = getattr(box, f"{side}_team")
                        if not team:
                            continue
                        for entry in getattr(box, f"{side}_lineup"):
                            raw = getattr(entry, "__dict__", {})
                            player_id = int(getattr(entry, "playerId"))
                            players[player_id] = {
                                "espn_player_id": player_id,
                                "full_name": getattr(entry, "name", None) or f"ESPN Player {player_id}",
                                "pro_team": str(getattr(entry, "proTeamId", "")) or None,
                                "default_position": getattr(entry, "position", None),
                                "eligible_positions": list(getattr(entry, "eligibleSlots", []) or []),
                                "active": not bool(getattr(entry, "injured", False)),
                            }
                            slot = getattr(entry, "slot_position", None)
                            roster_snapshots.append({
                                "matchup_period": week,
                                "espn_team_id": int(team.team_id),
                                "espn_player_id": player_id,
                                "lineup_slot": slot,
                                "lineup_slot_id": next((key for key, value in LINEUP_SLOTS.items() if value == slot), None),
                                "points": float(getattr(entry, "points", 0)),
                                "projected_points": float(getattr(entry, "projected_points", 0)),
                                "raw_data": {key: value for key, value in raw.items() if isinstance(value, (str, int, float, bool, type(None)))},
                            })
            except Exception as exc:
                warnings.append(f"rosters:week-{week}:{type(exc).__name__}")

        offset = 0
        page_size = 100
        seen_transactions: set[str] = set()
        while offset < 1000:
            try:
                activities = league.recent_activity(size=page_size, offset=offset)
            except Exception as exc:
                warnings.append(f"transactions:{type(exc).__name__}")
                break
            if not activities:
                break
            new_transactions = 0
            for activity in activities:
                activity_items = []
                action_names = []
                for action_index, action in enumerate(activity.actions):
                    team, action_name, player, bid_amount = action
                    player_id = getattr(player, "playerId", player if isinstance(player, int) else None)
                    if player_id is None:
                        continue
                    player_id = int(player_id)
                    if hasattr(player, "name"):
                        players[player_id] = {
                            "espn_player_id": player_id,
                            "full_name": player.name or f"ESPN Player {player_id}",
                            "pro_team": str(getattr(player, "proTeamId", "")) or None,
                            "default_position": getattr(player, "position", None),
                            "eligible_positions": list(getattr(player, "eligibleSlots", []) or []),
                            "active": not bool(getattr(player, "injured", False)),
                        }
                    action_names.append(action_name)
                    team_id = getattr(team, "team_id", None)
                    activity_items.append({
                        "source_item_key": f"{action_index}:{action_name}:{player_id}:{team_id}",
                        "espn_player_id": player_id,
                        "espn_team_id": team_id,
                        "item_type": action_name,
                        "bid_amount": bid_amount or None,
                    })
                identity = "|".join(
                    sorted(item["source_item_key"] for item in activity_items)
                )
                digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:16]
                transaction_id = f"{int(activity.date)}:{digest}"
                if transaction_id in seen_transactions:
                    continue
                seen_transactions.add(transaction_id)
                new_transactions += 1
                transactions.append({
                    "espn_transaction_id": transaction_id,
                    "transaction_type": "+".join(sorted(set(action_names))) or "UNKNOWN",
                    "status": "EXECUTED",
                    "processed_at": datetime.fromtimestamp(int(activity.date) / 1000, UTC).isoformat(),
                    "items": activity_items,
                })
            if new_transactions == 0:
                break
            offset += len(activities)
    else:
        warnings.extend(["rosters:unavailable-before-2019", "transactions:unavailable-before-2019"])

    return {
        "draft": draft,
        "players": list(players.values()),
        "roster_snapshots": roster_snapshots,
        "transactions": transactions,
        "warnings": warnings,
    }


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
    league._fetch_league()
    payload["jblHistory"] = _fetch_history_bundle(league, year)
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
        f"{supabase.url}/rest/v1/rpc/import_espn_history",
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
