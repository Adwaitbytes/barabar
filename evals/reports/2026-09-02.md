# Barabar evals — 2026-09-01 19:37 UTC

Regenerate: `make evals`. Every number below is computed against generator ground truth.

## 60-order month (seed 42, profile `d2c_fashion`)

- inputs_hash `43db6b753b72643a` · config_hash `86ceae355ed4176f` · code `51a3d465732c-dirty` · outputs_hash `5c614aeaf790454d`

| Metric | Value | Target | Met |
|---|---:|---|:--:|
| auto_match_rate_pct | 100.0 | >= 92.0 | ✅ |
| auto_match_precision_pct | 100.0 | >= 99.5 | ✅ |
| auto_links | 189 | | |
| truth_links | 189 | | |
| false_links | 0 | | |
| false_match_cost_paise_tiers_ab | 0 | == 0 | ✅ |
| precision_tier_A_pct | 100.0 | == 100.0 | ✅ |
| precision_tier_B_pct | 100.0 | == 100.0 | ✅ |
| precision_tier_C_pct | 100.0 | | |
| links_tier_A | 71 | | |
| links_tier_B | 118 | | |
| links_tier_C | 0 | | |
| recall_share_tier_A_pct | 37.57 | | |
| recall_share_tier_B_pct | 62.43 | | |
| recall_share_tier_C_pct | 0.0 | | |
| rupees_explained_pct | 74.3622 | | |
| unexplained_paise | 2728504 | | |
| unexplainable_by_design_paise | 2728504 | | |
| explainable_coverage_pct | 100.0 | >= 99.0 | ✅ |
| ledger_open_paise | 1050700 | | |
| gross_captured_paise | 10642496 | | |
| exception_classification_accuracy_pct | 100.0 | >= 95.0 | ✅ |
| truth_exceptions | 29 | | |
| exceptions_total | 25 | | |
| exceptions_open | 21 | | |
| exceptions_auto_resolved | 4 | | |
| v1_types_present | 22 | | |
| throughput_seconds | 0.005 | | |
| determinism_runs_identical | 3/3 | | |
| injection_state_changes | 0 | == 0 | ✅ |

### Exception classification by type

| Type | Correct | Injected |
|---|---:|---:|
| `ADJUSTMENT` | 2 | 2 |
| `AMOUNT_MISMATCH_LEDGER` | 1 | 1 |
| `DISPUTE_DEBIT` | 1 | 1 |
| `DUPLICATE_BANK_CREDIT` | 1 | 1 |
| `DUPLICATE_LEDGER_ENTRY` | 2 | 2 |
| `FEE_VARIANCE` | 1 | 1 |
| `INSTANT_SETTLEMENT_FEE` | 1 | 1 |
| `MISSING_BANK_CREDIT` | 1 | 1 |
| `MULTI_UTR_SPLIT` | 1 | 1 |
| `NARRATION_TRUNCATED_UTR` | 1 | 1 |
| `ON_HOLD` | 2 | 2 |
| `ORPHAN_LEDGER_ENTRY` | 1 | 1 |
| `REFUND_NETTED` | 1 | 1 |
| `REFUND_PENDING_NET` | 1 | 1 |
| `ROUNDING` | 1 | 1 |
| `SETTLEMENT_FAILED_RETURNED` | 1 | 1 |
| `TAX_VARIANCE` | 1 | 1 |
| `TIMING_BANK_LAG` | 1 | 1 |
| `TIMING_HOLIDAY_SHIFT` | 1 | 1 |
| `TIMING_NOT_YET_SETTLED` | 6 | 6 |
| `UNKNOWN_BANK_CREDIT` | 1 | 1 |

### Residual list — 21 open exception(s)

| Type | Amount | Reason |
|---|---:|---|
| `UNKNOWN_BANK_CREDIT` | ₹12,345.67 | Razorpay-like credit on 2026-08-11 matches no settlement |
| `ADJUSTMENT` | ₹10,000.00 | Razorpay adjustment: Manual credit: promo reimbursement |
| `TIMING_BANK_LAG` | ₹6,190.97 | processed 2026-09-01; bank credit expected by 2026-09-02 |
| `DISPUTE_DEBIT` | ₹6,174.00 | chargeback disp_XANEV6j4usg0Pd debited in batch |
| `TIMING_NOT_YET_SETTLED` | ₹6,131.47 | 6 payment(s) captured 2026-08-29..2026-08-31; settlement due 2026-09-02 |
| `ORPHAN_LEDGER_ENTRY` | ₹4,914.00 | invoice INV/26-27/00062 has no Razorpay payment (COD / other gateway / manual?) |
| `ADJUSTMENT` | ₹2,500.00 | Razorpay adjustment: Manual debit: excess settlement recovery |
| `DUPLICATE_LEDGER_ENTRY` | ₹2,200.00 | invoice INV/26-27/00049 appears twice |
| `REFUND_PENDING_NET` | ₹2,000.00 | refund processed 2026-09-01; not yet netted in a batch |
| `NARRATION_TRUNCATED_UTR` | ₹1,846.00 | UTR prefix HDFCN26223000 (13 chars) + exact amount + date within window |
| `REFUND_NETTED` | ₹1,777.00 | refund rfnd_w101tVl7ubWpHy netted in batch; ledger has no credit note |
| `ON_HOLD` | ₹1,568.00 | line held by Razorpay; expect a later batch |
| `DUPLICATE_LEDGER_ENTRY` | ₹1,567.00 | invoice INV/26-27/00019 appears twice |
| `ON_HOLD` | ₹1,028.00 | line held by Razorpay; expect a later batch |
| `PARTIAL_SETTLEMENT` | ₹979.00 | partial settlement; continuation batch not seen yet |
| `DUPLICATE_BANK_CREDIT` | ₹656.06 | UTR HDFCN26222000105 credited twice (rows 6 and 7) |
| `MISSING_BANK_CREDIT` | ₹589.75 | processed 2026-08-18, no bank credit by 2026-09-01 |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 170799 vs payment 165899 (diff -4900) |
| `FEE_VARIANCE` | ₹3.55 | fee 3199 vs rate-card 3554 (card @ 200 bps) |
| `INSTANT_SETTLEMENT_FEE` | ₹1.95 | Instant settlement fee |
| `TAX_VARIANCE` | ₹0.07 | tax 988 vs 18% of fee 981 |

## 600-order month (seed 42, profile `d2c_fashion`)

- inputs_hash `a42f293698d460df` · config_hash `86ceae355ed4176f` · code `51a3d465732c-dirty` · outputs_hash `5f96a2a4472ee267`

| Metric | Value | Target | Met |
|---|---:|---|:--:|
| auto_match_rate_pct | 99.94 | >= 92.0 | ✅ |
| auto_match_precision_pct | 100.0 | >= 99.5 | ✅ |
| auto_links | 1732 | | |
| truth_links | 1733 | | |
| false_links | 0 | | |
| false_match_cost_paise_tiers_ab | 0 | == 0 | ✅ |
| precision_tier_A_pct | 100.0 | == 100.0 | ✅ |
| precision_tier_B_pct | 100.0 | == 100.0 | ✅ |
| precision_tier_C_pct | 100.0 | | |
| links_tier_A | 611 | | |
| links_tier_B | 1121 | | |
| links_tier_C | 0 | | |
| recall_share_tier_A_pct | 35.26 | | |
| recall_share_tier_B_pct | 64.69 | | |
| recall_share_tier_C_pct | 0.0 | | |
| rupees_explained_pct | 92.5499 | | |
| unexplained_paise | 8085520 | | |
| unexplainable_by_design_paise | 8085520 | | |
| explainable_coverage_pct | 100.0 | >= 99.0 | ✅ |
| ledger_open_paise | 4112420 | | |
| gross_captured_paise | 108529403 | | |
| exception_classification_accuracy_pct | 100.0 | >= 95.0 | ✅ |
| truth_exceptions | 114 | | |
| exceptions_total | 50 | | |
| exceptions_open | 45 | | |
| exceptions_auto_resolved | 5 | | |
| v1_types_present | 23 | | |
| throughput_seconds | 0.034 | | |
| determinism_runs_identical | 3/3 | | |
| injection_state_changes | 0 | == 0 | ✅ |

### Exception classification by type

| Type | Correct | Injected |
|---|---:|---:|
| `ADJUSTMENT` | 2 | 2 |
| `AMOUNT_MISMATCH_LEDGER` | 6 | 6 |
| `DISPUTE_DEBIT` | 1 | 1 |
| `DISPUTE_REVERSAL` | 1 | 1 |
| `DUPLICATE_BANK_CREDIT` | 1 | 1 |
| `DUPLICATE_LEDGER_ENTRY` | 2 | 2 |
| `FEE_VARIANCE` | 3 | 3 |
| `INSTANT_SETTLEMENT_FEE` | 1 | 1 |
| `MISSING_BANK_CREDIT` | 1 | 1 |
| `MULTI_UTR_SPLIT` | 1 | 1 |
| `NARRATION_TRUNCATED_UTR` | 1 | 1 |
| `ON_HOLD` | 2 | 2 |
| `ORPHAN_LEDGER_ENTRY` | 9 | 9 |
| `PARTIAL_SETTLEMENT` | 1 | 1 |
| `REFUND_NETTED` | 10 | 10 |
| `REFUND_PENDING_NET` | 1 | 1 |
| `ROUNDING` | 1 | 1 |
| `SETTLEMENT_FAILED_RETURNED` | 1 | 1 |
| `TAX_VARIANCE` | 1 | 1 |
| `TIMING_BANK_LAG` | 1 | 1 |
| `TIMING_HOLIDAY_SHIFT` | 1 | 1 |
| `TIMING_NOT_YET_SETTLED` | 65 | 65 |
| `UNKNOWN_BANK_CREDIT` | 1 | 1 |

### Residual list — 45 open exception(s)

| Type | Amount | Reason |
|---|---:|---|
| `TIMING_NOT_YET_SETTLED` | ₹1,28,071.55 | 65 payment(s) captured 2026-08-29..2026-08-31; settlement due 2026-09-02 |
| `TIMING_BANK_LAG` | ₹74,791.80 | processed 2026-09-01; bank credit expected by 2026-09-02 |
| `NARRATION_TRUNCATED_UTR` | ₹32,897.64 | UTR prefix HDFCN26219000 (13 chars) + exact amount + date within window |
| `DUPLICATE_BANK_CREDIT` | ₹30,870.95 | UTR HDFCN26240000121 credited twice (rows 22 and 23) |
| `MISSING_BANK_CREDIT` | ₹23,097.82 | processed 2026-08-24, no bank credit by 2026-09-01 |
| `UNKNOWN_BANK_CREDIT` | ₹12,345.67 | Razorpay-like credit on 2026-08-11 matches no settlement |
| `ADJUSTMENT` | ₹10,000.00 | Razorpay adjustment: Manual credit: promo reimbursement |
| `ORPHAN_LEDGER_ENTRY` | ₹6,207.00 | invoice INV/26-27/00614 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,827.00 | invoice INV/26-27/00612 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,047.00 | invoice INV/26-27/00613 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹3,231.00 | refund rfnd_TUpbMe16CM14Go netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹2,598.00 | refund rfnd_YCYPLLFoofRuXR netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹2,560.00 | invoice INV/26-27/00610 has no Razorpay payment (COD / other gateway / manual?) |
| `ADJUSTMENT` | ₹2,500.00 | Razorpay adjustment: Manual debit: excess settlement recovery |
| `DUPLICATE_LEDGER_ENTRY` | ₹2,480.00 | invoice INV/26-27/00430 appears twice |
| `ORPHAN_LEDGER_ENTRY` | ₹2,269.00 | invoice INV/26-27/00611 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_DEBIT` | ₹2,059.00 | chargeback disp_d4VVo2ujnNyzVp debited in batch |
| `REFUND_PENDING_NET` | ₹1,962.00 | refund processed 2026-09-01; not yet netted in a batch |
| `REFUND_NETTED` | ₹1,915.00 | refund rfnd_3qVcAkfhyCpxdF netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,579.00 | invoice INV/26-27/00615 has no Razorpay payment (COD / other gateway / manual?) |
| `ON_HOLD` | ₹1,523.00 | line held by Razorpay; expect a later batch |
| `REFUND_NETTED` | ₹1,501.00 | refund rfnd_Levrbm6idTSGkp netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,222.00 | invoice INV/26-27/00618 has no Razorpay payment (COD / other gateway / manual?) |
| `ON_HOLD` | ₹1,141.12 | line held by Razorpay; expect a later batch |
| `DISPUTE_REVERSAL` | ₹958.89 | dispute disp_tRWfLJLoN1rYtu won; amount re-credited |
| `ORPHAN_LEDGER_ENTRY` | ₹946.00 | invoice INV/26-27/00616 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹939.00 | invoice INV/26-27/00617 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹559.20 | refund rfnd_WNI3lclM2WtA9P netted in batch; ledger has no credit note |
| `DUPLICATE_LEDGER_ENTRY` | ₹537.00 | invoice INV/26-27/00459 appears twice |
| `REFUND_NETTED` | ₹535.60 | refund rfnd_ons4dmdcgXN5Al netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹433.00 | refund rfnd_8X1Duo9QfnwNMt netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹394.00 | refund rfnd_mEF20ch0FIj1Fk netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹262.00 | refund rfnd_UbQzczegZorSa4 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹238.40 | refund rfnd_aNulJVZ8XFy2rt netted in batch; ledger has no credit note |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 131125 vs payment 116225 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 99800 vs payment 84900 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 316300 vs payment 301400 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 68900 vs payment 54000 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 215500 vs payment 200600 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 124800 vs payment 114900 (diff -9900) |
| `FEE_VARIANCE` | ₹10.29 | fee 9259 vs rate-card 10288 (card @ 200 bps) |
| `INSTANT_SETTLEMENT_FEE` | ₹8.31 | Instant settlement fee |
| `FEE_VARIANCE` | ₹2.19 | fee 1969 vs rate-card 2188 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.52 | fee 1370 vs rate-card 1522 (card @ 200 bps) |
| `TAX_VARIANCE` | ₹0.07 | tax 1402 vs 18% of fee 1395 |

## 6000-order month (seed 42, profile `d2c_fashion`)

- inputs_hash `79ff1c638a48e9a8` · config_hash `86ceae355ed4176f` · code `51a3d465732c-dirty` · outputs_hash `bd8bea1235b3f900`

| Metric | Value | Target | Met |
|---|---:|---|:--:|
| auto_match_rate_pct | 99.99 | >= 92.0 | ✅ |
| auto_match_precision_pct | 100.0 | >= 99.5 | ✅ |
| auto_links | 17301 | | |
| truth_links | 17302 | | |
| false_links | 0 | | |
| false_match_cost_paise_tiers_ab | 0 | == 0 | ✅ |
| precision_tier_A_pct | 100.0 | == 100.0 | ✅ |
| precision_tier_B_pct | 100.0 | == 100.0 | ✅ |
| precision_tier_C_pct | 100.0 | | |
| links_tier_A | 5958 | | |
| links_tier_B | 11343 | | |
| links_tier_C | 0 | | |
| recall_share_tier_A_pct | 34.44 | | |
| recall_share_tier_B_pct | 65.56 | | |
| recall_share_tier_C_pct | 0.0 | | |
| rupees_explained_pct | 97.0229 | | |
| unexplained_paise | 32431203 | | |
| unexplainable_by_design_paise | 32431203 | | |
| explainable_coverage_pct | 100.0 | >= 99.0 | ✅ |
| ledger_open_paise | 41956611 | | |
| gross_captured_paise | 1089346666 | | |
| exception_classification_accuracy_pct | 100.0 | >= 95.0 | ✅ |
| truth_exceptions | 876 | | |
| exceptions_total | 305 | | |
| exceptions_open | 300 | | |
| exceptions_auto_resolved | 5 | | |
| v1_types_present | 22 | | |
| throughput_seconds | 0.551 | | |
| determinism_runs_identical | 3/3 | | |
| injection_state_changes | 0 | == 0 | ✅ |

### Exception classification by type

| Type | Correct | Injected |
|---|---:|---:|
| `ADJUSTMENT` | 2 | 2 |
| `AMOUNT_MISMATCH_LEDGER` | 60 | 60 |
| `DISPUTE_DEBIT` | 12 | 12 |
| `DISPUTE_REVERSAL` | 12 | 12 |
| `DUPLICATE_BANK_CREDIT` | 1 | 1 |
| `DUPLICATE_LEDGER_ENTRY` | 2 | 2 |
| `FEE_VARIANCE` | 30 | 30 |
| `INSTANT_SETTLEMENT_FEE` | 1 | 1 |
| `MISSING_BANK_CREDIT` | 1 | 1 |
| `MULTI_UTR_SPLIT` | 1 | 1 |
| `ON_HOLD` | 2 | 2 |
| `ORPHAN_LEDGER_ENTRY` | 90 | 90 |
| `PARTIAL_SETTLEMENT` | 1 | 1 |
| `REFUND_NETTED` | 82 | 82 |
| `REFUND_PENDING_NET` | 1 | 1 |
| `ROUNDING` | 1 | 1 |
| `SETTLEMENT_FAILED_RETURNED` | 1 | 1 |
| `TAX_VARIANCE` | 1 | 1 |
| `TIMING_BANK_LAG` | 1 | 1 |
| `TIMING_HOLIDAY_SHIFT` | 1 | 1 |
| `TIMING_NOT_YET_SETTLED` | 572 | 572 |
| `UNKNOWN_BANK_CREDIT` | 1 | 1 |

### Residual list — 300 open exception(s)

| Type | Amount | Reason |
|---|---:|---|
| `TIMING_NOT_YET_SETTLED` | ₹9,85,050.58 | 572 payment(s) captured 2026-08-29..2026-08-31; settlement due 2026-09-02 |
| `TIMING_BANK_LAG` | ₹3,72,524.99 | processed 2026-09-01; bank credit expected by 2026-09-02 |
| `DUPLICATE_BANK_CREDIT` | ₹3,61,869.35 | UTR HDFCRC2026082000000115 credited twice (rows 16 and 17) |
| `MISSING_BANK_CREDIT` | ₹2,99,363.38 | processed 2026-08-07, no bank credit by 2026-09-01 |
| `UNKNOWN_BANK_CREDIT` | ₹12,345.67 | Razorpay-like credit on 2026-08-11 matches no settlement |
| `ADJUSTMENT` | ₹10,000.00 | Razorpay adjustment: Manual credit: promo reimbursement |
| `ORPHAN_LEDGER_ENTRY` | ₹6,221.00 | invoice INV/26-27/06154 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹6,191.00 | invoice INV/26-27/06108 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹6,188.00 | invoice INV/26-27/06182 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹6,057.00 | invoice INV/26-27/06125 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹6,026.00 | invoice INV/26-27/06121 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹6,005.00 | invoice INV/26-27/06116 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,986.00 | invoice INV/26-27/06184 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,803.00 | invoice INV/26-27/06126 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_DEBIT` | ₹5,790.00 | chargeback disp_iCEpdqVbyJusRz debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹5,759.00 | invoice INV/26-27/06129 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,733.00 | invoice INV/26-27/06186 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,729.00 | invoice INV/26-27/06147 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,602.00 | invoice INV/26-27/06164 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,588.00 | invoice INV/26-27/06107 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,585.00 | invoice INV/26-27/06115 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,482.00 | invoice INV/26-27/06146 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,479.00 | invoice INV/26-27/06142 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,442.00 | invoice INV/26-27/06178 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,420.00 | invoice INV/26-27/06139 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,194.00 | invoice INV/26-27/06169 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,158.00 | invoice INV/26-27/06127 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,144.00 | invoice INV/26-27/06105 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,143.00 | invoice INV/26-27/06176 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹5,051.00 | invoice INV/26-27/06153 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹4,932.00 | refund rfnd_L1FUNBmUvGGjQn netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹4,902.00 | invoice INV/26-27/06124 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,786.00 | invoice INV/26-27/06133 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,775.00 | invoice INV/26-27/06134 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹4,748.00 | refund rfnd_E40NYI2nuDnOBg netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹4,715.00 | invoice INV/26-27/06128 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,597.00 | invoice INV/26-27/06137 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,447.00 | invoice INV/26-27/06155 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,438.00 | invoice INV/26-27/06157 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_REVERSAL` | ₹4,415.00 | dispute disp_ErUy7IY7VTutVC won; amount re-credited |
| `ORPHAN_LEDGER_ENTRY` | ₹4,371.00 | invoice INV/26-27/06109 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,336.00 | invoice INV/26-27/06138 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,278.00 | invoice INV/26-27/06119 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,197.00 | invoice INV/26-27/06100 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,174.00 | no key match; candidate payment pay_XWqRBwEAGgdZUC within tolerance |
| `ORPHAN_LEDGER_ENTRY` | ₹4,174.00 | invoice INV/26-27/06189 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹4,100.00 | invoice INV/26-27/06122 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹4,079.00 | refund rfnd_ekVlmGSSWS2GRM netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹3,995.00 | invoice INV/26-27/06113 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹3,959.00 | invoice INV/26-27/06135 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹3,906.00 | invoice INV/26-27/06159 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹3,900.00 | invoice INV/26-27/06101 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_DEBIT` | ₹3,844.00 | chargeback disp_l5oUYeX65rlhJI debited in batch |
| `REFUND_NETTED` | ₹3,836.84 | refund rfnd_pZSAWk2LqMB0Le netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹3,828.00 | invoice INV/26-27/06150 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_DEBIT` | ₹3,785.00 | chargeback disp_v1qxjqdAccWk7p debited in batch |
| `REFUND_NETTED` | ₹3,636.00 | refund rfnd_t2U6UIOZgfPjwY netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹3,575.00 | invoice INV/26-27/06145 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹3,498.26 | refund rfnd_drG8OXsaNSshSn netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹3,488.00 | invoice INV/26-27/06171 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹3,483.00 | invoice INV/26-27/06163 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_REVERSAL` | ₹3,360.00 | dispute disp_eyqnda6iu4Xphj won; amount re-credited |
| `REFUND_NETTED` | ₹3,360.00 | refund rfnd_Du3gwmc2Jv0RuK netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹3,324.00 | invoice INV/26-27/06149 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹3,229.00 | invoice INV/26-27/06181 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_REVERSAL` | ₹3,187.15 | dispute disp_b3E3uiwohg7ZIb won; amount re-credited |
| `ORPHAN_LEDGER_ENTRY` | ₹3,175.00 | invoice INV/26-27/06143 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹3,128.00 | refund rfnd_rAOzk8gdTfvBEK netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹3,088.00 | invoice INV/26-27/06187 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹3,040.00 | invoice INV/26-27/06161 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹2,906.00 | no key match; candidate payment pay_DaWctEzVsuGVVa within tolerance |
| `REFUND_NETTED` | ₹2,880.00 | refund rfnd_YzEuKIlDOZBbfd netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹2,856.00 | no key match; candidate payment pay_gUVhGcoOLZkGIL within tolerance |
| `REFUND_NETTED` | ₹2,798.00 | refund rfnd_rMe7hNOWn5Dt2q netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹2,754.00 | refund rfnd_J3wd7yhzU4QTtQ netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹2,741.00 | invoice INV/26-27/06120 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹2,690.00 | no key match; candidate payment pay_gNSjq2xzlf9Lxy within tolerance |
| `DISPUTE_REVERSAL` | ₹2,664.17 | dispute disp_PxtUwnpcoRajjZ won; amount re-credited |
| `ORPHAN_LEDGER_ENTRY` | ₹2,615.00 | no key match; candidate payment pay_vZU5dSUmMyjqr1 within tolerance |
| `DISPUTE_DEBIT` | ₹2,590.00 | chargeback disp_3TyoA415QvPESl debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹2,530.00 | invoice INV/26-27/06166 has no Razorpay payment (COD / other gateway / manual?) |
| `ADJUSTMENT` | ₹2,500.00 | Razorpay adjustment: Manual debit: excess settlement recovery |
| `DISPUTE_REVERSAL` | ₹2,479.00 | dispute disp_4BHzeaz77q8dQZ won; amount re-credited |
| `ORPHAN_LEDGER_ENTRY` | ₹2,473.00 | invoice INV/26-27/06106 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹2,462.00 | refund rfnd_hTAIU6wML9XBhu netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹2,425.00 | refund rfnd_cV6Fhf0sO8bSiC netted in batch; ledger has no credit note |
| `DISPUTE_DEBIT` | ₹2,386.00 | chargeback disp_clATtHbKrpNJqQ debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹2,344.00 | no key match; candidate payment pay_nFqoweRkhagNZf within tolerance |
| `REFUND_NETTED` | ₹2,296.00 | refund rfnd_G4l7agTycXa5xb netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹2,252.00 | invoice INV/26-27/06112 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_REVERSAL` | ₹2,209.48 | dispute disp_8VZavqO6BBOGbb won; amount re-credited |
| `DISPUTE_REVERSAL` | ₹2,208.00 | dispute disp_OP5fIk6OaYkxPO won; amount re-credited |
| `ORPHAN_LEDGER_ENTRY` | ₹2,152.00 | invoice INV/26-27/06104 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹2,123.00 | invoice INV/26-27/06136 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹2,117.00 | no key match; candidate payment pay_zAH51f7wJ0NPiy within tolerance |
| `ORPHAN_LEDGER_ENTRY` | ₹2,105.00 | no key match; candidate payment pay_14mGgKewaSKFeM within tolerance |
| `ON_HOLD` | ₹2,101.00 | line held by Razorpay; expect a later batch |
| `ORPHAN_LEDGER_ENTRY` | ₹2,099.00 | no key match; candidate payment pay_KzpCX8KMYy3eNE within tolerance |
| `ORPHAN_LEDGER_ENTRY` | ₹2,052.00 | no key match; candidate payment pay_CqXLMkibU1GcKu within tolerance |
| `DISPUTE_DEBIT` | ₹1,979.00 | chargeback disp_5uw1gcbnJfW2N9 debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹1,974.00 | invoice INV/26-27/06151 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹1,915.00 | invoice INV/26-27/06140 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹1,911.00 | refund rfnd_PuS236RSssFqbS netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,900.00 | refund rfnd_KYskjFhTLCAvoh netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,895.00 | refund rfnd_nJbXOKbQSYJ1iq netted in batch; ledger has no credit note |
| `DISPUTE_DEBIT` | ₹1,888.00 | chargeback disp_0IWZDOhoQihnqK debited in batch |
| `REFUND_NETTED` | ₹1,885.00 | refund rfnd_6tkGOh74r6N3e6 netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,878.00 | invoice INV/26-27/06117 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹1,873.60 | refund rfnd_lPnLGgfj2kLk2h netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,819.00 | refund rfnd_whK8BLziTokeYm netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,790.00 | no key match; candidate payment pay_JGp8d9WQccChLN within tolerance |
| `REFUND_NETTED` | ₹1,789.00 | refund rfnd_QZV83xZ7QToxkJ netted in batch; ledger has no credit note |
| `DISPUTE_DEBIT` | ₹1,773.00 | chargeback disp_8xw1w1CP3LlPUF debited in batch |
| `DISPUTE_DEBIT` | ₹1,759.00 | chargeback disp_f1qsXVPcyRgFEY debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹1,739.00 | invoice INV/26-27/06123 has no Razorpay payment (COD / other gateway / manual?) |
| `DUPLICATE_LEDGER_ENTRY` | ₹1,639.00 | invoice INV/26-27/05302 appears twice |
| `ORPHAN_LEDGER_ENTRY` | ₹1,631.00 | invoice INV/26-27/06130 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹1,629.00 | invoice INV/26-27/06132 has no Razorpay payment (COD / other gateway / manual?) |
| `DUPLICATE_LEDGER_ENTRY` | ₹1,591.00 | invoice INV/26-27/05526 appears twice |
| `REFUND_NETTED` | ₹1,486.00 | refund rfnd_7ESMXwAG5D0KEm netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,424.00 | refund rfnd_r9yRDLajYU8Cjr netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,401.00 | refund rfnd_yKJHQPzZuXdqy8 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,395.20 | refund rfnd_swDuG32mVJodSH netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,389.60 | refund rfnd_BJkLUjDw8ko5U9 netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,347.00 | no key match; candidate payment pay_16mRz2c91b6wp7 within tolerance |
| `ORPHAN_LEDGER_ENTRY` | ₹1,334.00 | invoice INV/26-27/06180 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹1,314.00 | no key match; candidate payment pay_e9PtsrTsN0n3wt within tolerance |
| `REFUND_NETTED` | ₹1,279.60 | refund rfnd_a0L8zYb5JjGkMf netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,259.00 | refund rfnd_Ki4jhxymIJi4Gi netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,254.25 | refund rfnd_yWpQtXT5h6RGz9 netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,253.00 | invoice INV/26-27/06167 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹1,210.40 | refund rfnd_WbH7pQa1dPuOCY netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,206.00 | refund rfnd_L3xhULY79hCdI6 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,195.00 | refund rfnd_JSp98kCU4XJHhs netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,189.00 | refund rfnd_iIpmEsRoPS7XHs netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,170.00 | refund rfnd_D054Cgerx8hwf0 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,166.49 | refund rfnd_hHelxiuQ1YwSVo netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,164.00 | refund rfnd_aRUg0d0dCYloUf netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,160.00 | no key match; candidate payment pay_Z4QERRHPMiva7H within tolerance |
| `ORPHAN_LEDGER_ENTRY` | ₹1,141.00 | no key match; candidate payment pay_6DJOTY9qM0BwWQ within tolerance |
| `REFUND_NETTED` | ₹1,131.00 | refund rfnd_OwO3S0QV1E9u4E netted in batch; ledger has no credit note |
| `DISPUTE_DEBIT` | ₹1,128.00 | chargeback disp_S6V4eN3gdLqX1s debited in batch |
| `REFUND_NETTED` | ₹1,122.40 | refund rfnd_Kvgd9dyNsj7dBq netted in batch; ledger has no credit note |
| `REFUND_PENDING_NET` | ₹1,118.00 | refund processed 2026-09-01; not yet netted in a batch |
| `DISPUTE_REVERSAL` | ₹1,097.00 | dispute disp_x9uwK1M2by4kDj won; amount re-credited |
| `REFUND_NETTED` | ₹1,067.00 | refund rfnd_OFWf3bA0wZiH9p netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹1,053.00 | refund rfnd_q1vLdDFVmA8xax netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹1,012.00 | invoice INV/26-27/06177 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹1,009.00 | invoice INV/26-27/06173 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹1,008.00 | refund rfnd_cWM268qc2QNz5E netted in batch; ledger has no credit note |
| `DISPUTE_REVERSAL` | ₹987.00 | dispute disp_ykIxd3WRc2Vk3X won; amount re-credited |
| `REFUND_NETTED` | ₹964.00 | refund rfnd_GFBtxvn22NkYYp netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹960.00 | refund rfnd_NQGhtVACsZgIOX netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹952.00 | invoice INV/26-27/06118 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹943.20 | refund rfnd_VvNQkqJuAJPhBV netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹919.60 | refund rfnd_jKa3lpA9YZHlsM netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹904.00 | refund rfnd_RoIZmnQWf7P4tS netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹865.00 | refund rfnd_34oTyNsByNDsuG netted in batch; ledger has no credit note |
| `DISPUTE_REVERSAL` | ₹844.00 | dispute disp_fIj9tS4sPB9cma won; amount re-credited |
| `REFUND_NETTED` | ₹832.80 | refund rfnd_QnOkPob3GXTK1E netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹825.00 | refund rfnd_ZRtaL4lXIya9kM netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹824.80 | refund rfnd_ZEUGnQfgL2UDqc netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹806.80 | refund rfnd_WgiZaSKND3a5r5 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹801.00 | refund rfnd_Ij1QW0AoTwaoM5 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹790.40 | refund rfnd_VFglbD0tA8Un7P netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹789.20 | refund rfnd_LmPHaYDXgrirw2 netted in batch; ledger has no credit note |
| `ON_HOLD` | ₹768.00 | line held by Razorpay; expect a later batch |
| `REFUND_NETTED` | ₹745.00 | refund rfnd_Xbo4MIJZWFUDnY netted in batch; ledger has no credit note |
| `DISPUTE_REVERSAL` | ₹743.00 | dispute disp_EvIkLlEDKkgolZ won; amount re-credited |
| `REFUND_NETTED` | ₹742.80 | refund rfnd_oIZTa9ZMK00uM6 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹716.00 | refund rfnd_AogAjdUF6Uf5Zx netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹664.80 | refund rfnd_rZEaJza6YJtRgg netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹651.20 | refund rfnd_Exlgd8s20lflP7 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹640.00 | refund rfnd_pz1ngdiBRotmAl netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹639.60 | refund rfnd_5OQvh6YJmAiP6J netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹637.20 | refund rfnd_xbQizMHT9PDCT6 netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹630.00 | invoice INV/26-27/06160 has no Razorpay payment (COD / other gateway / manual?) |
| `DISPUTE_REVERSAL` | ₹625.00 | dispute disp_KtdBUT9nQvgpam won; amount re-credited |
| `REFUND_NETTED` | ₹621.60 | refund rfnd_CgR3JOwa1kHCn1 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹620.80 | refund rfnd_5Qks7M9KB7c3w4 netted in batch; ledger has no credit note |
| `DISPUTE_DEBIT` | ₹615.00 | chargeback disp_jnCDvcAylPUSrk debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹606.00 | invoice INV/26-27/06165 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹566.00 | refund rfnd_u6pUOWIluTSg67 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹556.80 | refund rfnd_DFjzMJ1XSrJOdY netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹549.60 | refund rfnd_A95nWcSf4FQWKn netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹535.60 | refund rfnd_59DQrLNMoEwNxH netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹526.40 | refund rfnd_hzua1IhoFfHjiz netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹520.40 | refund rfnd_uVAEVH8AHkD3tK netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹519.20 | refund rfnd_2d1lzRCnzg2iyF netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹514.40 | refund rfnd_Xo2vkjH1LkNAe3 netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹492.40 | refund rfnd_uvIL92eIwqFpro netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹470.40 | refund rfnd_GVia6jPsqrhJva netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹462.00 | refund rfnd_bc48tmSfx87G8j netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹415.00 | refund rfnd_FGeuEZF08SXYWv netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹413.00 | invoice INV/26-27/06114 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹402.80 | refund rfnd_g369EbmhmV73kU netted in batch; ledger has no credit note |
| `REFUND_NETTED` | ₹379.28 | refund rfnd_cjIwStm6fP6v9C netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹362.00 | invoice INV/26-27/06141 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹360.00 | refund rfnd_2s7U0nyNgEL2gS netted in batch; ledger has no credit note |
| `DISPUTE_DEBIT` | ₹332.00 | chargeback disp_3z5IjNjvQXyoko debited in batch |
| `ORPHAN_LEDGER_ENTRY` | ₹323.00 | no key match; candidate payment pay_ZxxtIhR3AIrPNZ within tolerance |
| `REFUND_NETTED` | ₹318.99 | refund rfnd_EtYBHvTEnQrZ6K netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹298.00 | invoice INV/26-27/06183 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹279.60 | refund rfnd_W3feTwUtJPpmW3 netted in batch; ledger has no credit note |
| `ORPHAN_LEDGER_ENTRY` | ₹259.00 | invoice INV/26-27/06152 has no Razorpay payment (COD / other gateway / manual?) |
| `ORPHAN_LEDGER_ENTRY` | ₹210.00 | invoice INV/26-27/06175 has no Razorpay payment (COD / other gateway / manual?) |
| `REFUND_NETTED` | ₹200.80 | refund rfnd_VgXxzXtOq9e6UZ netted in batch; ledger has no credit note |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 53300 vs payment 38400 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 251600 vs payment 236700 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 86900 vs payment 72000 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 205000 vs payment 190100 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 78800 vs payment 63900 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 140068 vs payment 125168 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 125700 vs payment 110800 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 409600 vs payment 394700 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 171400 vs payment 156500 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 315300 vs payment 300400 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 262500 vs payment 247600 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 147600 vs payment 132700 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 263900 vs payment 249000 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 197556 vs payment 182656 (diff -14900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹149.00 | invoice 93200 vs payment 78300 (diff -14900) |
| `ORPHAN_LEDGER_ENTRY` | ₹145.00 | invoice INV/26-27/06102 has no Razorpay payment (COD / other gateway / manual?) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 220600 vs payment 210700 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 97500 vs payment 87600 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 272900 vs payment 263000 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 109200 vs payment 99300 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 157300 vs payment 147400 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 181800 vs payment 171900 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 253725 vs payment 243825 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 313000 vs payment 303100 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 121174 vs payment 111274 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 68152 vs payment 58252 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 172300 vs payment 162400 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 258755 vs payment 248855 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 117400 vs payment 107500 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 91400 vs payment 81500 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 103100 vs payment 93200 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹99.00 | invoice 159900 vs payment 150000 (diff -9900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 159500 vs payment 154600 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 206700 vs payment 201800 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 108100 vs payment 103200 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 120890 vs payment 115990 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 264900 vs payment 260000 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 273600 vs payment 268700 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 180600 vs payment 175700 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 406300 vs payment 401400 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 314110 vs payment 309210 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 310100 vs payment 305200 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 121300 vs payment 116400 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 145100 vs payment 140200 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 92800 vs payment 87900 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 208800 vs payment 203900 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 43000 vs payment 38100 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 218300 vs payment 213400 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 282200 vs payment 277300 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 88000 vs payment 83100 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 126100 vs payment 121200 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 89400 vs payment 84500 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 178400 vs payment 173500 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 142900 vs payment 138000 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 146300 vs payment 141400 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 138552 vs payment 133652 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 80100 vs payment 75200 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 495700 vs payment 490800 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 158700 vs payment 153800 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 146100 vs payment 141200 (diff -4900) |
| `AMOUNT_MISMATCH_LEDGER` | ₹49.00 | invoice 231948 vs payment 227048 (diff -4900) |
| `FEE_VARIANCE` | ₹13.92 | fee 12524 vs rate-card 13916 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹6.97 | fee 6277 vs rate-card 6974 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹5.87 | fee 5279 vs rate-card 5866 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹5.55 | fee 4991 vs rate-card 5546 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹5.36 | fee 4826 vs rate-card 5362 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹5.21 | fee 4685 vs rate-card 5206 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹4.43 | fee 3983 vs rate-card 4426 (card @ 200 bps) |
| `INSTANT_SETTLEMENT_FEE` | ₹4.12 | Instant settlement fee |
| `FEE_VARIANCE` | ₹4.03 | fee 3631 vs rate-card 4034 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹3.64 | fee 3276 vs rate-card 3640 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹3.54 | fee 3188 vs rate-card 3542 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹3.48 | fee 3134 vs rate-card 3482 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹3.38 | fee 3042 vs rate-card 3380 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹3.38 | fee 3044 vs rate-card 3382 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹3.21 | fee 2889 vs rate-card 3210 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.73 | fee 2461 vs rate-card 2734 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.69 | fee 2423 vs rate-card 2692 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.53 | fee 2277 vs rate-card 2530 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.38 | fee 2140 vs rate-card 2378 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.27 | fee 2038 vs rate-card 2265 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.07 | fee 1867 vs rate-card 2074 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹2.04 | fee 1831 vs rate-card 2035 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.94 | fee 1750 vs rate-card 1944 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.80 | fee 1616 vs rate-card 1796 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.74 | fee 1564 vs rate-card 1738 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.60 | fee 1440 vs rate-card 1600 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.56 | fee 1412 vs rate-card 1568 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.48 | fee 1334 vs rate-card 1482 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.43 | fee 1287 vs rate-card 1430 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.43 | fee 1285 vs rate-card 1428 (card @ 200 bps) |
| `FEE_VARIANCE` | ₹1.25 | fee 1121 vs rate-card 1246 (card @ 200 bps) |
| `TAX_VARIANCE` | ₹0.07 | tax 489 vs 18% of fee 482 |
