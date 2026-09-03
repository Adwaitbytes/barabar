# Data model

All amounts are `int` paise. All timestamps are timezone-aware and stored in UTC; calendar days are decided in `Asia/Kolkata`. IDs are Razorpay's where they exist. Models are frozen pydantic classes in `barabar/core/models.py`.

| Model | Key fields |
|---|---|
| `RzPayment` | `payment_id, order_id, order_receipt, amount, fee, tax, method, card_network, card_type, international, captured_at, created_at, status` |
| `RzRefund` | `refund_id, payment_id, amount, created_at, processed_at, status, speed` |
| `RzDispute` | `dispute_id, payment_id, amount, phase, status, respond_by, created_at, resolved_at` |
| `RzAdjustment` | `adjustment_id, amount (signed), reason, created_at, settlement_id` |
| `RzSettlement` | `settlement_id, amount (net), fees, tax, utr, status, type (standard/instant/partial), mode, created_at, settled_at, continuation_of, retry_of` |
| `RzReconLine` | the `/settlements/recon` item: `entity_id, type (payment/refund/transfer/adjustment), settlement_id, debit, credit, amount, fee, tax, on_hold, settled, created_at, settled_at, posted_at, settlement_utr, order_id, order_receipt, payment_id, dispute_id, method, card_network, card_type, description`, `credit` is already net of fee and tax |
| `BankTxn` | `bank_txn_id, bank, value_date, posted_date, narration_raw, narration (parsed), credit, debit, balance_after, source_file, row_no` |
| `NarrationParsed` | `mode, utr_full, utr_prefix, counterparty, remarks, settlement_id_hint, razorpay_like, parser` |
| `LedgerEntry` | `ledger_id, invoice_no, customer_ref, order_receipt, payment_ref, date, gross, gst_component, status, source, notes`, credit notes are negative `gross` with `payment_ref = rfnd_…` |
| `MatchLink` | `link_id, run_id, from_entity, to_entity, tier, rule_id, confidence, amount_matched, residual` |
| `ExceptionItem` | `exc_id, run_id, type, subtype, secondary_tags, amount, entities[], confidence, reason_code, reason_text, suggested_action, status, evidence[], candidate_link, resolved_by, resolved_at, resolution_note` |
| `Run` | `run_id, inputs_hash, config_hash, code_version, outputs_hash, as_of, started_at, finished_at, stage, metrics` |
| `AuditEvent` | `event_id, run_id, actor, action, target, rule_or_evidence, ts, prev_hash, hash`, hash-chained, append-only |

Entity references are `kind:id` strings: `payment:pay_…`, `settlement:setl_…`, `recon_line:pay_…`, `bank:bank_00012`, `ledger:led_00042`, `refund:rfnd_…`, `dispute:disp_…`.

## Ledger CSV schema

`ledger_id,invoice_no,customer_ref,order_receipt,payment_ref,date,gross,gst_component,status,source,notes`, `date` ISO, `gross` rupees with two decimals, `status` in `open|paid|partial|cancelled`. Required: `invoice_no, date, gross`.

## Bank statement layouts (auto-detected by header)

| Bank | Header | Dates |
|---|---|---|
| HDFC | `Date, Narration, Chq./Ref.No., Value Dt, Withdrawal Amt., Deposit Amt., Closing Balance` | `dd/mm/yy` |
| ICICI | `S No., Value Date, Transaction Date, Cheque Number, Transaction Remarks, Withdrawal Amount (INR ), Deposit Amount (INR ), Balance (INR )` | `dd/mm/yyyy` |
| SBI | `Txn Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance` | `dd Mon yyyy` |
| Axis | `Tran Date, CHQNO, PARTICULARS, DR, CR, BAL, SOL` | `dd-mm-yyyy` |
| Kotak | `Sl. No., Date, Description, Chq / Ref number, Amount, Dr / Cr, Balance` | `dd/mm/yyyy` |

Narration grammar and truncation behaviour: `barabar/core/narration.py`.
