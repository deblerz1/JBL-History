from types import SimpleNamespace

from jbl_history.config import EspnConfig
from jbl_history.discovery import discover_seasons, probe_season


CONFIG = EspnConfig(1550163, 2017, 2026, "{fixture-id}", "fixture-secret")


class FixtureLeague:
    def __init__(self, league_id, year, espn_s2, swid):
        assert league_id == 1550163
        assert espn_s2 == "fixture-secret"
        assert swid == "{fixture-id}"
        if year == 2018:
            raise RuntimeError("season unavailable; cookie fixture-secret must never leak")
        self.settings = SimpleNamespace(name="Joey Bags Fantasy League")
        self.current_week = 17
        self.previousSeasons = [2019, 2020]
        self.teams = [object(), object()]
        self.members = [{"id": "one"}]
        self.draft = []

    def box_scores(self, week):
        assert week == 1
        return [object()]

    def recent_activity(self, size):
        assert size == 1
        return []


def test_probes_a_modern_season_with_optional_details() -> None:
    result = probe_season(CONFIG, 2025, FixtureLeague, include_live_details=True)
    assert result.accessible is True
    assert result.probes["teams"].count == 2
    assert result.probes["weekly_box_scores"].count == 1
    assert result.probes["transactions"].count == 0


def test_discovery_continues_and_redacts_errors() -> None:
    report = discover_seasons(CONFIG, [2017, 2018], FixtureLeague)
    assert report["accessible_years"] == [2017]
    assert report["seasons"][1]["accessible"] is False
    assert "fixture-secret" not in report["seasons"][1]["warnings"][0]
