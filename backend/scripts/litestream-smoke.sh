#!/usr/bin/env bash
# End-to-end check of the Litestream setup (scripts/start.sh + litestream.yml) against a local
# S3 server (moto), so no Backblaze account is needed. Linux only (Litestream has no Windows build).
# Needs: bin/litestream (scripts/install-litestream.sh), and requirements-dev.txt installed (uvicorn, moto).
#
#   boot 1  empty bucket   -> seeds, replicates; book a stay; SIGTERM straight after the write
#   boot 2  wiped disk     -> restores; the booking and its blocked dates are back; book again; SIGTERM
#   boot 3  wiped disk     -> restores the newer generation: both bookings are back
#   boot 4  missing bucket -> start.sh refuses to boot instead of seeding a fresh database
set -euo pipefail
cd "$(dirname "$0")/.."

WORK="$(mktemp -d)"
S3_PORT=9000
export PORT=8765
export DB_PATH="$WORK/app.db"
export SEED_ON_STARTUP=true
export LITESTREAM_BUCKET=smoke
export LITESTREAM_ENDPOINT="http://127.0.0.1:${S3_PORT}"
export LITESTREAM_REGION=us-east-1
export LITESTREAM_ACCESS_KEY_ID=smoke
export LITESTREAM_SECRET_ACCESS_KEY=smoke
BASE="http://127.0.0.1:${PORT}/api"
GUEST=ananya@example.com
APP_PID=""

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }
cleanup() {
  [ -n "$APP_PID" ] && kill "$APP_PID" 2>/dev/null || true
  [ -n "${S3_PID:-}" ] && kill "$S3_PID" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

api() { curl -sS -b "$WORK/cookies" -c "$WORK/cookies" -H 'content-type: application/json' "$@"; }
json() { python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"; }

boot() {
  sh scripts/start.sh >"$WORK/boot$1.log" 2>&1 &
  APP_PID=$!
  for _ in $(seq 60); do
    curl -fs "$BASE/health" >/dev/null 2>&1 && return 0
    kill -0 "$APP_PID" 2>/dev/null || { cat "$WORK/boot$1.log"; fail "boot $1 exited early"; }
    sleep 1
  done
  cat "$WORK/boot$1.log"; fail "boot $1 never became healthy"
}

# Render's SIGTERM on spin-down or deploy. Litestream forwards it to uvicorn, then syncs and exits.
stop() {
  kill -TERM "$APP_PID"
  wait "$APP_PID" || true
  APP_PID=""
}

# A fresh Render instance: nothing on disk, not even Litestream's local shadow WAL.
wipe_disk() { rm -rf "$DB_PATH" "$DB_PATH-wal" "$DB_PATH-shm" "$WORK/.app.db-litestream"; }

# Books listing 1 for two nights at the first free slot from +$1 days, and prints "id check_in check_out".
book() {
  api -o /dev/null -X POST "$BASE/auth/login" -d "{\"email\":\"$GUEST\"}"
  for offset in $(seq "$1" 3 "$(($1 + 60))"); do
    local ci co code
    ci="$(date -d "+${offset} days" +%F)"; co="$(date -d "+$((offset + 2)) days" +%F)"
    code="$(api -o "$WORK/booking.json" -w '%{http_code}' -X POST "$BASE/bookings" \
      -d "{\"listing_id\":1,\"check_in\":\"$ci\",\"check_out\":\"$co\",\"adults\":1}")"
    [ "$code" = 201 ] && { echo "$(json 'd["id"]' <"$WORK/booking.json") $ci $co"; return 0; }
  done
  fail "no free dates for listing 1"
}

has_booking() {
  api -o /dev/null -X POST "$BASE/auth/login" -d "{\"email\":\"$GUEST\"}"
  api "$BASE/bookings/mine" | json "any(b['id'] == $1 for b in d)" | grep -qx True \
    || fail "booking $1 missing from My Trips after restore"
  api "$BASE/listings/1/availability?start=$2&end=$3" | json "any(r['check_in'] <= '$2' < r['check_out'] for r in d['booked'])" \
    | grep -qx True || fail "dates $2..$3 of booking $1 not blocked after restore"
}

python3 -m moto.server -H 127.0.0.1 -p "$S3_PORT" >"$WORK/s3.log" 2>&1 &
S3_PID=$!
for _ in $(seq 30); do curl -fs "$LITESTREAM_ENDPOINT" >/dev/null 2>&1 && break; sleep 1; done
curl -fsS -X PUT "$LITESTREAM_ENDPOINT/$LITESTREAM_BUCKET" >/dev/null || fail "could not create the test bucket"

echo "boot 1: empty bucket"
boot 1
grep -q "no matching backups" "$WORK/boot1.log" || fail "boot 1 should have found no backup"
read -r FIRST CI1 CO1 < <(book 200)
[ -n "${FIRST:-}" ] || fail "first booking failed"
echo "  booked #$FIRST ($CI1..$CO1), stopping immediately"
stop
wipe_disk

echo "boot 2: restore on a wiped disk"
boot 2
has_booking "$FIRST" "$CI1" "$CO1"
read -r SECOND CI2 CO2 < <(book 260)
[ -n "${SECOND:-}" ] || fail "second booking failed"
echo "  restored #$FIRST; booked #$SECOND ($CI2..$CO2), stopping immediately"
stop
wipe_disk

echo "boot 3: restore the newer generation"
boot 3
has_booking "$FIRST" "$CI1" "$CO1"
has_booking "$SECOND" "$CI2" "$CO2"
echo "  both bookings restored"
stop
wipe_disk

echo "boot 4: missing bucket must refuse to boot"
rc=0
LITESTREAM_BUCKET=does-not-exist timeout 60 sh scripts/start.sh >"$WORK/boot4.log" 2>&1 || rc=$?
if [ "$rc" = 0 ] || [ "$rc" = 124 ]; then
  cat "$WORK/boot4.log"; fail "start.sh booted without its bucket (exit $rc)"
fi
[ -e "$DB_PATH" ] && fail "a fresh database was created after a failed restore"
echo "  refused: $(grep -m1 -i error "$WORK/boot4.log" || tail -n1 "$WORK/boot4.log")"

echo "SMOKE OK"
