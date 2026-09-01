# FAILURES.md — what broke, and how we got out

Fixed shape per entry: **what we saw · what we believed · what was true · what changed.**
Only real entries. Nothing here was invented for the video.

## 1. Ground truth called a correct match wrong (RTGS survives a 50-char cut)
- **Saw:** evals at 6,000 orders reported tier-A precision 99.983% and a false-match cost of ₹3,68,233 — the PRD says tiers A/B must be ₹0.
- **Believed:** the matcher had linked a bank credit to the wrong settlement by UTR.
- **True:** the generator flagged every settlement with a *truncation directive* as "no bank link" in ground truth. HDFC's NEFT layout puts the UTR last (so 50 characters kill it), but its RTGS layout puts the UTR second — a ₹10.2L batch went RTGS, kept its UTR, and tier A matched it correctly. The match was right; the truth was wrong.
- **Changed:** the simulator now decides the truth link by parsing the narration exactly as the matcher does. Ground truth is derived from data, never from a flag.

## 2. A settlement day where refunds exceeded sales
- **Saw:** the Tally XML test failed with a voucher off by −₹782; a journal line for the bank ledger carried a negative debit.
- **Believed:** a sign-convention bug in the XML writer (Tally's "debits are negative" rule).
- **True:** on a 40-order month one settlement day netted below zero (two refunds, one small sale). The simulator emitted a negative "settlement". Razorpay never does that — it carries a negative balance forward to the next settlement.
- **Changed:** non-positive days are carried forward; leftovers at month-end become `REFUND_PENDING_NET` / `TIMING_NOT_YET_SETTLED` truths. Journal lines now reject negative or two-sided amounts at construction.

## 3. Injected a tax variance on a payment that had no recon line yet
- **Saw:** exception-classification accuracy 96.55% on the 60-order set; one `TAX_VARIANCE` truth with no exception.
- **Believed:** the B2 decomposition had missed a 7-paise difference.
- **True:** the payment was captured in the last two days of the month, so it had no settlement line to decompose. Nothing to check, nothing flagged.
- **Changed:** the generator only injects fee/tax variances on payments that settle inside the month.

## 4. Bank row IDs drifted through a CSV round-trip
- **Saw:** `outputs_hash` changed after writing the statement in HDFC layout and reading it back — determinism, the one property we promised.
- **Believed:** the per-bank parser lost information.
- **True:** the simulator numbered bank rows in the order it queued them; the statement is written sorted by value date. IDs shifted, links renamed, hash changed.
- **Changed:** rows are numbered in statement order and every ground-truth reference is remapped. A statement uploaded by a merchant now hashes identically to the synthetic one it came from.

## 5. "Unexplained" counted COD invoices against Razorpay's gross
- **Saw:** 81.7% of gross "explained" on the demo month, and 109 open exceptions — 65 of them one-per-payment "not yet settled".
- **Believed:** the matcher was leaving real money unexplained.
- **True:** orphan COD invoices and missing credit notes are ledger hygiene; they change what the books say, not how much Razorpay money is accounted for. And a queue that repeats the same fact 65 times is noise, not honesty.
- **Changed:** `unexplained` is money-flow only; ledger items are reported separately as `ledger_open`. Not-yet-due payments are one exception per due date ("65 payments captured 29–31 Aug, due 2 Sep"). Evals now also report *coverage of the explainable* next to the raw figure, because a month with an injected missing bank credit is honestly not 99% explained.

## 6. A partial settlement with nothing in it
- **Saw:** on the 60-order set a `PARTIAL_SETTLEMENT` was classified as `MISSING_BANK_CREDIT`.
- **Believed:** the B5 continuation rule fired late.
- **True:** the partial-settlement cap (60% of the day's net) was smaller than the day's first payment, so the "partial" batch settled ₹0 and its bank credit was ₹0 — which the matcher rightly cannot see.
- **Changed:** a partial batch always keeps at least one payment; Razorpay pays out what the balance allows, never nothing.

## 7. A patch that silently didn't apply
- **Saw:** after "fixing" the metrics, the demo printed the old numbers.
- **Believed:** the metric definition was still wrong.
- **True:** the patch script anchored on a source line that the formatter had since wrapped; the script aborted at the first anchor and nothing after it ran, but the error scrolled past.
- **Changed:** patch scripts assert every anchor before writing; we re-ran the suite and the CLI, not just the patch, before believing anything.

## 8. The narration fallback trusted a well-formed lie
- **Saw:** a test fed the LLM fallback a narration with no UTR and scripted the model to return `HDFCN99999999999`; the parser accepted it as a full UTR.
- **Believed:** shape validation (16 characters, bank code, `N`, digits) was enough to reject invented values.
- **True:** a hallucinated UTR can be perfectly well-formed. Shape says nothing about provenance.
- **Changed:** any UTR the model returns must appear verbatim in the narration text, or it is discarded before shape validation even runs. The grammar decides; the model only points.

## 9. The UI mixed a demo run into a live session
- **Saw:** `/app` returned a 500 on the hosted product while every API route answered.
- **Believed:** the API had a broken run.
- **True:** the UI's API timeout was 2.5 seconds. A cold Vercel start plus a Neon round trip took longer, so the *run list* fell back to fixtures (whose captured run id no longer existed), while the next request reached the now-warm API and got a 404 for that id. Two data sources in one page render.
- **Changed:** 20-second timeout; the fixture-only run id is never sent to the API; a run that lost its result to an interrupted request is finished on first read instead of raising.

## 10. A pseudo-element became a table column
- **Saw:** on the Settlements table every body row was shifted one column right of its header; status chips were clipped off the edge.
- **Believed:** a header/body column-count mismatch in the JSX.
- **True:** the hover accent was a `::before` on the `<tr>`. Chromium lays out generated content on a table row as an anonymous table cell, so every row grew an invisible first column.
- **Changed:** the accent is an inset box-shadow on the first cell. Diagnosed from accessibility-tree bounding boxes, not from the JSX, which was fine.
