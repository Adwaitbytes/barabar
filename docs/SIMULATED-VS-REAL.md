# Simulated vs real

Razorpay test mode gives real payments, orders, refunds, disputes and webhooks. It does **not** reliably generate settlements. Barabar therefore ships a Settlement Simulator that applies Razorpay's documented rules to real test-mode entities (or synthetic ones) and emits settlements, `/settlements/recon` lines and bank statements in each bank's export layout. When a live key with settlements is present, the adapter reads `/v1/settlements/recon` and the simulator is bypassed.

| Thing | In the demo | In production |
|---|---|---|
| Payments, orders, refunds, disputes | Synthetic (Razorpay-shaped, `IdGen`) or seeded into test mode via `make seed` | Live API + webhooks |
| Fee & GST on fee | Rate card per method (2% + 18% GST; UPI/RuPay debit 0%; intl 3%) | Razorpay's actual `fee`/`tax` on each payment |
| Settlement batching | One batch per settlement day; T+2 working days from capture; cut-off 23:59 IST; RBI 2026 holidays | Razorpay's cycle for the account |
| Refund / dispute netting | First batch after processing / opening; reversal on win | Same rule, Razorpay's timing |
| Partial / split / failed-and-retried / on-hold / instant / adjustments | Explicit directives in the fault plan | Real events |
| UTRs | Well-formed NEFT (16) / RTGS (22) / IMPS RRN (12) | Whatever the correspondent bank assigns; Razorpay's `settlement_utr` is sometimes not that |
| Bank statement | Rendered per bank layout (HDFC/ICICI/SBI/Axis/Kotak), optional truncation | The merchant's export (CSV/XLSX) |
| Sales ledger | Synthetic invoices + credit notes in the documented CSV schema | Tally Day Book / Zoho / CSV |
| Bank credit timing | Same day as processing; export ends the day before `as_of` | NEFT/RTGS/IMPS land within hours; `settlement.processed` fires on initiation |
| Negative settlement days | Carried forward | Carried forward |

Nothing else is simulated. Every simulated rule is a parameter in `SimulatorConfig` / `FaultPlan` and part of the dataset's `config.json`.
