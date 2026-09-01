# Month-end controller's memo — as of 2026-09-01

Gross captured through Razorpay: **₹10,85,294.03**. Explained to the paise: **₹10,04,438.83** (92.5499%). Still unexplained: **₹80,855.20**.

18 of 21 processed settlements are matched to a bank credit. Payment-gateway fees for the period total ₹8,159.97; GST on those fees, claimable as input tax credit against Razorpay's monthly tax invoice, totals **₹1,468.85** (GSTR-3B table 4A(5)).

Refunds netted inside settlements: ₹21,608.80. Chargebacks debited: ₹2,059.00.

The run produced 50 typed exceptions: 5 auto-resolved by rule, 45 open for review totalling ₹3,63,366.02.

## What still needs a human

- `REFUND_NETTED` x 10: ₹11,667.20
- `ORPHAN_LEDGER_ENTRY` x 9: ₹25,596.00
- `AMOUNT_MISMATCH_LEDGER` x 6: ₹844.00
- `FEE_VARIANCE` x 3: ₹14.00
- `ADJUSTMENT` x 2: ₹12,500.00
- `ON_HOLD` x 2: ₹2,664.12
- `DUPLICATE_LEDGER_ENTRY` x 2: ₹3,017.00
- `DUPLICATE_BANK_CREDIT` x 1: ₹30,870.95
- `NARRATION_TRUNCATED_UTR` x 1: ₹32,897.64
- `MISSING_BANK_CREDIT` x 1: ₹23,097.82
- `TIMING_BANK_LAG` x 1: ₹74,791.80
- `UNKNOWN_BANK_CREDIT` x 1: ₹12,345.67
- `INSTANT_SETTLEMENT_FEE` x 1: ₹8.31
- `DISPUTE_DEBIT` x 1: ₹2,059.00
- `DISPUTE_REVERSAL` x 1: ₹958.89
- `TAX_VARIANCE` x 1: ₹0.07
- `TIMING_NOT_YET_SETTLED` x 1: ₹1,28,071.55
- `REFUND_PENDING_NET` x 1: ₹1,962.00

_Every number above is taken from the run's structured metrics; nothing was estimated._
