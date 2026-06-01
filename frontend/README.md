# PrimataZap – Frontend

Interface web do **PrimataZap** (sistema de multi-atendimento para WhatsApp). Aplicação em React que consome a API do backend.

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
