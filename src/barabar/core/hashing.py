"""Canonical JSON and content hashes. A run is
``(inputs_hash, config_hash, code_version) → outputs_hash``; judges regenerate."""

from __future__ import annotations

import hashlib
import json
import os
import subprocess
from collections.abc import Mapping, Sequence
from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel


def _default(obj: Any) -> Any:
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode="json")
    if isinstance(obj, datetime):
        if obj.tzinfo is None:
            raise TypeError("naive datetime is not canonical; attach a timezone")
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    if isinstance(obj, Enum):
        return obj.value
    if isinstance(obj, bytes):
        return obj.hex()
    if isinstance(obj, (set, frozenset)):
        return sorted(obj)  # type: ignore[type-var]
    if hasattr(obj, "__dataclass_fields__"):
        return {k: getattr(obj, k) for k in obj.__dataclass_fields__}
    raise TypeError(f"not canonicalisable: {type(obj).__name__}")


def canonical_json(obj: Mapping[str, Any] | Sequence[Any] | BaseModel | Any) -> bytes:
    return json.dumps(
        obj, default=_default, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("utf-8")


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def content_hash(obj: Any) -> str:
    return sha256_hex(canonical_json(obj))


def code_version() -> str:
    """``BARABAR_CODE_VERSION`` if set, else the git short SHA (+``-dirty``), else ``unknown``."""
    env = os.environ.get("BARABAR_CODE_VERSION") or os.environ.get("VERCEL_GIT_COMMIT_SHA")
    if env:
        return env[:12]
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "--short=12", "HEAD"], capture_output=True, text=True, check=True
        ).stdout.strip()
        dirty = subprocess.run(
            ["git", "status", "--porcelain"], capture_output=True, text=True
        ).stdout
        return f"{sha}-dirty" if dirty.strip() else sha
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"
