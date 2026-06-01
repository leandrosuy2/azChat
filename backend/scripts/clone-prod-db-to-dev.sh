#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PROD_ENV="${PROD_ENV:-$ROOT_DIR/.env}"
DEV_ENV="${DEV_ENV:-$ROOT_DIR/.env.vps-dev}"
SANITIZE_DEV="${SANITIZE_DEV:-true}"
FLUSH_DEV_REDIS="${FLUSH_DEV_REDIS:-true}"
DB_CLONE_USE_DOCKER="${DB_CLONE_USE_DOCKER:-true}"
POSTGRES_IMAGE="${POSTGRES_IMAGE:-postgres:18-alpine}"
REDIS_IMAGE="${REDIS_IMAGE:-redis:7-alpine}"
DUMP_FILE="${DUMP_FILE:-}"

log() {
  printf '[clone-db] %s\n' "$*"
}

die() {
  printf '[clone-db] ERRO: %s\n' "$*" >&2
  exit 1
}

load_env_file() {
  local file="$1"
  [[ -f "$file" ]] || die "arquivo de env nao encontrado: $file"
  set -a
  # shellcheck disable=SC1090
  source "$file"
  set +a
}

require_var() {
  local name="$1"
  local value="${!name:-}"
  [[ -n "$value" ]] || die "variavel obrigatoria vazia: $name"
}

pg_client() {
  local password="$1"
  shift

  if [[ "$DB_CLONE_USE_DOCKER" == "true" ]]; then
    docker run --rm -i --network host -e PGPASSWORD="$password" "$POSTGRES_IMAGE" "$@"
  else
    PGPASSWORD="$password" "$@"
  fi
}

redis_client() {
  local password="$1"
  shift

  if [[ "$DB_CLONE_USE_DOCKER" == "true" ]]; then
    docker run --rm --network host "$REDIS_IMAGE" redis-cli -a "$password" "$@"
  else
    redis-cli -a "$password" "$@"
  fi
}

parse_redis_uri() {
  local uri="$1"

  DEV_REDIS_PASS=""
  DEV_REDIS_HOST=""
  DEV_REDIS_PORT=""

  [[ "$uri" == redis://* ]] || return 1

  local rest="${uri#redis://}"
  local auth_and_host="${rest%%/*}"
  local auth=""
  local host_port="$auth_and_host"

  if [[ "$auth_and_host" == *@* ]]; then
    auth="${auth_and_host%@*}"
    host_port="${auth_and_host#*@}"
    DEV_REDIS_PASS="${auth#:}"
  fi

  DEV_REDIS_HOST="${host_port%%:*}"
  DEV_REDIS_PORT="${host_port##*:}"

  [[ "$DEV_REDIS_HOST" != "$DEV_REDIS_PORT" ]] || DEV_REDIS_PORT="6379"
}

log "carregando origem: $PROD_ENV"
load_env_file "$PROD_ENV"
PROD_DB_HOST="${DB_HOST:-}"
PROD_DB_PORT="${DB_PORT:-5432}"
PROD_DB_USER="${DB_USER:-}"
PROD_DB_PASS="${DB_PASS:-}"
PROD_DB_NAME="${DB_NAME:-}"

log "carregando destino: $DEV_ENV"
load_env_file "$DEV_ENV"
DEV_DB_HOST="${DB_HOST:-}"
DEV_DB_PORT="${DB_PORT:-5432}"
DEV_DB_USER="${DB_USER:-}"
DEV_DB_PASS="${DB_PASS:-}"
DEV_DB_NAME="${DB_NAME:-}"
DEV_REDIS_URI="${REDIS_URI:-}"

for var in PROD_DB_HOST PROD_DB_PORT PROD_DB_USER PROD_DB_PASS PROD_DB_NAME DEV_DB_HOST DEV_DB_PORT DEV_DB_USER DEV_DB_PASS DEV_DB_NAME; do
  require_var "$var"
done

if [[ "$PROD_DB_HOST:$PROD_DB_PORT/$PROD_DB_NAME" == "$DEV_DB_HOST:$DEV_DB_PORT/$DEV_DB_NAME" ]]; then
  die "origem e destino parecem ser o mesmo banco. Abortando para proteger a producao."
fi

if [[ -z "$DUMP_FILE" ]]; then
  DUMP_FILE="$(mktemp -t azchat-prod-dump.XXXXXX.dump)"
  trap 'rm -f "$DUMP_FILE"' EXIT
fi

log "origem  : $PROD_DB_USER@$PROD_DB_HOST:$PROD_DB_PORT/$PROD_DB_NAME"
log "destino : $DEV_DB_USER@$DEV_DB_HOST:$DEV_DB_PORT/$DEV_DB_NAME"
log "dump    : $DUMP_FILE"

if [[ "$DB_CLONE_USE_DOCKER" == "true" ]]; then
  command -v docker >/dev/null || die "docker nao encontrado. Instale Docker ou rode com DB_CLONE_USE_DOCKER=false e pg tools instalados."
else
  command -v pg_dump >/dev/null || die "pg_dump nao encontrado"
  command -v pg_restore >/dev/null || die "pg_restore nao encontrado"
  command -v dropdb >/dev/null || die "dropdb nao encontrado"
  command -v createdb >/dev/null || die "createdb nao encontrado"
  command -v psql >/dev/null || die "psql nao encontrado"
fi

log "gerando dump da producao"
pg_client "$PROD_DB_PASS" pg_dump \
  -h "$PROD_DB_HOST" \
  -p "$PROD_DB_PORT" \
  -U "$PROD_DB_USER" \
  -d "$PROD_DB_NAME" \
  -Fc \
  --no-owner \
  --no-acl > "$DUMP_FILE"

if [[ ! -s "$DUMP_FILE" ]]; then
  die "dump gerado vazio. Verifique conexao com o banco de origem e versao do pg_dump."
fi

log "derrubando conexoes ativas no banco dev"
pg_client "$DEV_DB_PASS" psql \
  -h "$DEV_DB_HOST" \
  -p "$DEV_DB_PORT" \
  -U "$DEV_DB_USER" \
  -d postgres \
  -v ON_ERROR_STOP=1 \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DEV_DB_NAME' AND pid <> pg_backend_pid();" >/dev/null

log "recriando banco dev"
pg_client "$DEV_DB_PASS" dropdb \
  -h "$DEV_DB_HOST" \
  -p "$DEV_DB_PORT" \
  -U "$DEV_DB_USER" \
  --if-exists \
  "$DEV_DB_NAME"

pg_client "$DEV_DB_PASS" createdb \
  -h "$DEV_DB_HOST" \
  -p "$DEV_DB_PORT" \
  -U "$DEV_DB_USER" \
  "$DEV_DB_NAME"

log "restaurando dump no banco dev"
pg_client "$DEV_DB_PASS" pg_restore \
  -h "$DEV_DB_HOST" \
  -p "$DEV_DB_PORT" \
  -U "$DEV_DB_USER" \
  -d "$DEV_DB_NAME" \
  --no-owner \
  --no-acl < "$DUMP_FILE"

if [[ "$SANITIZE_DEV" == "true" ]]; then
  log "sanitizando banco dev para evitar disparos e conexoes reais"
  pg_client "$DEV_DB_PASS" psql \
    -h "$DEV_DB_HOST" \
    -p "$DEV_DB_PORT" \
    -U "$DEV_DB_USER" \
    -d "$DEV_DB_NAME" \
    -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF to_regclass('"Whatsapps"') IS NOT NULL THEN
    UPDATE "Whatsapps"
    SET
      status = 'DISCONNECTED',
      session = NULL,
      qrcode = NULL,
      retries = 0,
      "statusImportMessages" = NULL,
      "facebookUserToken" = NULL,
      "tokenMeta" = NULL;
  END IF;

  IF to_regclass('"Baileys"') IS NOT NULL THEN
    DELETE FROM "Baileys";
  END IF;

  IF to_regclass('"Campaigns"') IS NOT NULL THEN
    UPDATE "Campaigns"
    SET status = 'INATIVA'
    WHERE status IN ('PROGRAMADA', 'EM_ANDAMENTO');
  END IF;

  IF to_regclass('"Schedules"') IS NOT NULL THEN
    UPDATE "Schedules"
    SET status = 'CANCELADA'
    WHERE "sentAt" IS NULL
      AND status IN ('PENDENTE', 'AGENDADA');
  END IF;

  IF to_regclass('"ScheduledMessages"') IS NOT NULL THEN
    DELETE FROM "ScheduledMessages";
  END IF;

  IF to_regclass('"ScheduledMessagesEnvios"') IS NOT NULL THEN
    DELETE FROM "ScheduledMessagesEnvios";
  END IF;
END $$;
SQL
fi

if [[ "$FLUSH_DEV_REDIS" == "true" && -n "$DEV_REDIS_URI" ]]; then
  if parse_redis_uri "$DEV_REDIS_URI" && [[ -n "$DEV_REDIS_HOST" && -n "$DEV_REDIS_PORT" ]]; then
    log "limpando Redis dev em $DEV_REDIS_HOST:$DEV_REDIS_PORT"
    redis_client "$DEV_REDIS_PASS" -h "$DEV_REDIS_HOST" -p "$DEV_REDIS_PORT" FLUSHDB >/dev/null || \
      log "nao foi possivel limpar o Redis dev; limpe manualmente se houver filas antigas"
  else
    log "REDIS_URI dev nao esta no formato esperado; pulando limpeza de Redis"
  fi
fi

log "clone concluido"
log "por seguranca, conexoes WhatsApp/Facebook/Instagram ficam desconectadas no dev quando SANITIZE_DEV=true"
