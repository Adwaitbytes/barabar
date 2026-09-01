# Decisions

Recorded at kickoff, updated as the build learned things.

| # | Decision | Choice | Why / tradeoff |
|---|---|---|---|
| 1 | Language split | Python 3.12 core + FastAPI; Next.js + TypeScript UI | `hypothesis` property testing and `rapidfuzz` are best-in-class; a finance panel expects Python. UI stays a thin client. |
| 2 | Package layout | One distribution `barabar` with sub-packages, boundaries enforced by `import-linter` | Same boundaries as the PRD's `packages/` tree, a fraction of the packaging overhead. `core` imports nothing else in `barabar`. |
| 3 | Storage | SQLAlchemy Core; SQLite for `make demo`, Postgres in production (`DATABASE_URL`) | One code path. In-memory SQLite uses a static pool so tests share a connection across threads. |
| 4 | Investigator runtime | Anthropic Messages API tool loop with strict tool schemas (no write tools exist) | Portable to serverless; the tool belt is the guardrail. Razorpay's own MCP server can be attached as extra read tools in a live account. |
| 5 | Marketplace fourth source (194-O TDS / GST TCS) | Documented stretch; taxonomy types reserved | Facts verified (0.1% TDS from 1 Oct 2024; 0.5% TCS from 10 Jul 2024). Not built in v1. |
| 6 | Test-mode disputes | Verify in the dashboard before promising in the README | Documented as "create from Dashboard → Transactions → Disputes" by Razorpay; unverified here. |
| 7 | Money | `int` paise end to end; `ROUND_HALF_UP` named constant | See `core/money.py`. Changing the policy changes `config_hash`. |
| 8 | Settlement weekends | Saturdays and Sundays are non-working for settlement (`all_weekends`) | Razorpay processes on working days; the 2nd/4th-Saturday bank policy is available as an option for bank-side semantics. |
| 9 | "Unexplained" | Open exceptions below the auto-accept threshold, **money-flow types only** | Ledger hygiene (orphans, mismatches, missing credit notes) is reported separately. See FAILURES.md #5. |
| 10 | Tier C | Capped at 0.85, threshold 0.92 → proposals only by default | A human click creates the link; the click is audited. |
| 11 | Model routing | Anthropic SDK pointed at OpenRouter (speaks the Messages format); `BARABAR_MODEL=anthropic/claude-sonnet-5` for the investigator and ask-the-books, `BARABAR_MODEL_CHEAP=openai/gpt-4o-mini` for narration extraction | Quality-critical reasoning over money gets a strong model; a cheap model only does extraction that the grammar re-validates. Anthropic-only request features (refusal fallbacks) are skipped on gateways. All investigator outputs are cached by `(outputs_hash, exc_id, model, prompt_version)`. |

## Name

*Milaan* (मिलान, "matching") was accurate but soft. Shortlist, checked for fintech conflicts on 2 Sep 2026:

| Name | Meaning | Verdict |
|---|---|---|
| **Barabar** (बराबर) | "exactly equal, even". *Hisaab barabar* is what every founder says when the accounts finally square. | **Chosen.** When the residual is ₹0, the books are barabar. |
| Sulah (सुलह) | reconciliation, making peace between two parties | Beautiful, slightly dispute-flavoured. |
| Hisaab (हिसाब) | accounts, reckoning | Generic; crowded namespace. |
| Saaf (साफ) | clean, clear | Nice verb, thin as a noun. |

The name lives in one place (`barabar.api.app.APP_NAME` and the package name); renaming is a mechanical change.

## Buildability (from the PRD review)

Everything in the PRD is buildable. Caveats: test-mode settlements are simulated (disclosed); the Tally import shot in the video needs a Windows machine; the test-mode dispute must be verified by hand; the investigator needs an `ANTHROPIC_API_KEY` (evals cache LLM outputs); Account Aggregator, Zoho API, RazorpayX statement, marketplace TDS/TCS and INTL_FX are documented stretch.
