# Barabar

**AI Finance Controller for Razorpay merchants · Razorpay AI Buildathon, Track 04**

A Razorpay payout is one bank credit hiding hundreds of orders, fees, 18% GST on fees, refunds and chargebacks. Barabar reconciles **settlements ↔ bank statement ↔ sales ledger** to the paise, explains every unmatched rupee with a *typed exception*, drafts the journal entries, and answers *"why did ₹1,83,412 land in my bank?"* with a proof tree.

**Deterministic where money is decided. AI only on the tail.** No LLM has ever decided a match in this system.

> *Barabar* (बराबर): "exactly equal". *Hisaab barabar* — the books square.

## Headline (regenerate with `make evals`)

| Month | Auto-match | Precision (tiers A/B) | Explained | Coverage of explainable | Classification | Wall clock |
|---|---:|---:|---:|---:|---:|---:|
| 60 orders | 100.0% | 100% | 74.4% | 100% | 100% | 0.005 s |
| 600 orders | 99.94% | 100% | 92.5% | 100% | 100% | 0.03 s |
| 6,000 orders | 99.99% | 100% | 97.0% | 100% | 100% | 0.55 s |

"Explained" is honest: the demo month deliberately injects a missing bank credit, an unknown credit, a truncated UTR and two manual adjustments — rupees no rule can explain without a person. "Coverage" is how much of everything *else* the rules explained. Both numbers are in `evals/reports/latest.md`, computed against generator ground truth, never against the matcher's opinion of itself. False-match cost at tiers A/B: **₹0** at every size.

## 60-second quickstart

```bash
make install            # uv venv + deps (Python 3.12)
make demo               # reconcile a 600-order synthetic month; prints hashes + close pack
make evals              # regenerate evals/reports/<date>.md (60 / 600 / 6,000 orders)
make api                # FastAPI on :8000  (web UI lives in web/)
```

`make demo` prints `inputs_hash · config_hash · code_version · outputs_hash` before any match rate. Same inputs, same config → same hash, every time.

Optional: `cp .env.example .env`, add a **test-mode** Razorpay key and `ANTHROPIC_API_KEY` for the investigator. `make seed` creates test-mode orders; `barabar fetch --year 2026 --month 9 --out evals/datasets/testmode` pulls them back.

## What it does

1. **Ingest** Razorpay entities (API, webhooks, or `/settlements/recon` JSON), the bank statement (HDFC / ICICI / SBI / Axis / Kotak CSV or XLSX, auto-detected), the sales ledger (CSV, documented schema).
2. **Match** with three deterministic tiers — `A` exact keys (UTR, settlement id, payment id, receipt), `B` netted/derived (batch net, gross−fee−GST decomposition, refund netting, split UTRs, partial continuation, calendar reshift, failed-retry chains), `C` fuzzy proposals capped at 0.85 that a human accepts.
3. **Explain** every residual with one of 23 typed exceptions (`docs/EXCEPTIONS.md`), each with the rule that produced it, a confidence, and a suggested action.
4. **Prove**: a proof tree per bank credit — bank credit ← settlement ← lines (gross − fee − GST) − refunds − chargebacks ± adjustments, every node tagged with its rule id.
5. **Investigate** the tail: a tier-D agent reads through read-only tools, proposes a hypothesis with hashed evidence, names the alternative it rejected. It cannot write. `NumberGuard` blocks any figure it did not get from a tool — including "helpful" rounding.
6. **Close**: journal vouchers (CSV, Tally Prime XML), a controller's memo, the GST-on-fees ITC figure, an exceptions CSV, and a hash-chained audit trail.

## Simulated vs real

Test mode gives real payments, refunds, disputes and webhooks; it does **not** reliably generate settlements. Barabar ships a Settlement Simulator that applies Razorpay's documented rules (T+2 working days, RBI 2026 holidays, per-method MDR + 18% GST, refund/dispute netting, partial/split/failed batches, per-bank narration layouts and truncation) and says so: `docs/SIMULATED-VS-REAL.md`. With a live key that has settlements, `/v1/settlements/recon` is read and the simulator is bypassed.

## Where we chose not to use AI

| Task | Code | LLM |
|---|---|---|
| Deciding two records match | ✅ | ❌ |
| Fee / tax / net arithmetic, calendar, cut-offs | ✅ | ❌ |
| Parsing bank narration (known layouts) | ✅ grammar | fallback only, re-validated |
| Classifying an exception | ✅ | ❌ |
| Investigating an open exception | ❌ | ✅ read-only tools |
| Explaining a proof tree, drafting memo prose | ❌ | ✅ every number guarded |

## Non-goals (v1)

Barabar does not move money (no refunds, payouts or captures are ever initiated), does not forecast cash, does not contest disputes (it surfaces them with evidence), and has no live bank connectivity (Account Aggregator is documented, not built).

## Repo map

```
src/barabar/core        money · calendar · rate card · UTR + narration grammar · models · matcher A/B/C · proof trees · audit chain
src/barabar/simulator   Razorpay settlement rules → settlements, recon lines, bank statement, ground truth
src/barabar/generator   merchant profiles + fault plan → a believable month with every exception type injected
src/barabar/adapters    bank CSV/XLSX per layout · ledger CSV · Razorpay JSON · Razorpay API + seed
src/barabar/exports     journal vouchers · Tally XML · controller memo
src/barabar/agent       tool belt · investigator · ask-the-books · NumberGuard
src/barabar/evals       datasets · scorer · reports
src/barabar/api         SQLAlchemy store · FastAPI · webhook verification
tests/                  unit · property (hypothesis) · golden · idempotency · agent (fake client)
docs/                   ARCHITECTURE · DATA-MODEL · EXCEPTIONS · SIMULATED-VS-REAL · DECISIONS · FAILURES · PRIVACY · PITCH
evals/reports           committed, regenerable
web/                    Next.js Close Pack UI
```

## What broke

`docs/FAILURES.md` — seven real entries, in the shape *what we saw · what we believed · what was true · what changed*. The one we read first: ground truth called a correct RTGS match wrong because the truth came from a flag, not from data.

## Tax facts we get right (verified Sept 2026)

GST on gateway fees is 18% **on the fee**, claimable as ITC against Razorpay's monthly tax invoice. Section 194-O TDS is **0.1%** (since 1 Oct 2024) and is deducted by **marketplaces**, not payment gateways. GST TCS is **0.5%** (since 10 July 2024), collected by marketplaces. A D2C merchant on Razorpay sees neither on their settlement.

## License

MIT.
