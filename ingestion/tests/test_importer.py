from unittest.mock import Mock, patch
from types import SimpleNamespace

import pytest

from jbl_history.config import EspnConfig, SupabaseConfig
from jbl_history.importer import ImportError, _fetch_history_bundle, import_season


ESPN = EspnConfig(1550163, 2017, 2026, "{fixture-id}", "fixture-secret")
SUPABASE = SupabaseConfig(
    "https://ksoecnzmisoiyyfdgyoa.supabase.co", "fixture-db-secret"
)


def fixture_fetcher(config: EspnConfig, year: int) -> dict:
    assert config.league_id == 1550163
    return {"id": 1550163, "seasonId": year, "teams": [], "members": []}


@patch("jbl_history.importer.requests.post")
def test_import_calls_only_the_jbl_atomic_rpc(post: Mock) -> None:
    post.return_value.ok = True
    post.return_value.json.return_value = {
        "league_id": 1550163,
        "season": 2025,
        "members": 10,
        "teams": 10,
        "matchups": 140,
    }

    result = import_season(ESPN, SUPABASE, 2025, fixture_fetcher)

    assert result["teams"] == 10
    assert post.call_args.args[0] == (
        "https://ksoecnzmisoiyyfdgyoa.supabase.co/rest/v1/rpc/import_espn_history"
    )
    assert post.call_args.kwargs["json"]["p_payload"]["seasonId"] == 2025


def test_import_refuses_a_year_outside_the_jbl_range() -> None:
    with pytest.raises(ImportError, match="outside"):
        import_season(ESPN, SUPABASE, 2016, fixture_fetcher)


def test_history_bundle_normalizes_extended_entities_and_stable_transactions() -> None:
    player = SimpleNamespace(
        playerId=42, name="Fixture Runner", proTeamId=1, position="RB",
        eligibleSlots=[2, 20, 23], injured=False, slot_position="RB",
        points=18.5, projected_points=14.25,
    )
    team = SimpleNamespace(team_id=1)
    activity = SimpleNamespace(
        date=1_750_000_000_000,
        actions=[(team, "WAIVER ADDED", player, 7)],
    )

    class Request:
        def get_league_draft(self):
            return {"draftDetail": {"drafted": True, "type": "AUCTION", "picks": [{
                "playerId": 42, "teamId": 1, "roundId": 1,
                "roundPickNumber": 1, "overallPickNumber": 1, "bidAmount": 25,
            }]}}

    class League:
        finalScoringPeriod = 1
        current_week = 1
        espn_request = Request()

        def box_scores(self, week, player_team_cache):
            return [SimpleNamespace(
                home_team=team, away_team=None, home_lineup=[player], away_lineup=[]
            )]

        def recent_activity(self, size, offset):
            return [activity] if offset in (0, 1) else []

    bundle = _fetch_history_bundle(League(), 2025)

    assert len(bundle["draft"]["picks"]) == 1
    assert len(bundle["roster_snapshots"]) == 1
    assert bundle["roster_snapshots"][0]["points"] == 18.5
    assert len(bundle["transactions"]) == 1
    assert bundle["transactions"][0]["items"][0]["bid_amount"] == 7
