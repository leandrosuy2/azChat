# azChat – Frontend

Interface web do azChat, construída com **React** (Create React App) e **Material-UI**.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|---------------|
| Node.js    | 20.x          |
| npm        | 9.x           |

---

## 1. Instalando dependências

```bash
npm install --legacy-peer-deps
```

> `--legacy-peer-deps` é necessário por conflitos de peer deps entre Material-UI v4 e v5.

---

## 2. Variáveis de ambiente

O CRA carrega arquivos de env na seguinte ordem de prioridade (valores mais acima sobrescrevem os de baixo):

```
.env.development.local   ← apenas local, nunca versionar
.env.local               ← apenas local, nunca versionar
.env.development         ← dev (já versionado no projeto)
.env                     ← base (produção / fallback)
```

### Desenvolvimento local

O arquivo `.env.development` já está configurado apontando para `http://localhost:4000` (backend local via Docker).
**Não é necessário copiar nem editar nada** — o CRA o carrega automaticamente no `npm start`.

Se quiser sobrescrever algum valor só na sua máquina sem afetar o repositório, crie `.env.development.local`:

```bash
# .env.development.local  ← não é versionado
REACT_APP_BACKEND_URL=http://192.168.0.10:4000
```

### Variáveis disponíveis

| Variável | Descrição |
|----------|-----------|
| `REACT_APP_BACKEND_URL` | URL completa do backend |
| `REACT_APP_HOURS_CLOSE_TICKETS_AUTO` | Horas para fechar tickets automaticamente |
| `REACT_APP_LOCALE` | Locale da aplicação (ex: `pt-br`) |
| `REACT_APP_TIMEZONE` | Timezone (ex: `America/Sao_Paulo`) |
| `REACT_APP_NUMBER_SUPPORT` | Número WhatsApp de suporte |
| `REACT_APP_FACEBOOK_APP_ID` | App ID do Facebook (opcional) |
| `GENERATE_SOURCEMAP` | Gera source maps no build (`true`/`false`) |
| `DISABLE_ESLINT_PLUGIN` | Desabilita ESLint no build do CRA |
| `HTTPS` | Habilita HTTPS no servidor de dev |

> **Importante:** todas as variáveis expostas ao React **devem** começar com `REACT_APP_`.

---

## 3. Rodando em desenvolvimento

```bash
npm start
```

O app abre em [http://localhost:3000](http://localhost:3000) com hot-reload.
O `.env.development` é carregado automaticamente.

---

## 4. Build de produção

```bash
npm run build
```

Os arquivos estáticos são gerados em `build/`.
O `.env` (base) é o arquivo carregado no build de produção.
Para sobrescrever valores de produção localmente sem versionar, use `.env.production.local`.

---

## 5. Scripts disponíveis

| Script | Descrição |
|--------|-----------|
| `npm start` | Servidor de desenvolvimento com hot-reload |
| `npm run build` | Build otimizado para produção (`build/`) |
| `npm run builddev` | Build com source maps habilitados |
| `npm test` | Roda os testes |

---

## 6. Estrutura principal

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.js
│   ├── config.js          # Lê variáveis via process.env / window.ENV (Docker)
│   ├── index.js
│   ├── components/        # Componentes reutilizáveis
│   ├── pages/             # Páginas da aplicação
│   ├── context/           # Contextos React
│   ├── services/          # Chamadas à API
│   ├── routes/            # Definição de rotas
│   └── translate/         # i18n
├── .env                   # Base / produção
├── .env.development       # Desenvolvimento (carregado automaticamente no npm start)
└── build/                 # Saída do build (não versionar)
```

---

## O que é

- Painel para atendentes, filas, conversas, campanhas e configurações.
- Desenvolvido com React, Material-UI e demais dependências do `package.json`.

---

## Pré-requisitos

- **Node.js** (v16+)
- **npm** ou **yarn**
- Backend da API já rodando (URL configurada no `.env`)

---

## Como rodar em desenvolvimento

```bash
npm install
```

Configure o `.env` (copie de `.env.example` se existir). O principal:

- `REACT_APP_BACKEND_URL` = URL do backend (ex.: `http://localhost:4000`)

Depois:

```bash
npm start
```

A aplicação abre em `http://localhost:3000`.

---

## Build para produção

```bash
npm run build
```

Gera a pasta `build/` com os arquivos estáticos.

---

## Aplicar no servidor (PM2)

Depois do build, no servidor:

```bash
npm run build
pm2 restart azvdodesigner-frontend
```

---

## Variáveis de ambiente (.env)

| Variável | Descrição |
|----------|-----------|
| `REACT_APP_BACKEND_URL` | URL da API (ex.: `http://localhost:4000` ou `https://api.seudominio.com`) |
| `REACT_APP_LOCALE` | Idioma (ex.: `pt-br`) |
| Outras | Ver `.env.example` ou arquivo `.env` do projeto |
