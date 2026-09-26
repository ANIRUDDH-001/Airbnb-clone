#!/usr/bin/env sh
# Starts the API. When a replica bucket is configured, the SQLite file is first restored from
# object storage and Litestream then streams every write back while the API runs.
# Without one (local dev, or to roll back) the API starts on a plain local file.
# If the restore fails (bad keys, bucket unreachable) the script exits: seeding a fresh database
# instead would replicate over the real one and hide it from every later restore.
set -eu
cd "$(dirname "$0")/.."

export DB_PATH="${DB_PATH:-$(pwd)/data/app.db}"
export DATABASE_URL="sqlite:///${DB_PATH}"
APP="uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"

if [ -n "${LITESTREAM_BUCKET:-}" ]; then
  echo "start.sh: restoring ${DB_PATH} from bucket ${LITESTREAM_BUCKET}, then replicating"
  mkdir -p "$(dirname "$DB_PATH")"
  ./bin/litestream restore -config litestream.yml -if-db-not-exists -if-replica-exists "$DB_PATH"
  exec ./bin/litestream replicate -config litestream.yml -exec "$APP"
fi
echo "start.sh: LITESTREAM_BUCKET not set, starting on a local database file without replication"
exec $APP
