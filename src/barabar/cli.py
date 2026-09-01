"""``barabar`` command line: demo, evals, generate."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

from barabar.core.config import MatchConfig
from barabar.core.hashing import code_version
from barabar.core.matching import reconcile
from barabar.core.models import ExceptionStatus
from barabar.core.money import format_inr
from barabar.evals.datasets import read_dataset, write_dataset
from barabar.evals.runner import inputs_hash, run_sizes, score, write_report
from barabar.generator.engine import generate
from barabar.generator.profiles import MerchantProfile


def cmd_demo(args: argparse.Namespace) -> int:
    cfg = MatchConfig()
    if args.dataset:
        month, truth = read_dataset(Path(args.dataset))
    else:
        gen = generate(seed=args.seed, n_orders=args.n, profile=MerchantProfile(args.profile))
        month, truth = gen.month, gen.truth
    import time

    t0 = time.perf_counter()
    result = reconcile(month, cfg, run_id="demo")
    elapsed = time.perf_counter() - t0
    m = result.metrics
    print(
        f"Barabar · {len(month.payments)} payments · {len(month.settlements)} settlements · {len(month.bank_txns)} bank rows · {len(month.ledger)} ledger rows"
    )
    print(f"inputs_hash  {inputs_hash(month)}")
    print(f"config_hash  {cfg.config_hash()}")
    print(f"code_version {code_version()}")
    print(f"outputs_hash {result.outputs_hash()}")
    print()
    print(f"Gross captured   {format_inr(int(m['gross_captured_paise']))}")
    print(
        f"Explained        {format_inr(int(m['explained_paise']))}  ({m['rupees_explained_pct']}%)"
    )
    print(f"Unexplained      {format_inr(int(m['unexplained_paise']))}")
    print(
        f"Links            {m['links_total']}  (A {m['links_tier_A']} · B {m['links_tier_B']} · C {m['links_tier_C']})"
    )
    print(
        f"Settlements      {m['settlements_matched_to_bank']}/{m['settlements_processed']} matched to bank credits"
    )
    print(
        f"Exceptions       {m['exceptions_total']} typed · {m['exceptions_open']} open · {m['exceptions_auto_resolved']} auto-resolved"
    )
    print(f"Wall clock       {elapsed:.2f}s")
    if truth:
        metrics, _, _ = score(result, truth, cfg, elapsed)
        print(
            f"vs ground truth  auto-match {metrics['auto_match_rate_pct']}% at precision {metrics['auto_match_precision_pct']}% · classification {metrics['exception_classification_accuracy_pct']}%"
        )
    print()
    print("Open exceptions:")
    for e in sorted(
        (e for e in result.exceptions if e.status == ExceptionStatus.OPEN), key=lambda e: -e.amount
    )[: args.top]:
        print(
            f"  {e.type.value:<28} {format_inr(e.amount):>16}  conf {e.confidence:.2f}  {e.reason_text}"
        )
    return 0


def cmd_evals(args: argparse.Namespace) -> int:
    sizes = tuple(int(s) for s in args.sizes.split(","))
    results = run_sizes(sizes, seed=args.seed)
    path = write_report(results, Path(args.out))
    print(f"wrote {path}")
    failures = 0
    from barabar.evals.runner import TARGETS, meets

    for r in results:
        for k, (op, tgt) in TARGETS.items():
            if not meets(op, float(r.metrics[k]), tgt):  # type: ignore[arg-type]
                failures += 1
                print(f"  ✗ {r.name}: {k}={r.metrics[k]} (target {op} {tgt})")
        print(
            f"  {r.name}: match {r.metrics['auto_match_rate_pct']}% · precision {r.metrics['auto_match_precision_pct']}% · explained {r.metrics['rupees_explained_pct']}% (coverage {r.metrics['explainable_coverage_pct']}%) · classification {r.metrics['exception_classification_accuracy_pct']}% · {r.metrics['throughput_seconds']}s"
        )
    return 1 if failures and args.strict else 0


def cmd_generate(args: argparse.Namespace) -> int:
    gen = generate(seed=args.seed, n_orders=args.n, profile=MerchantProfile(args.profile))
    write_dataset(gen, Path(args.out))
    print(
        f"wrote {args.out}: {len(gen.month.payments)} payments, {len(gen.month.settlements)} settlements, {len(gen.truth.exceptions)} injected exceptions"
    )
    return 0


def cmd_fetch(args: argparse.Namespace) -> int:
    """Pull a month from a Razorpay TEST account; simulate settlements where the account has none."""
    from datetime import date as _date

    from barabar.adapters.razorpay_api import RazorpayClient, fetch_month
    from barabar.core.calendar import SettlementCalendar
    from barabar.core.ids import IdGen
    from barabar.core.models import Bank, BankTxn, Month, RzAdjustment
    from barabar.evals.datasets import write_dataset
    from barabar.generator.engine import GeneratedMonth
    from barabar.simulator.engine import Simulator, SimulatorConfig, SimulatorPlan
    from barabar.simulator.truth import GroundTruth

    parts = fetch_month(RazorpayClient(), args.year, args.month)
    as_of = _date.today()
    payments = tuple(parts["payments"])
    refunds = tuple(parts["refunds"])
    disputes = tuple(parts["disputes"])
    settlements = tuple(parts["settlements"])
    recon_lines = tuple(parts["recon_lines"])
    adjustments: tuple[RzAdjustment, ...] = ()
    bank_txns: tuple[BankTxn, ...] = ()
    simulated = False
    if not recon_lines:
        sim = Simulator(
            SimulatorConfig(
                calendar=SettlementCalendar.rbi(args.year),
                bank=Bank(args.bank),
                bank_statement_end=as_of,
            ),
            SimulatorPlan(),
            IdGen(args.year * 100 + args.month),
            as_of,
        )
        out = sim.run(list(payments), list(refunds), list(disputes))
        settlements, recon_lines = tuple(out.settlements), tuple(out.recon_lines)
        adjustments, bank_txns = tuple(out.adjustments), tuple(out.bank_txns)
        simulated = True
    month = Month(
        as_of=as_of,
        payments=payments,
        refunds=refunds,
        disputes=disputes,
        adjustments=adjustments,
        settlements=settlements,
        recon_lines=recon_lines,
        bank_txns=bank_txns,
        ledger=(),
    )
    truth = GroundTruth(
        seed=0,
        profile="testmode",
        n_orders=len(month.payments),
        fault_plan={},
        gross_captured=month.gross_captured,
        links=(),
        exceptions=(),
    )
    write_dataset(
        GeneratedMonth(
            month=month,
            truth=truth,
            config={
                "source": "razorpay-test-mode",
                "simulated_settlements": simulated,
                "as_of": as_of.isoformat(),
            },
        ),
        Path(args.out),
    )
    print(
        f"wrote {args.out}: {len(month.payments)} payments, {len(month.settlements)} settlements ({'simulated' if simulated else 'from /settlements/recon'})"
    )
    return 0


def cmd_investigator_evals(args: argparse.Namespace) -> int:
    from barabar.evals.investigator_evals import run_investigator_evals
    from barabar.evals.investigator_evals import write_report as write_inv

    report = run_investigator_evals(limit=args.limit)
    path = write_inv(report, Path(args.out))
    print(
        f"wrote {path}: accuracy {report['accuracy_pct']}% over {report['scored']} scored ({report['errors']} errors)"
    )
    return 0


def main(argv: list[str] | None = None) -> int:
    load_dotenv()
    p = argparse.ArgumentParser(prog="barabar")
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser(
        "demo", help="reconcile a synthetic month (or a dataset dir) and print the close pack"
    )
    d.add_argument("--n", type=int, default=600)
    d.add_argument("--seed", type=int, default=42)
    d.add_argument("--profile", default="d2c_fashion", choices=[m.value for m in MerchantProfile])
    d.add_argument("--dataset", default=None)
    d.add_argument("--top", type=int, default=25)
    d.set_defaults(fn=cmd_demo)
    e = sub.add_parser("evals", help="run all datasets and write evals/reports/<date>.md")
    e.add_argument("--sizes", default="60,600,6000")
    e.add_argument("--seed", type=int, default=42)
    e.add_argument("--out", default="evals/reports")
    e.add_argument("--strict", action="store_true")
    e.set_defaults(fn=cmd_evals)
    g = sub.add_parser("generate", help="write a synthetic dataset directory")
    g.add_argument("--n", type=int, default=600)
    g.add_argument("--seed", type=int, default=42)
    g.add_argument("--profile", default="d2c_fashion", choices=[m.value for m in MerchantProfile])
    g.add_argument("--out", required=True)
    g.set_defaults(fn=cmd_generate)
    f = sub.add_parser(
        "fetch", help="pull a month from a Razorpay TEST-mode account into a dataset dir"
    )
    f.add_argument("--year", type=int, required=True)
    f.add_argument("--month", type=int, required=True)
    f.add_argument("--bank", default="HDFC")
    f.add_argument("--out", required=True)
    f.set_defaults(fn=cmd_fetch)
    iv = sub.add_parser(
        "investigator-evals",
        help="run tier D over open exceptions of the 600-order month and score vs truth (needs ANTHROPIC_API_KEY once; cached after)",
    )
    iv.add_argument("--limit", type=int, default=40)
    iv.add_argument("--out", default="evals/reports")
    iv.set_defaults(fn=cmd_investigator_evals)
    args = p.parse_args(argv)
    return int(args.fn(args))


if __name__ == "__main__":
    sys.exit(main())
