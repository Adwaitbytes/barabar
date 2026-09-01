import hashlib
import hmac
import json

import pytest
from fastapi.testclient import TestClient

from barabar.api import app as app_module
from barabar.api.store import Store


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    app_module._store = Store("sqlite://")  # in-memory
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "whsec_test")
    return TestClient(app_module.app)


def test_run_lifecycle_close_pack_and_exports(client: TestClient) -> None:
    r = client.post("/runs", json={"source": "synthetic", "n_orders": 120, "seed": 3})
    assert r.status_code == 201, r.text
    run = r.json()
    assert run["stage"] == "finished" and run["outputs_hash"]
    rid = run["run_id"]
    cp = client.get(f"/runs/{rid}/close-pack").json()
    assert cp["headline"]["gross_captured"] > 0 and cp["settlements"] and cp["calendar"]
    statuses = {s["match_status"] for s in cp["settlements"]}
    assert "matched" in statuses
    exc = client.get(f"/runs/{rid}/exceptions", params={"status": "open"}).json()
    assert exc and exc[0]["amount_display"].startswith("₹")
    sid = next(s["settlement_id"] for s in cp["settlements"] if s["match_status"] == "matched")
    tree = client.get(f"/runs/{rid}/proof/{sid}").json()
    assert tree["kind"] == "root" and tree["children"]
    assert client.get(f"/runs/{rid}/export/journal.csv").text.startswith("date,voucher_no")
    assert "<ENVELOPE>" in client.get(f"/runs/{rid}/export/tally.xml").text
    assert "controller's memo" in client.get(f"/runs/{rid}/export/memo.md").text
    assert client.get(f"/runs/{rid}/export/exceptions.csv").status_code == 200
    audit = client.get(f"/runs/{rid}/audit").json()
    assert audit["verified"] is True and len(audit["events"]) > 0


def test_resolve_exception_is_logged_and_persists(client: TestClient) -> None:
    rid = client.post("/runs", json={"source": "synthetic", "n_orders": 80, "seed": 4}).json()[
        "run_id"
    ]
    exc = client.get(f"/runs/{rid}/exceptions", params={"status": "open"}).json()[0]
    before = len(client.get(f"/runs/{rid}/audit").json()["events"])
    r = client.post(
        f"/runs/{rid}/exceptions/{exc['exc_id']}/resolve",
        json={"status": "accepted", "note": "verified with bank", "actor": "user:cfo"},
    )
    assert (
        r.status_code == 200
        and r.json()["status"] == "accepted"
        and r.json()["resolved_by"] == "user:cfo"
    )
    again = client.get(f"/runs/{rid}/exceptions/{exc['exc_id']}").json()
    assert again["status"] == "accepted" and again["resolution_note"] == "verified with bank"
    audit = client.get(f"/runs/{rid}/audit").json()
    assert audit["verified"] and len(audit["events"]) == before + 1
    assert audit["events"][-1]["actor"] == "user:cfo"


def test_rerun_is_idempotent_and_diff_is_empty(client: TestClient) -> None:
    first = client.post("/runs", json={"source": "synthetic", "n_orders": 60, "seed": 5}).json()
    second = client.post(f"/runs/{first['run_id']}/rerun").json()
    assert second["identical_outputs"] is True
    assert second["outputs_hash"] == first["outputs_hash"]
    assert second["diff"]["closed"] == [] and second["diff"]["opened"] == []


def test_webhook_replay_storm(client: TestClient) -> None:
    payload = {
        "event": "refund.processed",
        "payload": {"refund": {"entity": {"id": "rfnd_ABC123", "amount": 5000}}},
    }
    body = json.dumps(payload).encode()
    sig = hmac.new(b"whsec_test", body, hashlib.sha256).hexdigest()
    results = [
        client.post(
            "/webhooks/razorpay",
            content=body,
            headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"},
        ).json()
        for _ in range(50)
    ]
    assert results[0]["status"] == "recorded"
    assert all(r["status"] == "duplicate_ignored" for r in results[1:])
    assert results[-1]["duplicates_ignored"] == 49
    assert client.get("/webhooks/stats").json() == {"events": 1, "duplicates_ignored": 49}


def test_webhook_bad_signature_rejected(client: TestClient) -> None:
    r = client.post(
        "/webhooks/razorpay",
        content=b'{"event":"x"}',
        headers={"X-Razorpay-Signature": "nope", "Content-Type": "application/json"},
    )
    assert r.status_code == 401


def test_kill_mid_run_resume(client: TestClient) -> None:
    from barabar.core.config import MatchConfig
    from barabar.generator.engine import generate

    s = app_module._store
    assert s is not None
    gen = generate(seed=8, n_orders=70)
    run = s.create_run(
        gen.month, MatchConfig(), source={"kind": "test"}
    )  # persisted at stage 'ingested', then "killed"
    assert s.get_run(run.run_id).stage == "ingested"
    resumed = s.resume_incomplete(MatchConfig())
    assert run.run_id in resumed
    finished = s.get_run(run.run_id)
    assert finished.stage == "finished"
    from barabar.core.matching import reconcile

    assert finished.outputs_hash == reconcile(gen.month, MatchConfig(), "x").outputs_hash()


def test_upload_run_with_bank_and_ledger(client: TestClient, tmp_path) -> None:  # type: ignore[no-untyped-def]
    from pathlib import Path

    from barabar.evals.datasets import write_dataset
    from barabar.generator.engine import generate

    gen = generate(seed=21, n_orders=50)
    write_dataset(gen, tmp_path)
    files = [
        ("razorpay", (name, (tmp_path / name).read_bytes(), "application/json"))
        for name in (
            "razorpay_payments.json",
            "razorpay_refunds.json",
            "razorpay_settlements.json",
            "razorpay_settlement_recon.json",
        )
    ]
    bank_file = next(Path(tmp_path).glob("bank_statement_*.csv"))
    files.append(("bank", (bank_file.name, bank_file.read_bytes(), "text/csv")))
    files.append(("ledger", ("ledger.csv", (tmp_path / "ledger.csv").read_bytes(), "text/csv")))
    r = client.post("/runs/upload", data={"as_of": gen.month.as_of.isoformat()}, files=files)
    assert r.status_code == 201, r.text
    assert r.json()["metrics"]["settlements_matched_to_bank"] > 0
