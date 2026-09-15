"""Pure transformations from ESPN-shaped JSON to database-ready records."""

from __future__ import annotations

from typing import Any


def _team_name(team: dict[str, Any]) -> str:
    canonical_name = str(team.get("name") or "").strip()
    if canonical_name:
        return canonical_name
    location = str(team.get("location") or "").strip()
    nickname = str(team.get("nickname") or "").strip()
    name = " ".join(part for part in (location, nickname) if part)
    return name or f"Team {team['id']}"


def normalize_league_payload(payload: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Normalize a safe ESPN subset into stable, database-ready records."""

    league_id = int(payload["id"])
    season_year = int(payload["seasonId"])
    settings = payload.get("settings", {})

    league = {
        "espn_league_id": league_id,
        "name": settings.get("name", "Joey Bags Fantasy League"),
        "is_private": True,
    }
    season = {
        "league_espn_id": league_id,
        "year": season_year,
        "status": "complete" if payload.get("status", {}).get("isActive") is False else "active",
        "is_legacy": season_year < 2018,
    }

    members = [
        {
            "league_espn_id": league_id,
            "espn_member_id": member["id"],
            "display_name": member.get("displayName") or "Unknown manager",
        }
        for member in payload.get("members", [])
    ]

    teams = []
    for team in payload.get("teams", []):
        record = team.get("record", {}).get("overall", {})
        teams.append(
            {
                "season_year": season_year,
                "espn_team_id": int(team["id"]),
                "espn_member_id": (team.get("owners") or [None])[0],
                "team_name": _team_name(team),
                "abbreviation": team.get("abbrev"),
                "wins": int(record.get("wins", 0)),
                "losses": int(record.get("losses", 0)),
                "ties": int(record.get("ties", 0)),
                "points_for": float(record.get("pointsFor", 0)),
                "points_against": float(record.get("pointsAgainst", 0)),
            }
        )

    matchups = []
    for matchup in payload.get("schedule", []):
        home = matchup["home"]
        away = matchup.get("away")
        matchups.append(
            {
                "season_year": season_year,
                "espn_matchup_id": str(matchup["id"]),
                "matchup_period": int(matchup["matchupPeriodId"]),
                "home_espn_team_id": int(home["teamId"]),
                "away_espn_team_id": int(away["teamId"]) if away else None,
                "home_score": float(home.get("totalPoints", 0)),
                "away_score": float(away.get("totalPoints", 0)) if away else None,
            }
        )

    return {
        "leagues": [league],
        "seasons": [season],
        "members": members,
        "season_teams": teams,
        "matchups": matchups,
    }
