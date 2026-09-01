from xml.etree import ElementTree as ET

from barabar.core.config import MatchConfig
from barabar.core.matching import reconcile
from barabar.exports.journal import journal_csv, vouchers_for_run
from barabar.exports.memo import controller_memo, memo_facts
from barabar.exports.tally_xml import tally_xml
from barabar.generator.engine import generate


def test_vouchers_balance_and_cover_every_processed_settlement() -> None:
    g = generate(seed=11, n_orders=150)
    r = reconcile(g.month, MatchConfig(), "run")
    vs = vouchers_for_run(g.month, r)
    processed = [s for s in g.month.settlements if s.status.value == "processed"]
    assert len(vs) == len(processed)
    assert all(v.balanced for v in vs)
    bank_total = sum(ln.debit for v in vs for ln in v.lines if ln.ledger == "HDFC Bank")
    assert bank_total == sum(s.amount for s in processed)
    csv_text = journal_csv(vs)
    assert csv_text.splitlines()[0].startswith("date,voucher_no,ledger")
    assert "Input IGST on PG Charges" in csv_text


def test_cgst_sgst_split_balances() -> None:
    g = generate(seed=12, n_orders=60)
    r = reconcile(g.month, MatchConfig(), "run")
    vs = vouchers_for_run(g.month, r, gst_split="cgst_sgst")
    assert all(v.balanced for v in vs)


def test_tally_xml_is_well_formed_and_uses_tally_sign_convention() -> None:
    g = generate(seed=13, n_orders=40)
    r = reconcile(g.month, MatchConfig(), "run")
    xml = tally_xml(vouchers_for_run(g.month, r))
    root = ET.fromstring(xml)
    vouchers = root.findall(".//VOUCHER")
    assert vouchers and root.find("HEADER/TALLYREQUEST").text == "Import Data"  # type: ignore[union-attr]
    for v in vouchers:
        total = 0
        for entry in v.findall("ALLLEDGERENTRIES.LIST"):
            amt = entry.find("AMOUNT").text  # type: ignore[union-attr]
            positive = entry.find("ISDEEMEDPOSITIVE").text  # type: ignore[union-attr]
            assert (amt.startswith("-")) == (positive == "Yes")  # type: ignore[union-attr]
            rupees, paise = amt.lstrip("-").split(".")  # type: ignore[union-attr]
            total += (-1 if amt.startswith("-") else 1) * (int(rupees) * 100 + int(paise))  # type: ignore[union-attr]
        assert total == 0


def test_memo_numbers_come_from_metrics() -> None:
    g = generate(seed=14, n_orders=90)
    r = reconcile(g.month, MatchConfig(), "run")
    facts = memo_facts(g.month, r)
    text = controller_memo(g.month, r)
    from barabar.core.money import format_inr

    assert format_inr(int(facts["gross_captured"])) in text
    assert format_inr(int(facts["gst_on_fees_itc"])) in text
    assert facts["explained"] + facts["unexplained"] == facts["gross_captured"]
