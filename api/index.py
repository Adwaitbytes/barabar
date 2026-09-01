"""Vercel entrypoint: the FastAPI app from ``barabar.api.app`` (Fluid Compute, Python 3.12)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from barabar.api.app import app  # noqa: E402

__all__ = ["app"]
