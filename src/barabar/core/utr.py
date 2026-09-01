"""UTR / RRN shapes for NEFT, RTGS and IMPS, plus deterministic generators.

NEFT UTR (16): ``<IFSC4>N<YY><DDD><SEQ6>``  e.g. ``HDFCN26226004471``
RTGS UTR (22): ``<IFSC4>R<C><YYYYMMDD><SEQ8>``  e.g. ``HDFCRC2026081400004471``
IMPS RRN (12): 12 digits.
The UTR belongs to the remitting/correspondent bank, not to Razorpay.
"""

from __future__ import annotations

import re
from datetime import date
from enum import StrEnum
from typing import Final


class UtrKind(StrEnum):
    NEFT = "NEFT"
    RTGS = "RTGS"
    IMPS = "IMPS"


NEFT_RE: Final = re.compile(r"^[A-Z]{4}N\d{2}\d{3}\d{6}$")
RTGS_RE: Final = re.compile(r"^[A-Z]{4}R[A-Z0-9]\d{8}\d{8}$")
IMPS_RE: Final = re.compile(r"^\d{12}$")

NEFT_LEN: Final = 16
RTGS_LEN: Final = 22
IMPS_LEN: Final = 12

IFSC_BANK_CODES: Final[dict[str, str]] = {
    "HDFC": "HDFC",
    "ICICI": "ICIC",
    "SBI": "SBIN",
    "AXIS": "UTIB",
    "KOTAK": "KKBK",
    "YES": "YESB",
    "IDFC": "IDFB",
}


def classify_utr(text: str) -> UtrKind | None:
    if NEFT_RE.match(text):
        return UtrKind.NEFT
    if RTGS_RE.match(text):
        return UtrKind.RTGS
    if IMPS_RE.match(text):
        return UtrKind.IMPS
    return None


def is_valid_utr(text: str) -> bool:
    return classify_utr(text) is not None


def make_neft_utr(bank_code: str, on: date, seq: int) -> str:
    if len(bank_code) != 4 or not bank_code.isalpha():
        raise ValueError("bank_code must be the 4-letter IFSC prefix")
    if not 0 <= seq < 1_000_000:
        raise ValueError("seq out of range for NEFT UTR")
    return f"{bank_code.upper()}N{on.year % 100:02d}{on.timetuple().tm_yday:03d}{seq:06d}"


def make_rtgs_utr(bank_code: str, on: date, seq: int, channel: str = "C") -> str:
    if len(bank_code) != 4 or not bank_code.isalpha():
        raise ValueError("bank_code must be the 4-letter IFSC prefix")
    if len(channel) != 1 or not channel.isalnum():
        raise ValueError("channel must be one alphanumeric char")
    if not 0 <= seq < 100_000_000:
        raise ValueError("seq out of range for RTGS UTR")
    return f"{bank_code.upper()}R{channel.upper()}{on:%Y%m%d}{seq:08d}"


def make_imps_rrn(seq: int) -> str:
    if not 0 <= seq < 1_000_000_000_000:
        raise ValueError("seq out of range for IMPS RRN")
    return f"{seq:012d}"


def utr_prefix_match(full: str, prefix: str, min_len: int = 10) -> int:
    """Length of the common prefix if ``prefix`` is a truncation of ``full`` and at
    least ``min_len`` long, else 0."""
    if len(prefix) < min_len or not full.startswith(prefix):
        return 0
    return len(prefix)
