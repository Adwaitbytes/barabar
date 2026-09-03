"""Tally Prime XML import (Gateway of Tally > Import > Vouchers). Debits are
negative amounts with ISDEEMEDPOSITIVE=Yes, credits positive with No, Tally's
convention, not ours."""

from __future__ import annotations

from xml.sax.saxutils import escape

from barabar.exports.journal import Voucher


def _amt(paise: int) -> str:
    sign = "-" if paise < 0 else ""
    paise = abs(paise)
    return f"{sign}{paise // 100}.{paise % 100:02d}"


def tally_xml(
    vouchers: list[Voucher], company: str = "Barabar Demo Pvt Ltd", voucher_type: str = "Journal"
) -> str:
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<ENVELOPE>",
        "<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>",
        "<BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME>",
        f"<STATICVARIABLES><SVCURRENTCOMPANY>{escape(company)}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>",
        "<REQUESTDATA>",
    ]
    for v in vouchers:
        parts.append('<TALLYMESSAGE xmlns:UDF="TallyUDF">')
        parts.append(
            f'<VOUCHER VCHTYPE="{voucher_type}" ACTION="Create" OBJVIEW="Accounting Voucher View">'
        )
        parts.append(f"<DATE>{v.date:%Y%m%d}</DATE>")
        parts.append(f"<EFFECTIVEDATE>{v.date:%Y%m%d}</EFFECTIVEDATE>")
        parts.append(f"<VOUCHERTYPENAME>{voucher_type}</VOUCHERTYPENAME>")
        parts.append(f"<VOUCHERNUMBER>{escape(v.voucher_no)}</VOUCHERNUMBER>")
        parts.append(f"<REFERENCE>{escape(v.settlement_id)}</REFERENCE>")
        parts.append(f"<NARRATION>{escape(v.narration)}</NARRATION>")
        parts.append("<PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>")
        for ln in v.lines:
            debit = ln.debit > 0
            amount = -ln.debit if debit else ln.credit
            parts.append("<ALLLEDGERENTRIES.LIST>")
            parts.append(f"<LEDGERNAME>{escape(ln.ledger)}</LEDGERNAME>")
            parts.append(f"<ISDEEMEDPOSITIVE>{'Yes' if debit else 'No'}</ISDEEMEDPOSITIVE>")
            parts.append(f"<AMOUNT>{_amt(amount)}</AMOUNT>")
            parts.append("</ALLLEDGERENTRIES.LIST>")
        parts.append("</VOUCHER>")
        parts.append("</TALLYMESSAGE>")
    parts += ["</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>"]
    return "\n".join(parts)
