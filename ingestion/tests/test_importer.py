from unittest.mock import Mock, patch

import pytest

from jbl_history.config import EspnConfig, SupabaseConfig
from jbl_history.importer import ImportError, import_season


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
        "https://ksoecnzmisoiyyfdgyoa.supabase.co/rest/v1/rpc/import_espn_season"
    )
    assert post.call_args.kwargs["json"]["p_payload"]["seasonId"] == 2025


def test_import_refuses_a_year_outside_the_jbl_range() -> None:
    with pytest.raises(ImportError, match="outside"):
        import_season(ESPN, SUPABASE, 2016, fixture_fetcher)
