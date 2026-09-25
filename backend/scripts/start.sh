#!/usr/bin/env sh
# Starts the API. When a replica bucket is configured, the SQLite file is first restored from
# object storage and Litestream then streams every write back while the API runs.
# Without one (local dev, or before storage is set up) the API starts on a plain local file.
set -eu
cd "$(dirname "$0")/.."

export DB_PATH="$(pwd)/data/app.db"
export DATABASE_URL="sqlite:///${DB_PATH}"
APP="uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"

if [ -n "${LITESTREAM_BUCKET:-}" ]; then
  mkdir -p data
  ./bin/litestream restore -config litestream.yml -if-db-not-exists -if-replica-exists "$DB_PATH"
  exec ./bin/litestream replicate -config litestream.yml -exec "$APP"
fi
exec $APP
