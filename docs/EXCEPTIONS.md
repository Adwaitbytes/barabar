# Exception taxonomy

Rendered from `barabar.core.exceptions`, do not edit by hand (`make docs` regenerates; a test asserts sync).

Every unmatched or partially matched item gets exactly one primary type. Secondary tags are allowed. **Unexplained** is not a type: it is the sum of open exceptions with confidence below the threshold.

| Type | Meaning | Detection rule | Default suggested action | Auto | v1 |
|---|---|---|---|---|---|
| `TIMING_NOT_YET_SETTLED` | Payment captured, settlement not yet due (T+2 working days not elapsed) | `captured_at + cycle(calendar) > as_of` | Wait; show expected settlement date |  | yes |
| `TIMING_BANK_LAG` | Settlement processed by Razorpay, bank credit not yet visible (<= 1 working day) | `settlement.processed` exists, no bank credit within lag window | Wait; re-check next statement |  | yes |
| `TIMING_HOLIDAY_SHIFT` | Expected date fell on weekend/RBI holiday; landed next working day | Calendar-aware re-date resolves it | Auto-resolve with note | yes | yes |
| `FEE_VARIANCE` | Fee != rate card x amount beyond rounding | `abs(fee - expected_fee) > 1 paise` | Verify rate card; raise with Razorpay if persistent |  | yes |
| `TAX_VARIANCE` | Tax != 18% x fee beyond rounding | `abs(tax - round(fee x 0.18)) > 1 paise` | Verify GST invoice |  | yes |
| `ROUNDING` | Sub-rupee residual after netting | `0 < abs(residual) <= tolerance_paise` | Accept as rounding; post to rounding ledger | yes | yes |
| `REFUND_NETTED` | A refund reduced this batch; ledger still shows the sale as fully paid | Refund line in batch with no ledger credit note | Post credit note / journal |  | yes |
| `REFUND_PENDING_NET` | Refund processed but not yet netted in any batch | Refund exists; no recon line | Wait; expect debit in next batch |  | yes |
| `DISPUTE_DEBIT` | Chargeback debited inside a batch | Recon line with `dispute_id`, debit | Surface dispute with evidence; hand off |  | yes |
| `DISPUTE_REVERSAL` | Dispute won; amount re-credited | Credit line with `dispute_id` | Post reversal |  | yes |
| `ADJUSTMENT` | Razorpay manual adjustment | `type == adjustment` | Verify with Razorpay support note |  | yes |
| `ON_HOLD` | Line marked `on_hold` | `on_hold == true` | Explain; expect later batch |  | yes |
| `PARTIAL_SETTLEMENT` | Batch settled less than settleable due to balance constraints | `settlement.type == partial` or residual equals a later batch | Link to continuation batch |  | yes |
| `INSTANT_SETTLEMENT_FEE` | Extra fee line for instant settlement | Fee line without payment | Post to bank charges |  | yes |
| `MULTI_UTR_SPLIT` | One settlement arrived as two or more bank credits | Bounded subset-sum over same-day credits equals batch net | Link both; note | yes | yes |
| `MISSING_BANK_CREDIT` | Settlement processed > lag window, no bank credit found | Window exceeded | Raise with bank/Razorpay; draft ticket |  | yes |
| `UNKNOWN_BANK_CREDIT` | Bank credit with Razorpay-like narration and no matching settlement | Narration parser tags source = razorpay, no batch | Investigate (tier D) |  | yes |
| `DUPLICATE_BANK_CREDIT` | Same UTR credited twice | UTR seen twice | Flag for bank reversal |  | yes |
| `NARRATION_TRUNCATED_UTR` | UTR cut by bank export; matched by prefix + amount + date | Prefix match >= 10 chars + exact amount + window | Accept with confidence; note |  | yes |
| `SETTLEMENT_FAILED_RETURNED` | Bank rejected settlement; re-credited later | Settlement status failed then reprocessed | Link retry; note |  | yes |
| `ORPHAN_LEDGER_ENTRY` | Ledger invoice with no Razorpay payment (COD? other gateway? manual?) | No payment by receipt/amount/date | Ask user; tag channel |  | yes |
| `AMOUNT_MISMATCH_LEDGER` | Payment and invoice differ (discount, shipping, partial) | Payment != invoice gross | Suggest partial-payment entry |  | yes |
| `DUPLICATE_LEDGER_ENTRY` | Same invoice twice | Duplicate invoice_no/amount/date | Merge |  | yes |
| `INTL_FX` | International payment settled in INR with FX and markup | currency != INR | Explain FX line |  | stretch |
| `MARKETPLACE_TDS_TCS` | Marketplace settlement with 0.1% 194-O TDS and 0.5% GST TCS lines | Source = marketplace | Post TDS receivable / TCS credit |  | stretch |
