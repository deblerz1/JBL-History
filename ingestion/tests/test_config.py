from pathlib import Path

import pytest

from jbl_history.config import ConfigurationError, EspnConfig, load_env_file


def test_env_file_preserves_braces_and_equals(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.delenv("ESPN_SWID", raising=False)
    monkeypatch.delenv("ESPN_S2", raising=False)
    path = tmp_path / ".env.local"
    path.write_text('ESPN_SWID="{fixture-id}"\nESPN_S2=part=one==\n', encoding="utf-8")
    load_env_file(path)
    config = EspnConfig.from_environment(tmp_path / "missing")
    assert config.swid == "{fixture-id}"
    assert config.espn_s2 == "part=one=="


def test_refuses_a_different_league(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("ESPN_SWID", "{fixture-id}")
    monkeypatch.setenv("ESPN_S2", "fixture-secret")
    monkeypatch.setenv("ESPN_LEAGUE_ID", "999")
    with pytest.raises(ConfigurationError, match="1550163"):
        EspnConfig.from_environment(tmp_path / "missing")
