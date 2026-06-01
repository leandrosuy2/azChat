# Deploy Guide — azChat na VPS

> ⚠️ **REGRA DE OURO: SEMPRE USE O USUÁRIO `deploy`**
>
> NUNCA rode comandos do projeto (`pm2`, `npm install`, `npm run build`, edição de arquivos, criação de migrations) como `root`. Se já estiver logado como root, prefixe com `sudo -u deploy bash -c "..."` ou use `su - deploy`.
>
> Misturar root e deploy quebra de jeitos sutis e demorados de debugar — veja a seção [Permissões: rodar tudo como `deploy`](#permissões-rodar-tudo-como-deploy) para os sintomas e como recuperar.

---

## Visão geral da stack

| Camada     | Tecnologia                         | Porta    | Gerenciado por        |
|------------|------------------------------------|----------|-----------------------|
| Frontend   | React (build estático + Express)   | 3000     | PM2 (fork, 1 inst.)   |
| Backend    | Node.js / TypeScript (compilado)   | 4000     | PM2 (fork, 1 inst.)   |
| Banco      | PostgreSQL 18                      | 5432     | systemd               |
| Cache/Fila | Redis (Docker)                     | 5000     | Docker                |
| Proxy SSL  | Nginx + Certbot (Let's Encrypt)    | 80/443   | systemd               |

> O backend roda em **fork mode com 1 instância**, não em cluster. Cluster mode com `instances: 'auto'` causava duplicação da sessão Baileys (WhatsApp) e erros `stream errored (replaced)`. Para escalar verticalmente, prefira aumentar recursos da máquina ou rever a arquitetura — não ative cluster sem antes resolver o lock de sessão Baileys.

---

## Como o projeto antigo (azvdodesigner) estava rodando

1. **PM2** gerencia dois processos salvos em `/home/deploy/.pm2/dump.pm2`:
   - `azvdodesigner-backend` → executa `dist/server.js` (TypeScript pré-compilado)
   - `azvdodesigner-frontend` → executa `frontend/server.js` (Express servindo o `build/` do React)
2. **Redis** roda como container Docker com restart automático:
   ```bash
   docker run -d --name redis-azvdodesigner --restart always \
     -p 5000:6379 redis redis-server --requirepass 123456
   ```
3. **Nginx** atua como reverse proxy com SSL:
   - `app.azvdodesigner.site` → `localhost:3000` (frontend)
   - `api.azvdodesigner.site` → `localhost:4000` (backend)
4. **PM2 startup** foi configurado para o usuário `deploy`, então os processos sobem automaticamente com o servidor (`pm2-deploy.service`).

---

## Backup do banco de dados

**Sempre faça um dump antes de qualquer deploy ou alteração no banco.**

### Criar dump

```bash
mkdir -p /home/deploy/backups
PGPASSWORD=123456 pg_dump -U azvdodesigner -h localhost -d azvdodesigner \
  -F c -f /home/deploy/backups/azvdodesigner_$(date +%Y%m%d_%H%M%S).dump
```

O flag `-F c` usa o formato binário comprimido do pg_dump — menor e mais rápido de restaurar.  
Os dumps ficam em `/home/deploy/backups/`.

Verifique que o arquivo foi criado:
```bash
ls -lh /home/deploy/backups/
```

### Restaurar dump

> Use isso apenas em emergência — o `--clean` apaga e recria os objetos antes de restaurar.

```bash
# Parar o backend primeiro para não haver conexões ativas
pm2 stop all

PGPASSWORD=123456 pg_restore -U azvdodesigner -h localhost -d azvdodesigner \
  --clean /home/deploy/backups/azvdodesigner_YYYYMMDD_HHMMSS.dump

# Subir novamente
pm2 start all
```

Se der erro de conexões ativas ao restaurar, force o encerramento delas primeiro:
```bash
PGPASSWORD=123456 psql -U azvdodesigner -h localhost -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='azvdodesigner' AND pid <> pg_backend_pid();"
```

---

## Subindo o azChat (versão atualizada)

O azChat usa o **mesmo banco de dados, mesmo Redis e mesmos domínios** que o projeto antigo.  
Portanto, o processo é: **backup → parar o antigo → compilar o novo → rodar o novo**.

### Passo 1 — Fazer backup do banco (não pule este passo)

```bash
mkdir -p /home/deploy/backups
PGPASSWORD=123456 pg_dump -U azvdodesigner -h localhost -d azvdodesigner \
  -F c -f /home/deploy/backups/azvdodesigner_$(date +%Y%m%d_%H%M%S).dump
```

### Passo 2 — Parar o projeto antigo

```bash
pm2 stop all
pm2 delete all
```

> Os dados no banco e no Redis não são afetados — apenas os processos Node param.

---

### Passo 3 — Ajustar o `.env` do backend (se necessário)

O arquivo `/home/deploy/azChat/backend/.env` já está configurado com os valores corretos.  
Confira se os valores batem com o ambiente:

```bash
cat /home/deploy/azChat/backend/.env
```

Campos críticos:
```
BACKEND_URL=https://api.azvdodesigner.site
FRONTEND_URL=https://app.azvdodesigner.site
PORT=4000

DB_HOST=localhost
DB_DIALECT=postgres
DB_USER=azvdodesigner
DB_PASS=123456
DB_NAME=azvdodesigner
DB_PORT=5432

REDIS_URI=redis://:123456@127.0.0.1:5000
```

---

### Passo 4 — Compilar o backend

```bash
cd /home/deploy/azChat/backend
npm install          # instala/atualiza dependências se necessário
npm run build        # compila TypeScript → dist/
```

Verifique que a pasta `dist/` foi criada:
```bash
ls /home/deploy/azChat/backend/dist/
```

---

### Passo 5 — Rodar as migrations

```bash
cd /home/deploy/azChat/backend
npx sequelize db:migrate
```

> Isso aplica apenas as migrations novas (Sequelize controla o que já rodou via tabela `SequelizeMeta`).
> A migration nova nesta versão é: `20260426120000-clear-lid-numbers-from-contacts`

---

### Passo 6 — Compilar o frontend

```bash
cd /home/deploy/azChat/frontend
npm install          # se necessário
npm run build        # gera a pasta build/
```

Verifique que a pasta `build/` foi criada:
```bash
ls /home/deploy/azChat/frontend/build/
```

---

### Passo 7 — Iniciar os processos com PM2

```bash
# Iniciar o backend via ecosystem.config.js
cd /home/deploy/azChat/backend
pm2 start ecosystem.config.js

# Iniciar o frontend
cd /home/deploy/azChat/frontend
pm2 start server.js --name "azvdodesigner-frontend"

# Salvar o estado atual do PM2 (para persistir após reboot)
pm2 save
```

Confira que os dois estão rodando:
```bash
pm2 list
```

---

### Passo 8 — Verificar o Nginx

O Nginx já está configurado apontando para `localhost:3000` e `localhost:4000`.  
Como o azChat usa as mesmas portas, **nenhuma mudança no Nginx é necessária**.

Verifique se está OK:
```bash
sudo nginx -t
sudo systemctl status nginx
```

---

### Passo 9 — Testar

```bash
# Backend responde?
curl -s http://localhost:4000/health || curl -s http://localhost:4000/

# Frontend responde?
curl -s http://localhost:3000 | head -5
```

Acesse no navegador:
- `https://app.azvdodesigner.site` — frontend
- `https://api.azvdodesigner.site` — backend (API)

---

## Atualizações futuras (após já estar rodando)

```bash
cd /home/deploy/azChat

# 0. Backup antes de tudo
mkdir -p /home/deploy/backups
PGPASSWORD=123456 pg_dump -U azvdodesigner -h localhost -d azvdodesigner \
  -F c -f /home/deploy/backups/azvdodesigner_$(date +%Y%m%d_%H%M%S).dump

# 1. Atualizar código
git pull

# 2. Backend
cd backend
npm install
rm -rf dist
npm run build
npx sequelize db:migrate

# 3. Frontend
cd ../frontend
npm install
rm -rf build
npm run build

# 4. Reiniciar
pm2 restart all
```

---

## Diagnóstico rápido

| Problema                  | Comando de diagnóstico                            |
|---------------------------|---------------------------------------------------|
| Ver logs do backend       | `pm2 logs multipremium-back`                      |
| Ver logs do frontend      | `pm2 logs azvdodesigner-frontend`                 |
| Backend caiu?             | `pm2 restart multipremium-back`                   |
| Nginx com problema?       | `sudo nginx -t && sudo journalctl -u nginx -n 50` |
| Redis rodando?            | `docker ps \| grep redis`                         |
| Banco rodando?            | `systemctl status postgresql@18-main`             |
| Portas em uso?            | `ss -tlnp \| grep -E '3000\|4000\|5000\|5432'`    |
| Listar backups            | `ls -lht /home/deploy/backups/`                   |
| Conexões Postgres ativas  | veja seção "Pool de conexões" abaixo              |

---

## Pool de conexões do Postgres (importante!)

### O sintoma

Mensagens não enviam, ficam travadas no input. Backend retorna `ERR_WAPP_NOT_INITIALIZED`. Logs mostram:
```
FATAL: sorry, too many clients already
SequelizeUniqueConstraintError ...
```

### A causa

O backend foi originalmente configurado em **cluster mode** com `instances: 'auto'` (2 instâncias em CPU dual-core), mas isso causa problemas para apps com Baileys/Socket.io — duas sessões WhatsApp acabam disputando estado via Redis e geram `stream errored (replaced)`. **Migramos para `fork` com 1 instância** (ver `ecosystem.config.js`).

Mesmo em fork, o pool ainda precisa ser dimensionado contra o limite do Postgres. Cada instância **abre seu próprio pool do Sequelize**.

O `src/config/database.ts` define:
```js
pool: {
  max: parseInt(process.env.DB_POOL_MAX) || 100,
  min: parseInt(process.env.DB_POOL_MIN) || 15,
  acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
  idle: parseInt(process.env.DB_POOL_IDLE) || 600000
}
```

Sem `DB_POOL_MAX` no `.env`: cada instância podia abrir até **100 conexões** → `2 × 100 = 200`.  
Mas o Postgres está em `max_connections = 100` → **estoura**, backend entra em crashloop, WhatsApp não inicializa.

### Quem consome essas conexões (mesmo sem usuários)

Não é "1 usuário = 1 conexão". O pool **mantém estoque vivo** mesmo ocioso. Quem usa:

| Origem                                          | Frequência         |
|-------------------------------------------------|--------------------|
| Cron de Campaigns (`SELECT FROM "Campaigns"`)   | A cada minuto      |
| Cron de mensagens agendadas (`Schedules`)       | A cada minuto      |
| `StartAllWhatsAppsSessions`                     | Periódico          |
| Workers do Bull (filas Redis → Postgres)        | Por job            |
| Listener do Baileys (salva contatos/mensagens)  | Por mensagem       |
| Verificação de assinaturas/empresas             | Periódico          |
| `min: 15` mantém 15 conexões abertas direto     | Sempre             |
| **Tudo isso × 2 instâncias do cluster**         | -                  |

### A correção (já aplicada)

No `/home/deploy/azChat/backend/.env`:
```
DB_POOL_MAX=60
DB_POOL_MIN=5
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000
```

Em fork com 1 instância, o teto vira `60` conexões — folga de 40 sobre o limite de 100 do Postgres.  
**Se voltar para cluster ou mudar `instances` no `ecosystem.config.js`, recalcule:** `DB_POOL_MAX × instances + 20 ≤ max_connections`.

### Comandos de diagnóstico do pool

```bash
# Quantas conexões o Postgres está aceitando no momento
PGPASSWORD=123456 psql -U azvdodesigner -h localhost -d azvdodesigner -c "
SELECT state, COUNT(*) FROM pg_stat_activity
WHERE datname='azvdodesigner' GROUP BY state;
"

# Limite configurado no Postgres
sudo grep -E "^max_connections" /etc/postgresql/18/main/postgresql.conf

# Ver últimas queries (útil pra entender se algo está travando)
PGPASSWORD=123456 psql -U azvdodesigner -h localhost -d azvdodesigner -c "
SELECT pid, state, NOW() - state_change AS idle_time, LEFT(query, 80)
FROM pg_stat_activity WHERE datname='azvdodesigner'
ORDER BY state_change DESC LIMIT 20;
"

# Ver quantas conexões TCP estão abertas no porto 5432
ss -tn state established '( sport = :5432 or dport = :5432 )' | wc -l
```

### Como aplicar a correção em outro ambiente (ex: dev)

1. Adicione as 4 linhas `DB_POOL_*` no `.env` do backend.
2. Reinicie com `--update-env` (sem isso o PM2 não recarrega variáveis):
   ```bash
   pm2 restart multipremium-back --update-env
   ```

---

## Permissões: rodar tudo como `deploy`

### Por que isso importa

Os processos do PM2 (backend e frontend) rodam como `deploy`. Se algum arquivo ou pasta do projeto for de propriedade de outro usuário (ex: `root`), o backend ao tentar escrever ali toma `EACCES: permission denied` — e como muitos lugares do código não tratam essa Promise rejeitada, vira `unhandledRejection`. A request HTTP **fica pendurada sem responder**, o frontend trava (input apagado, botão bloqueado).

Esses dois sintomas costumam aparecer juntos quando alguém rodou comandos como root:
- Mensagens enviam para o WhatsApp (chega no celular do cliente) mas o frontend trava.
- Logs do backend cheios de `EACCES: permission denied, open '...public/company*/contacts/...'`.

### Diagnóstico

```bash
# Ver tudo que NÃO pertence ao deploy (ignorando node_modules para ir rápido)
find /home/deploy/azChat -not -user deploy -not -path "*/node_modules/*"

# Diagnóstico mais focado
ls -la /home/deploy/azChat/backend/.env
ls -la /home/deploy/azChat/backend/dist/ | head
ls -la /home/deploy/azChat/backend/public/company*/ | head
```

Se a coluna do owner mostrar `root` em qualquer lugar — corrigir.

### Correção

```bash
sudo chown -R deploy:deploy \
  /home/deploy/azChat/backend/public \
  /home/deploy/azChat/backend/dist \
  /home/deploy/azChat/backend/src \
  /home/deploy/azChat/backend/.env \
  /home/deploy/azChat/frontend/build \
  /home/deploy/azChat/DEPLOY.md
```

Ajuste a lista conforme o que o `find` encontrar.

### Detectar PM2 duplicado (root + deploy)

Se o PM2 do `root` foi acionado ao menos uma vez (ex: `pm2 restart` num shell de root), ele se torna um daemon separado e disputa a mesma porta com o PM2 do `deploy` — causando `EADDRINUSE: bind null:4000` em loop.

```bash
# Os dois daemons existem se houver duas instâncias dessas rodando
ps aux | grep -E "PM2 v.*God Daemon" | grep -v grep

# Ver lista do PM2 de cada usuário
pm2 list                          # daemon do usuário atual
sudo -u deploy pm2 list           # daemon do deploy
```

Se houver dois: parar o do root (logado como root):
```bash
pm2 delete all
pm2 kill
```

E garantir que só o do `deploy` esteja rodando:
```bash
sudo -u deploy bash -c "cd /home/deploy/azChat/backend && pm2 start ecosystem.config.js"
sudo -u deploy bash -c "cd /home/deploy/azChat/frontend && pm2 start server.js --name azvdodesigner-frontend"
sudo -u deploy pm2 save
```

### Comandos seguros quando você está como root

| O que fazer                      | Comando                                                                 |
|----------------------------------|-------------------------------------------------------------------------|
| Rodar build do backend           | `sudo -u deploy bash -c "cd /home/deploy/azChat/backend && npm run build"` |
| Rodar build do frontend          | `sudo -u deploy bash -c "cd /home/deploy/azChat/frontend && npm run build"` |
| Rodar migrations                 | `sudo -u deploy bash -c "cd /home/deploy/azChat/backend && npx sequelize db:migrate"` |
| Listar PM2 do projeto            | `sudo -u deploy pm2 list`                                               |
| Ver logs                         | `sudo -u deploy pm2 logs multipremium-back`                             |
| Restart com env nova             | `sudo -u deploy pm2 restart multipremium-back --update-env`             |
| Editar arquivos do projeto       | `sudo -u deploy nano /home/deploy/azChat/backend/.env` (ou similar)     |

Em caso de dúvida: `su - deploy` e trabalhe a partir daí.

---

## Estrutura de arquivos relevantes

```
/home/deploy/azChat/
├── backend/
│   ├── .env                    ← variáveis de ambiente (DB, Redis, URLs)
│   ├── ecosystem.config.js     ← config do PM2 (nome: multipremium-back)
│   ├── src/                    ← código TypeScript fonte
│   ├── dist/                   ← código compilado (gerado pelo build)
│   └── src/database/migrations/← migrations Sequelize
├── frontend/
│   ├── .env                    ← REACT_APP_BACKEND_URL e outras vars
│   ├── server.js               ← Express que serve o build React
│   ├── src/                    ← código React fonte
│   └── build/                  ← build React (gerado pelo npm run build)
└── DEPLOY.md                   ← este arquivo

/home/deploy/backups/           ← dumps do PostgreSQL (.dump)

/etc/nginx/sites-enabled/
├── azvdodesigner-backend       ← proxy api.azvdodesigner.site → :4000
└── azvdodesigner-frontend      ← proxy app.azvdodesigner.site → :3000
```

---

## Redis — como foi criado

O container Docker do Redis foi iniciado manualmente com:
```bash
docker run -d \
  --name redis-azvdodesigner \
  --restart always \
  -p 5000:6379 \
  redis redis-server --requirepass 123456
```
A porta **5000** no host mapeia para **6379** dentro do container.  
Por isso o `.env` usa `REDIS_URI=redis://:123456@127.0.0.1:5000`.
