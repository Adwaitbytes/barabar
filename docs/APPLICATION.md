# Application form: draft answers

- **Track:** 04 · AI Finance Controller
- **Project name:** Barabar
- **What it solves:** A Razorpay payout is one bank credit hiding hundreds of orders, fees, GST, refunds and chargebacks. Barabar reconciles settlements, bank statement and sales ledger to the paise, explains every unmatched rupee with a typed exception, drafts the journal entries, and answers "why did this amount land?" with a proof tree, deterministic where money is decided, AI only on the tail. Match rates are computed against generator ground truth and regenerable by a judge with one command.
- **GitHub repo:** (public URL)
- **5-minute video:** (unlisted URL), script in `docs/PITCH.md`
- **What broke, and how you got out:** Our evals reported 99.983% precision at 6,000 orders, and the PRD says tiers A/B must be 100%. We believed the matcher had linked a bank credit to the wrong settlement by UTR. What was true: our own ground truth was wrong. The generator marked every "truncated narration" settlement as unlinkable, but HDFC's RTGS layout puts the UTR second, so a 50-character cut left it intact; a ₹10.2L batch matched correctly and the truth called it false. What changed: ground truth is now derived by parsing the narration exactly the way the matcher does, truth comes from data, never from a flag. Six more entries, same shape, in `docs/FAILURES.md`.
