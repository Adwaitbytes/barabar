"""Deterministic bank-narration grammar (PRD Appendix A).

Real exports differ per bank in delimiter, field order and truncation. HDFC puts
the UTR *last* (``NEFT CR-<IFSC>-<REMITTER>-<REMARKS>-<UTR>``), which is exactly
why a 50-character cap eats the UTR. We therefore find the UTR by *shape*, not by
position, and fall back to a prefix when the shape is cut. The LLM is only allowed
to touch narrations this grammar cannot parse, and its output is re-validated here.
"""

from __future__ import annotations

import re
from typing import Final

from barabar.core.models import Bank, NarrationParsed, TransferMode
from barabar.core.utr import IMPS_RE, NEFT_RE, RTGS_RE

_MODE_RE: Final = re.compile(
    r"^(?:(?:BY|TO)\s+TRANSFER\s*[-/*: ]\s*)?(?P<mode>NEFT|RTGS|IMPS|UPI)\s*(?:CR|DR)?\s*(?P<sep>[-/*:])?\s*(?P<rest>.*)$",
    re.IGNORECASE,
)
_IFSC_RE: Final = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$")
_NEFT_RTGS_PREFIX_RE: Final = re.compile(r"^[A-Z]{4}[NR][A-Z0-9]{1,17}$")
_IMPS_PREFIX_RE: Final = re.compile(r"^\d{6,11}$")
_SETL_RE: Final = re.compile(r"(setl_[A-Za-z0-9]{10,16})")
_RAZORPAY_RE: Final = re.compile(r"RAZORPAY|RAZOR\s*PAY|\bRZP\b", re.IGNORECASE)
_DELIMS: Final = "-/*"

MIN_PREFIX_LEN: Final = 6


def _split(rest: str, sep: str | None) -> list[str]:
    if sep is None:
        for ch in _DELIMS:
            if ch in rest:
                sep = ch
                break
    if sep is None:
        return [rest.strip()] if rest.strip() else []
    return [p.strip() for p in rest.split(sep)]


def _mode(token: str) -> TransferMode:
    return TransferMode(token.upper())


def parse_narration(narration: str, bank: Bank = Bank.UNKNOWN) -> NarrationParsed | None:
    """Parse one narration line. Returns ``None`` when the grammar does not apply
    (unknown layout): that is the *only* case the LLM fallback may handle."""
    text = " ".join(narration.split())
    m = _MODE_RE.match(text)
    if not m:
        return None
    mode = _mode(m.group("mode"))
    tokens = _split(m.group("rest"), m.group("sep"))

    utr_full: str | None = None
    utr_prefix: str | None = None
    prefix_candidates: list[str] = []
    others: list[str] = []
    for tok in tokens:
        up = tok.upper()
        if (
            mode in (TransferMode.NEFT, TransferMode.RTGS, TransferMode.UPI)
            and (NEFT_RE.match(up) or RTGS_RE.match(up))
        ) or (mode == TransferMode.IMPS and IMPS_RE.match(up)):
            utr_full = utr_full or up
        elif _IFSC_RE.match(up):
            continue  # remitter IFSC, never a UTR
        elif (
            mode != TransferMode.IMPS
            and _NEFT_RTGS_PREFIX_RE.match(up)
            and len(up) >= MIN_PREFIX_LEN
        ) or (mode == TransferMode.IMPS and _IMPS_PREFIX_RE.match(up)):
            prefix_candidates.append(up)
        else:
            others.append(tok)
    if utr_full is None and prefix_candidates:
        # HDFC-style layouts truncate the trailing UTR; take the last candidate.
        utr_prefix = prefix_candidates[-1]

    counterparty = max((t for t in others if re.search(r"[A-Za-z]{3,}", t)), key=len, default=None)
    remarks_tokens = [t for t in others if t != counterparty]
    remarks = " | ".join(remarks_tokens) if remarks_tokens else None
    setl = _SETL_RE.search(text)
    return NarrationParsed(
        mode=mode,
        utr_full=utr_full,
        utr_prefix=utr_prefix,
        counterparty=counterparty,
        remarks=remarks,
        settlement_id_hint=setl.group(1) if setl else None,
        razorpay_like=bool(_RAZORPAY_RE.search(text)),
        parser=f"grammar:{bank.value}",
    )


# --- rendering templates used by the simulator (kept next to the grammar so the
# round-trip is tested in one place) -----------------------------------------

RAZORPAY_COUNTERPARTY: Final = "RAZORPAY SOFTWARE PRIVATE LIMITED"
RAZORPAY_IFSC: Final = "HDFC0000060"


def render_narration(
    bank: Bank,
    mode: TransferMode,
    utr: str,
    counterparty: str = RAZORPAY_COUNTERPARTY,
    remarks: str = "SETTLEMENT",
    max_len: int | None = None,
) -> str:
    """Render a narration the way ``bank`` would print it; optionally truncate."""
    match (bank, mode):
        case (Bank.HDFC, TransferMode.NEFT):
            text = f"NEFT CR-{RAZORPAY_IFSC}-{counterparty}-{remarks}-{utr}"
        case (Bank.HDFC, TransferMode.RTGS):
            text = f"RTGS CR-{utr}-{counterparty}-{remarks}"
        case (Bank.ICICI, _):
            text = f"{mode.value}-{utr}-{counterparty}-{remarks}"
        case (Bank.SBI, _):
            text = f"BY TRANSFER-{mode.value}*{utr}*{counterparty}*{remarks}"
        case (Bank.AXIS, TransferMode.RTGS):
            text = f"RTGS/{utr}/{counterparty}/{remarks}"
        case (Bank.AXIS, _) | (Bank.KOTAK, _):
            text = f"{mode.value}/{utr}/{counterparty}/{remarks}"
        case (_, TransferMode.IMPS):
            text = f"IMPS-{utr}-{counterparty}-{remarks}"
        case _:
            text = f"{mode.value}-{utr}-{counterparty}-{remarks}"
    return text[:max_len] if max_len else text
