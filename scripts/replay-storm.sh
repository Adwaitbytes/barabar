#!/usr/bin/env bash
# Fire the same signed refund webhook N times at the API and show that exactly one row landed.
# Usage: scripts/replay-storm.sh [N] [API_URL]      (reads RAZORPAY_WEBHOOK_SECRET from .env)
set -euo pipefail
N="${1:-50}"
API="${2:-http://127.0.0.1:8000}"
SECRET="$(grep -E '^RAZORPAY_WEBHOOK_SECRET=' .env | cut -d= -f2- | tr -d '"')"
BODY='{"event":"refund.processed","payload":{"refund":{"entity":{"id":"rfnd_ReplayStorm001","amount":149900,"payment_id":"pay_ReplayStorm001"}}}}'
SIG="$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')"
echo "sending the same refund.processed event $N times..."
for i in $(seq 1 "$N"); do
  curl -s -o /dev/null -X POST "$API/webhooks/razorpay" -H "content-type: application/json" -H "X-Razorpay-Signature: $SIG" -d "$BODY"
done
echo "result:"; curl -s "$API/webhooks/stats"; echo
