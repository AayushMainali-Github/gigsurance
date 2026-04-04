from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
MOCK_DB_DIR = ROOT_DIR / "mock" / "mock-db"
DEFAULT_ENV_PATH = MOCK_DB_DIR / ".env"
DEFAULT_ARTIFACT_DIR = ROOT_DIR / "ml" / "artifacts"
DEFAULT_CACHE_DIR = ROOT_DIR / "ml" / "cache"
FEATURE_CACHE_VERSION = 3


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


@dataclass(slots=True)
class MongoSettings:
    mongo_uri: str
    db_name: str
    artifact_dir: Path = DEFAULT_ARTIFACT_DIR
    cache_dir: Path = DEFAULT_CACHE_DIR

    @classmethod
    def from_env(cls, env_path: Path = DEFAULT_ENV_PATH) -> "MongoSettings":
        file_env = _read_env_file(env_path)
        mongo_uri = os.getenv("MONGO_URI") or file_env.get("MONGO_URI") or "mongodb://localhost:27017"
        db_name = os.getenv("DB_NAME") or file_env.get("DB_NAME") or "gigsurance"
        artifact_dir = Path(os.getenv("ML_ARTIFACT_DIR") or str(DEFAULT_ARTIFACT_DIR))
        cache_dir = Path(os.getenv("ML_CACHE_DIR") or str(DEFAULT_CACHE_DIR))
        artifact_dir.mkdir(parents=True, exist_ok=True)
        cache_dir.mkdir(parents=True, exist_ok=True)
        return cls(mongo_uri=mongo_uri, db_name=db_name, artifact_dir=artifact_dir, cache_dir=cache_dir)
