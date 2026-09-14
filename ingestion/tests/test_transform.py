import json
from pathlib import Path

from jbl_history import normalize_league_payload


FIXTURE = Path(__file__).parent / "fixtures" / "espn_league_2025.json"


def load_fixture() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def test_normalizes_foundation_records() -> None:
    normalized = normalize_league_payload(load_fixture())

    assert normalized["leagues"][0]["espn_league_id"] == 1550163
    assert normalized["seasons"][0]["year"] == 2025
    assert normalized["seasons"][0]["status"] == "complete"
    assert normalized["seasons"][0]["is_legacy"] is False
    assert len(normalized["members"]) == 2
    assert normalized["season_teams"][0]["team_name"] == "Fixture Foxes"
    assert normalized["matchups"][0]["home_score"] == 124.5


def test_normalization_is_deterministic_for_idempotent_upserts() -> None:
    payload = load_fixture()

    assert normalize_league_payload(payload) == normalize_league_payload(payload)
