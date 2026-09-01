"""``make seed``: create N test-mode orders and payment links so a judge can pay a few
with Razorpay's test credentials and watch Barabar reconcile real test entities.

Test mode has no server-side "pay this card" for standard accounts, so the script
prints the payment links; pay them from the hosted page with ``success@razorpay``
(UPI) or a documented test card. Refunds are created via API for the first two paid
payments on the next run. Never runs with a live key."""

from __future__ import annotations

import argparse
import random
import sys
import time

import httpx
from dotenv import load_dotenv

from barabar.adapters.razorpay_api import RazorpayClient
from barabar.core.money import format_inr


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="barabar-seed")
    p.add_argument("--n", type=int, default=12)
    p.add_argument("--seed", type=int, default=42)
    p.add_argument(
        "--refund-paid", action="store_true", help="refund the first two captured payments found"
    )
    args = p.parse_args(argv)
    load_dotenv()
    client = RazorpayClient()
    rng = random.Random(args.seed)
    print(f"Creating {args.n} test-mode orders + payment links…")
    for i in range(1, args.n + 1):
        amount = rng.choice([49900, 99900, 149900, 249900, 599900, 1299900])
        receipt = f"rcpt_seed_{args.seed}_{i:03d}"
        order = client.create_order(amount, receipt)
        link = None
        for attempt in range(
            4
        ):  # Razorpay rate-limits payment-link creation on fresh test accounts
            try:
                link = client.create_payment_link(amount, receipt, f"Barabar seed order {i}")
                break
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code != 429 or attempt == 3:
                    raise
                time.sleep(3 * (attempt + 1))
        assert link is not None
        time.sleep(1.5)
        print(
            f"  {receipt}  {format_inr(amount):>12}  order {order['id']}  pay at {link['short_url']}"
        )
    print(
        "\nPay a few links with UPI `success@razorpay` (or a test card), then run:\n  barabar fetch --year 2026 --month 9 --out evals/datasets/testmode && barabar demo --dataset evals/datasets/testmode"
    )
    if args.refund_paid:
        from datetime import date

        today = date.today()
        paid = [pmt for pmt in client.payments(today.year, today.month) if pmt.captured_at]
        for pmt in paid[:2]:
            r = client.create_refund(pmt.payment_id, pmt.amount // 2)
            print(f"  refunded {format_inr(pmt.amount // 2)} of {pmt.payment_id} -> {r['id']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
