"""Validated server-side configuration for ESPN ingestion."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path


class ConfigurationError(ValueError):
    """Raised when required private configuration is missing or invalid."""


def load_env_file(path: Path) -> None:
    """Load a simple dotenv file without overwriting process environment values."""

    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)


@dataclass(frozen=True)
class EspnConfig:
    league_id: int
    start_year: int
    end_year: int
    swid: str
    espn_s2: str

    @classmethod
    def from_environment(cls, env_file: Path | None = None) -> "EspnConfig":
        load_env_file(env_file or Path(".env.local"))
        missing = [
            name for name in ("ESPN_SWID", "ESPN_S2")
            if not os.environ.get(name, "").strip()
        ]
        if missing:
            raise ConfigurationError(
                "Missing private ESPN credentials in .env.local: " + ", ".join(missing)
            )
        try:
            league_id = int(os.environ.get("ESPN_LEAGUE_ID", "1550163"))
            start_year = int(os.environ.get("ESPN_START_YEAR", "2017"))
            end_year = int(os.environ.get("ESPN_END_YEAR", "2026"))
        except ValueError as exc:
            raise ConfigurationError("League ID and season years must be integers.") from exc
        if league_id != 1550163:
            raise ConfigurationError(
                "Refusing to run: ESPN_LEAGUE_ID must be the JBL league 1550163."
            )
        if start_year > end_year:
            raise ConfigurationError("ESPN_START_YEAR cannot be after ESPN_END_YEAR.")
        return cls(
            league_id=league_id,
            start_year=start_year,
            end_year=end_year,
            swid=os.environ["ESPN_SWID"].strip(),
            espn_s2=os.environ["ESPN_S2"].strip(),
        )


@dataclass(frozen=True)
class SupabaseConfig:
    url: str
    secret_key: str

    @classmethod
    def from_environment(cls, env_file: Path | None = None) -> "SupabaseConfig":
        load_env_file(env_file or Path(".env.local"))
        url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
        secret_key = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
        if not url or not secret_key:
            raise ConfigurationError(
                "Missing server-only Supabase configuration: "
                "SUPABASE_URL, SUPABASE_SECRET_KEY"
            )
        expected_url = "https://ksoecnzmisoiyyfdgyoa.supabase.co"
        if url != expected_url:
            raise ConfigurationError(
                "Refusing to run: SUPABASE_URL must target JBL History "
                "(ksoecnzmisoiyyfdgyoa)."
            )
        return cls(url=url, secret_key=secret_key)
