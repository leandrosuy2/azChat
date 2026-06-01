#!/bin/bash
# deploy.sh — atualiza backend, frontend ou ambos
# Uso: ./deploy.sh [back|front|all]
# Padrão sem argumento: all

set -e

TARGET="${1:-all}"
PROJECT_DIR="/home/deploy/azChat"
BACKUP_DIR="/home/deploy/backups"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[deploy]${NC} $1"; }
ok()   { echo -e "${GREEN}[ok]${NC} $1"; }
warn() { echo -e "${YELLOW}[aviso]${NC} $1"; }
die()  { echo -e "${RED}[erro]${NC} $1"; exit 1; }

if [[ "$TARGET" != "back" && "$TARGET" != "front" && "$TARGET" != "all" ]]; then
  die "Argumento inválido: '$TARGET'. Use: back | front | all"
fi

# ---------------------------------------------------------------------------
# Backup do banco (sempre, exceto se só frontend)
# ---------------------------------------------------------------------------
if [[ "$TARGET" != "front" ]]; then
  log "Fazendo backup do banco antes do deploy..."
  mkdir -p "$BACKUP_DIR"
  DUMP_FILE="$BACKUP_DIR/azvdodesigner_$(date +%Y%m%d_%H%M%S).dump"
  PGPASSWORD=123456 pg_dump -U azvdodesigner -h localhost -d azvdodesigner \
    -F c -f "$DUMP_FILE"
  ok "Backup salvo em $DUMP_FILE"
fi

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
deploy_backend() {
  log "--- BACKEND ---"
  cd "$PROJECT_DIR/backend"

  log "Instalando dependências..."
  npm install --silent

  log "Compilando TypeScript..."
  rm -rf dist
  npm run build

  log "Rodando migrations..."
  npx sequelize db:migrate

  log "Reiniciando processo PM2..."
  if pm2 describe multipremium-back > /dev/null 2>&1; then
    pm2 restart multipremium-back --update-env
  else
    pm2 start ecosystem.config.js
  fi

  ok "Backend atualizado."
}

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
deploy_frontend() {
  log "--- FRONTEND ---"
  cd "$PROJECT_DIR/frontend"

  log "Instalando dependências..."
  #npm install --silent

  log "Buildando React..."
  rm -rf build
  npm run build

  log "Reiniciando processo PM2..."
  if pm2 describe azvdodesigner-frontend > /dev/null 2>&1; then
    pm2 restart azvdodesigner-frontend
  else
    pm2 start server.js --name "azvdodesigner-frontend"
  fi

  ok "Frontend atualizado."
}

# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------
log "Iniciando deploy: $TARGET"

[[ "$TARGET" == "back" || "$TARGET" == "all" ]] && deploy_backend
[[ "$TARGET" == "front" || "$TARGET" == "all" ]] && deploy_frontend

log "Salvando estado do PM2..."
pm2 save

echo ""
ok "Deploy finalizado! Status:"
pm2 list
