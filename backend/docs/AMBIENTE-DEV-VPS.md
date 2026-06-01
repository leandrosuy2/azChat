# Ambiente dev na VPS com banco clonado

## Objetivo

Rodar um ambiente de desenvolvimento na mesma VPS, isolado do ambiente principal:

| Recurso | Producao atual | Dev sugerido |
|---------|----------------|--------------|
| Backend | `4000` | `4001` |
| Frontend | `443` / dominio principal | `3001` ou subdominio dev |
| PostgreSQL | `5432` | `5433` somente local |
| Redis | `5000` ou `6379` | `6380` somente local |

O banco dev pode ser recriado a qualquer momento a partir do banco real usando:

```bash
cd /home/deploy/azChat/backend
npm run db:clone:dev
```

## Arquivos criados

| Arquivo | Uso |
|---------|-----|
| `backend/docker-compose.dev.yml` | Sobe PostgreSQL e Redis dev em portas separadas |
| `backend/.env.vps-dev.example` | Template do backend dev |
| `frontend/.env.vps-dev.example` | Template do frontend dev |
| `backend/scripts/clone-prod-db-to-dev.sh` | Clona banco de producao para banco dev |

## 1. Criar env do backend dev

```bash
cd /home/deploy/azChat/backend
cp .env.vps-dev.example .env.vps-dev
nano .env.vps-dev
```

Edite principalmente:

```env
BACKEND_URL=https://dev-api.azvdodesigner.site
FRONTEND_URL=https://dev-app.azvdodesigner.site
PORT=4001

DB_HOST=127.0.0.1
DB_PORT=5433
DB_USER=azchat_dev
DB_PASS=azchat_dev123
DB_NAME=azchat_dev

REDIS_URI=redis://:azchat_dev123@127.0.0.1:6380
```

Se for testar Meta/Instagram no dev, configure `FACEBOOK_APP_ID` e `FACEBOOK_APP_SECRET`.
Se nao for testar webhook real, deixe vazios.

## 2. Criar env do frontend dev

```bash
cd /home/deploy/azChat/frontend
cp .env.vps-dev.example .env.development.local
nano .env.development.local
```

Edite:

```env
PORT=3001
HOST=0.0.0.0
REACT_APP_BACKEND_URL=https://dev-api.azvdodesigner.site
REACT_APP_FACEBOOK_APP_ID=
```

## 2.1. Criar subdominios HTTPS de dev

Crie dois registros DNS do tipo `A` apontando para o IP da VPS:

```text
dev-app.azvdodesigner.site  -> IP_DA_VPS
dev-api.azvdodesigner.site  -> IP_DA_VPS
```

Depois instale o vhost Nginx dev:

```bash
su root -c "cp /home/deploy/azChat/backend/deploy/nginx/azvdodesigner-dev.conf /etc/nginx/sites-available/azvdodesigner-dev"
su root -c "ln -sf /etc/nginx/sites-available/azvdodesigner-dev /etc/nginx/sites-enabled/azvdodesigner-dev"
su root -c "nginx -t && nginx -s reload"
```

Quando o DNS ja resolver, emita os certificados:

```bash
su root -c "certbot --nginx -d dev-app.azvdodesigner.site -d dev-api.azvdodesigner.site"
```

O Nginx dev fica assim:

```text
https://dev-app.azvdodesigner.site -> http://127.0.0.1:3001
https://dev-api.azvdodesigner.site -> http://127.0.0.1:4001
```

## 3. Subir PostgreSQL e Redis dev

```bash
cd /home/deploy/azChat/backend
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

As portas `5433` e `6380` ficam presas em `127.0.0.1`, ou seja, acessiveis apenas pela propria VPS.

Nota sobre PostgreSQL 18: o volume dev usa `postgres18_data_dev` montado em `/var/lib/postgresql`,
que e o layout esperado pelas imagens oficiais 18+. Se voce tiver uma pasta antiga
`postgres_data_dev` criada antes dessa mudanca, ela pode ser removida depois de parar o container dev:

```bash
docker compose -f docker-compose.dev.yml down
rm -rf postgres_data_dev
docker compose -f docker-compose.dev.yml up -d
```

## 4. Clonar banco real para banco dev

```bash
cd /home/deploy/azChat/backend
npm run db:clone:dev
```

O script usa:

- origem: `backend/.env`
- destino: `backend/.env.vps-dev`

Por padrao ele tambem sanitiza o destino para evitar disparos reais:

- desconecta todas as conexoes em `Whatsapps`
- remove sessoes Baileys
- remove tokens Meta salvos no clone
- inativa campanhas programadas/em andamento
- cancela agendamentos pendentes/agendados
- limpa mensagens programadas
- limpa o Redis dev

Para clonar mantendo tudo exatamente como producao, use com cuidado:

```bash
SANITIZE_DEV=false npm run db:clone:dev
```

Nao recomendo subir backend dev com `SANITIZE_DEV=false`, porque ele pode tentar conectar WhatsApp real ou disparar mensagens.

## 5. Rodar backend dev

Modo terminal:

```bash
cd /home/deploy/azChat/backend
DOTENV_PATH=.env.vps-dev npm run dev
```

O backend deve subir em:

```text
http://SEU_IP_OU_DOMINIO:4001
```

Modo PM2 opcional:

```bash
cd /home/deploy/azChat/backend
npm run build
DOTENV_PATH=.env.vps-dev pm2 start dist/server.js --name azchat-back-dev
pm2 logs azchat-back-dev
```

## 6. Rodar frontend dev

```bash
cd /home/deploy/azChat/frontend
npm run dev
```

O frontend deve subir em:

```text
http://SEU_IP_OU_DOMINIO:3001
```

Se a VPS tiver firewall, libere somente o necessario:

```bash
sudo ufw allow 3001/tcp
sudo ufw allow 4001/tcp
```

Nao libere `5433` nem `6380` publicamente.

## 7. Recriar o banco dev quando quiser

Sempre que quiser atualizar o dev com dados reais:

```bash
cd /home/deploy/azChat/backend
npm run db:clone:dev
```

Se quiser informar envs diferentes:

```bash
PROD_ENV=/home/deploy/azChat/backend/.env \
DEV_ENV=/home/deploy/azChat/backend/.env.vps-dev \
npm run db:clone:dev
```

O script usa a imagem `postgres:18-alpine`, alinhada com o PostgreSQL 18 da producao.
Se a producao mudar de versao, ajuste `POSTGRES_IMAGE` ao rodar:

```bash
POSTGRES_IMAGE=postgres:18-alpine npm run db:clone:dev
```

Se a VPS nao puder usar Docker para rodar `pg_dump`/`pg_restore`, instale os clientes do Postgres na mesma major version do servidor de producao e rode:

```bash
DB_CLONE_USE_DOCKER=false npm run db:clone:dev
```

## Checklist rapido

```bash
curl http://127.0.0.1:4001/health 2>/dev/null || true
docker ps | grep azchat-postgres-dev
docker ps | grep azchat-redis-dev
```

Depois acesse:

```text
http://SEU_IP_OU_DOMINIO:3001
```

Use um login clonado da producao. Como o banco dev e uma copia, usuarios/senhas sao os mesmos do ambiente real no momento do clone.
