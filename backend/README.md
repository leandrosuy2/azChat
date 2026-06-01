# azChat – Backend

API REST + WebSocket do azChat, construída com **Node.js**, **TypeScript**, **Express**, **Sequelize** (PostgreSQL) e **Bull** (Redis).

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|---------------|
| Node.js    | 20            |
| npm        | 9.x           |
| Docker + Docker Compose | qualquer versão recente |
| PostgreSQL  | 15 (ou via Docker) |
| Redis       | 7 (ou via Docker)  |

---

## 1. Subindo PostgreSQL e Redis com Docker

O arquivo `docker-compose.yml` na raiz do `backend/` já inclui os dois serviços configurados com as credenciais padrão do `.env.dev`.

```bash
# a partir de backend/
docker compose up -d
```

Para verificar se estão saudáveis:

```bash
docker compose ps
```

Para encerrar:

```bash
docker compose down          # mantém os volumes
docker compose down -v       # destrói os volumes (apaga dados)
```

---

## 2. Variáveis de ambiente

O arquivo `.env.dev` contém todas as variáveis necessárias para desenvolvimento local já preenchidas com valores padrão compatíveis com o `docker-compose.yml`.

### Usando `.env.dev` diretamente (sem copiar para `.env`)

O bootstrap da aplicação respeita a variável de ambiente `DOTENV_PATH`. Basta prefixá-la ao comando:

```bash
DOTENV_PATH=.env.dev npm run dev
```

Você pode exportar no shell para não precisar repetir:

```bash
export DOTENV_PATH=.env.dev
npm run dev
```

Ou adicionar um script no seu `package.json` local (não versionado):

```json
"dev:local": "DOTENV_PATH=.env.dev npm run dev"
```

> **Comportamento de fallback:**
> Se `DOTENV_PATH` não for definida, a aplicação carrega `.env` (comportamento padrão).
> Se `NODE_ENV=test`, carrega `.env.test`.

---

## 3. Instalando dependências

```bash
npm install
```

---

## 4. Executando as migrations e seeds

As migrations exigem que o TypeScript já tenha sido compilado. Rode em sequência:

```bash
DOTENV_PATH=.env.dev npm run db:migrate:build
DOTENV_PATH=.env.dev npm run db:seed
```

O seed cria os dados iniciais obrigatórios:
- **Empresa 1** (companyId=1)
- **Usuário admin** → `admin@admin.com` / `123456`
- **Settings padrão** (cores, logo, nome, configurações de atendimento)

> As seeds verificam se os dados já existem antes de inserir, portanto são seguras de rodar novamente.

---

## 5. Rodando em desenvolvimento

```bash
DOTENV_PATH=.env.dev npm run dev
```

O servidor inicia na porta definida em `PORT` (padrão `4000`).
Acesse: [http://localhost:4000](http://localhost:4000)

O painel de filas (Bull Board) fica disponível em `/queues` com autenticação básica (`BULL_USER` / `BULL_PASS`).

---

## 6. Build de produção

```bash
npm run build
```

Os arquivos compilados são gerados em `dist/`.

### Iniciando em produção com PM2

```bash
npm run build
npm run db:migrate
pm2 start ecosystem.config.js
```

Para verificar o status:

```bash
pm2 status
pm2 logs multipremium-back
```

---

## 7. Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Servidor em modo watch (ts-node-dev) |
| `npm run build` | Compila TypeScript → `dist/` |
| `npm start` | Inicia `dist/server.js` com nodemon |
| `npm run db:migrate` | Executa migrations Sequelize |
| `npm run db:migrate:build` | Build + migrate em sequência |
| `npm run db:seed` | Popula o banco com seeds |
| `npm test` | Roda testes Jest |
| `npm run lint` | ESLint no código TypeScript |

---

## 8. Estrutura principal

```
backend/
├── src/
│   ├── app.ts               # Express app + middlewares
│   ├── server.ts            # Entry point (HTTP + sockets)
│   ├── bootstrap.ts         # Carrega .env via DOTENV_PATH
│   ├── config/              # database, auth, redis, uploads
│   ├── controllers/         # Handlers HTTP
│   ├── models/              # Modelos Sequelize
│   ├── services/            # Regras de negócio
│   ├── routes/              # Definição de rotas
│   ├── jobs/                # Jobs Bull
│   ├── queues/              # Configuração Bull
│   ├── middleware/          # Auth, validações
│   └── database/
│       ├── migrations/      # Migrations Sequelize
│       └── seeds/           # Seeds
├── docker-compose.yml       # PostgreSQL + Redis para dev
├── .env.dev                 # Variáveis de desenvolvimento
├── .env                     # Variáveis de produção (não versionar)
├── ecosystem.config.js      # Config PM2
└── .sequelizerc             # Config paths Sequelize
```

---

## 9. Variáveis de ambiente – referência

| Variável | Obrigatória | Descrição |
|----------|:-----------:|-----------|
| `PORT` | ✓ | Porta HTTP do servidor |
| `BACKEND_URL` | ✓ | URL pública do backend |
| `FRONTEND_URL` | ✓ | URL pública do frontend |
| `DB_HOST` | ✓ | Host PostgreSQL |
| `DB_PORT` | ✓ | Porta PostgreSQL |
| `DB_USER` | ✓ | Usuário PostgreSQL |
| `DB_PASS` | ✓ | Senha PostgreSQL |
| `DB_NAME` | ✓ | Nome do banco |
| `REDIS_URI` | ✓ | URI do Redis (ex: `redis://:senha@host:porta`) |
| `JWT_SECRET` | ✓ | Segredo JWT de acesso |
| `JWT_REFRESH_SECRET` | ✓ | Segredo JWT de refresh |
| `MASTER_KEY` | ✓ | Chave mestra da aplicação |
| `BULL_USER` | – | Usuário do painel Bull Board |
| `BULL_PASS` | – | Senha do painel Bull Board |
| `SMTP_HOST` | – | Host SMTP para e-mails |
| `SMTP_USER` | – | Usuário SMTP |
| `SMTP_PASS` | – | Senha SMTP |
| `MP_ACCESS_TOKEN` | – | Token Mercado Pago |
| `GERENCIANET_*` | – | Credenciais Gerencianet/PIX |
| `SENTRY_DSN` | – | DSN do Sentry (monitoramento) |
| `DEMO` | – | Ativa modo demo (`ON`/`OFF`) |
| `SOCKET_ADMIN` | – | Habilita Socket.IO Admin UI |

Consulte `.env.dev` para a lista completa com descrições.
