# Backend – Tudo para o Quadro Kanban funcionar

Este documento reúne **tudo** que o backend precisa implementar para o Quadro Kanban (cards, modal, anexos, trocar cliente, logs) funcionar com o frontend.

---

## Atualização (valores + excluir anexo + capa no card)

- **Quadro:** incluir no modelo e no GET do quadro os campos `valorServico` e `valorEntrada` (decimal). Novo **PUT** `/tickets/:ticketId/quadro` com body `{ valorServico, valorEntrada }` para salvar.
- **Excluir anexo:** o front chama **DELETE** `/tickets/:ticketId/quadro/attachments/:attachmentId` (com `ticketId` numérico). Implementar remoção do registro e, se quiser, do arquivo.
- **Thumbnail no card:** na resposta de **GET /ticket/kanban**, opcionalmente incluir em cada ticket o campo `quadroCapaUrl` (ou `capaUrl`) com a URL do anexo marcado como capa do quadro, para o card exibir a capa em vez da foto do contato.
- **Nome do Projeto no card:** na listagem **GET /ticket/kanban**, incluir em cada ticket o campo `nomeProjeto` (ou `nomeEmpresa` / `quadroNomeProjeto`) quando o quadro tiver esse dado preenchido, para exibir no card acima do nome do contato.
- **Campos personalizados:** no Quadro, aceitar e persistir `customFields` (array de `{ name, value, type: "text"|"link" }`). No GET do quadro e na listagem **GET /ticket/kanban** retornar `customFields`. Na listagem, incluir por ticket `quadroValorServico`, `quadroValorEntrada` e `quadroCustomFields` para o card exibir valores e "Falta pagar" + campos personalizados.
- **Compartilhar card com outras áreas (grupos de quadro):**
  - **GET /quadro-groups** — listar áreas (ex.: Produção, Financeiro, Designer). Resposta: `{ groups: [{ id, name }] }` ou `{ lista: [...] }`. O front usa fallback local se o endpoint não existir.
  - **GET /ticket/kanban** — aceitar query `quadroGroupId`; retornar apenas tickets que pertencem ou estão compartilhados com essa área. Em cada ticket, incluir `quadroSharedGroupIds` (ou `sharedQuadroGroupIds`) com os ids das áreas onde o card está compartilhado.
  - **POST /tickets/:ticketId/quadro/share** — body `{ groupIds: [2, 3] }`. Associar o ticket às áreas indicadas (além da área de origem). Assim o mesmo card aparece em Produção, Financeiro, Designer etc.; alterações no quadro (status, valores, campos) são do ticket e refletem em todas as áreas.

---

## Resumo das rotas novas/alteradas

| Ação | Método | URL | Body |
|------|--------|-----|------|
| Trocar cliente do ticket | PUT | `/tickets/:ticketId/contact` | `{ "contactId": number }` |
| Registrar log (drag) | POST | `/tickets/:ticketId/quadro/log` | `{ fromLaneId?, toLaneId?, fromLabel?, toLabel? }` |
| Histórico de logs | GET | `/tickets/:ticketId/quadro/logs` | - |

**No front:**  
- **GET** `/tickets/:ticketUuid/quadro` (abrir modal) e **GET** `/tickets/:ticketId/quadro/logs` (histórico) — quadro por UUID, logs por ticketId.  
- Trocar cliente, status, descrição, anexos e capa usam **ticketId**.

---

## Índice

1. [O que já existe e o que você precisa criar](#1-o-que-já-existe-e-o-que-você-precisa-criar)
2. [Listagem Kanban – foto do contato no card](#2-listagem-kanban--foto-do-contato-no-card)
3. [Tabelas / modelos sugeridos](#3-tabelas--modelos-sugeridos)
4. [Endpoints – detalhamento](#4-endpoints--detalhamento)
5. [Resumo rápido (tabela)](#5-resumo-rápido-tabela)
6. [Ordem sugerida de implementação](#6-ordem-sugerida-de-implementação)
7. [Checklist final](#7-checklist-final)

---

## 1. O que já existe e o que você precisa criar

### Já existem (só conferir)

| Recurso | Endpoint / dado | O que garantir |
|--------|------------------|----------------|
| Lista de tickets do Kanban | `GET /ticket/kanban` (queueIds, startDate, endDate) | Resposta com `tickets[]` e cada ticket com `contact` **incluindo** `urlPicture` ou `profilePicUrl` para a foto do card. |
| Dados do ticket (abrir modal/chat) | `GET /tickets/u/:uuid` | Retorno com `contact`, `queue`, `user`, `whatsapp`; `contact` com `urlPicture` e/ou `profilePicUrl`. |
| Mover card entre colunas (tags) | `PUT /ticket-tags/:ticketId/:tagId` e `DELETE /ticket-tags/:ticketId` | Já usados pelo front ao arrastar o card. |
| Lista de tags (colunas) | `GET /tag/kanban/` | Retorno com tags (id, name, color) para montar as colunas. |
| Busca de contatos | `GET /contacts?searchParam=...` | Usado no “Trocar cliente” do modal Quadro. |

### Você precisa criar

| Recurso | O que implementar |
|--------|-------------------|
| **Quadro** (status + descrição por ticket) | Tabela + GET/PUT (ou PATCH) para status e descrição. |
| **Anexos do quadro** | Tabela + upload (POST), listagem no GET do quadro, marcar capa (PATCH), opcional DELETE. |
| **Trocar cliente do ticket** | `PUT /tickets/:ticketId/contact` com `{ contactId }`. |
| **Log de mudança de coluna** | Tabela de logs + `POST /tickets/:ticketId/quadro/log` ao arrastar; opcional GET de histórico. |

---

## 2. Listagem Kanban – foto do contato no card

O front monta os **cards** com a foto do contato ou, se existir, com a **capa do quadro**.

- Na resposta de **`GET /ticket/kanban`**, cada item de `tickets[]` deve ter `contact` com **pelo menos um** destes campos preenchidos:
  - `contact.urlPicture` – ex.: URL completa ou path como `"/public/company1/contacts/123.jpeg"`.
  - `contact.profilePicUrl` – ex.: foto do WhatsApp.

**Thumbnail da capa no card (opcional):** se o backend incluir em cada ticket o campo **`quadroCapaUrl`** (ou `capaUrl`) com a URL do anexo marcado como capa do quadro, o front usa essa imagem no card em vez da foto do contato. Caso não exista quadro/capa, o card continua usando a foto do contato.

- Para preencher `quadroCapaUrl`: na montagem da listagem do Kanban, para cada ticket que tiver quadro com um anexo `isCapa === true`, colocar em `ticket.quadroCapaUrl` a URL desse anexo (ex.: `baseURL + "/public/" + path` ou a URL já absoluta).

O front trata assim:

- Se vier URL completa (`http://` ou `https://`), usa direto.
- Se vier path (ex.: `/public/...`), o front concatena com `REACT_APP_BACKEND_URL`.
- Corrige porto duplicado (ex.: `localhost:4000:443` → `localhost:4000`).

**Recomendação:** na listagem do Kanban, incluir no `contact` pelo menos `id`, `name`, `number`, `urlPicture` (e, se tiver, `profilePicUrl`). Se quiser capa no card, incluir `quadroCapaUrl` (ou `capaUrl`) por ticket quando houver capa.

---

## 3. Tabelas / modelos sugeridos

### Quadro (1 por ticket)

```text
quadro / ticket_quadro
- id (PK)
- ticketId (FK → tickets, UNIQUE)
- status (string: "aguardando" | "em_producao" | "entregue" | "cancelado")
- description (text, nullable)  // HTML do editor
- valorServico (decimal, nullable)  // valor do serviço
- valorEntrada (decimal, nullable)  // valor de entrada; saldo = valorServico - valorEntrada
- nomeProjeto (string, nullable)    // nome do projeto/empresa (exibido no card e editável no modal)
- customFields (JSON, nullable)     // array de { name, value, type: "text"|"link" } (ex.: Nome da fonte, Endereço, links)
- createdAt, updatedAt
```

### QuadroAnexo (N por ticket)

```text
quadro_anexo / ticket_quadro_attachment
- id (PK)
- ticketId (FK → tickets)   // ou quadroId (FK → quadro)
- name (string)             // nome original do arquivo
- path (string)             // caminho no disco, ex.: "company1/quadro/8/arquivo.pdf"
- isCapa (boolean, default false)
- createdAt
```

Ao retornar para o front, montar `url` completo (ex.: `baseURL + "/public/" + path`).

### QuadroStatusLog (histórico do drag)

```text
quadro_status_log
- id (PK)
- ticketId (FK → tickets)
- fromLaneId (string)   // "lane0" ou id da tag
- toLaneId (string)
- fromLabel (string, opcional)  // "Em aberto", "Produção"
- toLabel (string, opcional)
- userId (FK → users)
- createdAt
```

---

## 4. Endpoints – detalhamento

**Base:** considerar sempre autenticação e que o ticket pertence à `companyId` do usuário (e filas permitidas).

**UUID vs ID:** o front usa `ticketUuid` nas rotas do Quadro (ex.: `/tickets/:ticketUuid/quadro`) e em alguns lugares envia `ticketId` (número) no body ou em outras rotas. Resolver no backend por UUID quando a rota tiver `:ticketUuid`.

---

### 4.1 GET `/tickets/:ticketUuid/quadro`

Carrega tudo para abrir o modal Quadro (ticket, quadro, anexos).

**Response 200**

```json
{
  "ticket": {
    "id": 8,
    "uuid": "c19fa663-4ea3-487a-84c4-02d2a4bd7a16",
    "contact": {
      "id": 20,
      "name": "Rodrigo Azevedo - Spot",
      "number": "146875533533373",
      "urlPicture": "http://localhost:4000/public/company1/contacts/1771268074577.jpeg",
      "profilePicUrl": "https://pps.whatsapp.net/..."
    },
    "queue": { "id": 2, "name": "Dev", "color": "#CC2B2B" },
    "user": { "id": 1, "name": "Admin" },
    "whatsapp": { "id": 2, "name": "RF Personalizados" }
  },
  "quadro": {
    "ticketId": 8,
    "status": "aguardando",
    "description": "<p>PLACA EM PVC ADESIVADA COM FITA DUPLA FACE ATRÁS</p>",
    "valorServico": 1500.00,
    "valorEntrada": 500.00,
    "nomeProjeto": "Placa RF Personalizados",
    "customFields": [
      { "name": "Nome da fonte", "value": "Fonte X", "type": "text" },
      { "name": "Link da arte", "value": "https://...", "type": "link" }
    ],
    "updatedAt": "2026-02-16T18:54:34.670Z"
  },
  "attachments": [
    {
      "id": 1,
      "name": "PLACA EM PVC ADESIVADA 100X100.pdf",
      "url": "http://localhost:4000/public/company1/quadro/8/arquivo1.pdf",
      "isCapa": true,
      "createdAt": "2026-02-16T18:00:00.000Z"
    }
  ]
}
```

- Se não existir registro de quadro para o ticket: `quadro: null`, `attachments: []`.
- **Capa no modal:** o front usa o anexo com `isCapa === true`; se não houver, usa `ticket.contact.urlPicture` ou `profilePicUrl`.

---

### 4.2 PUT `/tickets/:ticketUuid/quadro/status`

**Body**

```json
{
  "status": "em_producao"
}
```

Valores: `"aguardando"` | `"em_producao"` | `"entregue"` | `"cancelado"`.

**Response 200** (opcional): objeto `quadro` atualizado. Ou 204.

---

### 4.3 PUT `/tickets/:ticketUuid/quadro/description`

**Body**

```json
{
  "description": "<p>PLACA EM PVC ADESIVADA...</p><p>Dimensões: 100x100 cm</p>"
}
```

`description` é HTML (saída do editor rico).

**Response 200** (opcional): objeto `quadro`. Ou 204.

---

### 4.4 POST `/tickets/:ticketUuid/quadro/attachments`

**Content-Type:** `multipart/form-data`  
**Campo do arquivo:** `file`

- Salvar em disco (ex.: `public/company{id}/quadro/{ticketId}/`) e gravar registro em QuadroAnexo.
- Se for o primeiro anexo do ticket, pode setar `isCapa: true`.

**Response 201**

```json
{
  "attachment": {
    "id": 3,
    "name": "nova-arte.png",
    "url": "http://localhost:4000/public/company1/quadro/8/nova-arte.png",
    "isCapa": false,
    "createdAt": "2026-02-16T19:20:00.000Z"
  }
}
```

`url` deve ser acessível pelo front (mesmo domínio ou CORS).

---

### 4.5 PATCH `/tickets/:ticketUuid/quadro/attachments/:attachmentId/capa`

- Marcar o anexo `attachmentId` como capa e **desmarcar** os demais do mesmo ticket (`isCapa = false`).

**Response 200** (opcional): lista atualizada de `attachments`. Ou 204.

---

### 4.6 DELETE `/tickets/:ticketId/quadro/attachments/:attachmentId`

O front chama com **ticketId** (número). Remover registro e, se quiser, arquivo do disco. Se o anexo era a capa, o front passa a usar o primeiro anexo restante ou a foto do contato.

**Response 204** (ou 200 sem body).

---

### 4.6.1 PUT `/tickets/:ticketId/quadro/attachments/:attachmentId/rename` (opcional)

Usado pelo front para **renomear** um anexo (nome de exibição/arquivo).

**Body**

```json
{
  "name": "novo-nome-do-arquivo.pdf"
}
```

- Atualizar o campo `name` do anexo (QuadroAnexo ou equivalente) para o valor enviado.
- Validar que o anexo pertence ao ticket e à company.

**Response 200** (objeto attachment atualizado) ou 204.

---

### 4.7 PUT `/tickets/:ticketId/quadro` (valores)

Usado pelo front para salvar **Valor do Serviço** e **Valor de Entrada** (saldo restante é calculado no front: valorServico − valorEntrada).

**Body**

```json
{
  "valorServico": 1500.00,
  "valorEntrada": 500.00,
  "nomeProjeto": "Placa RF Personalizados",
  "customFields": [
    { "name": "Nome da fonte", "value": "Fonte X", "type": "text" },
    { "name": "Link da arte", "value": "https://...", "type": "link" }
  ]
}
```

- Atualizar no registro do Quadro os campos `valorServico`, `valorEntrada`, `nomeProjeto` e `customFields` (opcional).
- Aceitar apenas esses campos neste endpoint ou estender o payload conforme sua API (ex.: aceitar também `description`/`status` no mesmo PUT).

**Response 200** (objeto quadro atualizado) ou 204.

---

### 4.8 PUT `/tickets/:ticketId/contact`

Usado no “Trocar cliente” do modal Quadro.

**Body**

```json
{
  "contactId": 25
}
```

- Atualizar `tickets.contactId` para o novo contato.
- Validar que o contato pertence à mesma company.

**Response 200:** ticket atualizado (com novo `contact`) ou 204.

---

### 4.9 POST `/tickets/:ticketId/quadro/log`

Chamado pelo front quando o usuário **arrasta o card** para outra coluna (além da chamada que já existe de tag).

**Body**

```json
{
  "fromLaneId": "lane0",
  "toLaneId": "3",
  "fromLabel": "Em aberto",
  "toLabel": "Produção"
}
```

- Gravar em **QuadroStatusLog** (ticketId, fromLaneId, toLaneId, userId do token, createdAt). `fromLabel`/`toLabel` são opcionais mas úteis para exibir histórico.

**Response 200** ou 204. Se o endpoint ainda não existir, o front não bloqueia (só não grava log).

---

### 4.10 GET `/tickets/:ticketId/quadro/logs` (opcional)

Para exibir “Histórico” de mudanças de coluna no modal.

**Response 200**

```json
{
  "logs": [
    {
      "id": 1,
      "fromLabel": "Em Produção",
      "toLabel": "Entregue",
      "userName": "Admin",
      "createdAt": "2026-02-10T14:32:00.000Z"
    }
  ]
}
```

---

## 5. Resumo rápido (tabela)

| Ação | Método | URL | Body |
|------|--------|-----|------|
| Abrir modal Quadro | GET | `/tickets/:ticketUuid/quadro` | - |
| Salvar status do quadro | PUT | `/tickets/:ticketUuid/quadro/status` | `{ "status": "..." }` |
| Salvar descrição | PUT | `/tickets/:ticketUuid/quadro/description` | `{ "description": "<p>...</p>" }` |
| Salvar valores, nome e campos | PUT | `/tickets/:ticketId/quadro` | `{ "valorServico", "valorEntrada", "nomeProjeto"?,"customFields"? }` |
| Upload anexo | POST | `/tickets/:ticketUuid/quadro/attachments` | multipart, campo `file` |
| Marcar anexo como capa | PATCH | `/tickets/:ticketUuid/quadro/attachments/:attachmentId/capa` | - |
| Excluir anexo | DELETE | `/tickets/:ticketId/quadro/attachments/:attachmentId` | - |
| Trocar cliente do ticket | PUT | `/tickets/:ticketId/contact` | `{ "contactId": number }` |
| Registrar log (drag) | POST | `/tickets/:ticketId/quadro/log` | `{ fromLaneId, toLaneId, fromLabel?, toLabel? }` |
| Histórico de logs | GET | `/tickets/:ticketId/quadro/logs` | - |

---

## 6. Ordem sugerida de implementação

1. **Tabelas:** Quadro, QuadroAnexo, QuadroStatusLog.
2. **GET `/tickets/:ticketUuid/quadro`** – retornar ticket + quadro (ou null) + attachments (ou []).
3. **PUT status** e **PUT description** – criar/atualizar Quadro.
4. **POST attachments** – upload + registro; servir arquivos em URL pública.
5. **PATCH attachment capa** – atualizar `isCapa`.
6. **PUT `/tickets/:ticketId/contact`** – trocar cliente.
7. **POST `/tickets/:ticketId/quadro/log`** – gravar log ao arrastar.
8. (Opcional) **DELETE attachment** e **GET logs**.

Garantir ainda que **GET /ticket/kanban** devolva em cada ticket `contact.urlPicture` ou `contact.profilePicUrl` para a foto do card.

---

## 7. Checklist final

- [ ] **GET /ticket/kanban** – em cada ticket, `contact` com `urlPicture` ou `profilePicUrl`; opcionalmente `quadroCapaUrl`, `nomeProjeto`, `quadroValorServico`, `quadroValorEntrada`, `quadroCustomFields` para o card.
- [ ] Tabela Quadro (ticketId, status, description, valorServico, valorEntrada, nomeProjeto, customFields JSON).
- [ ] Tabela QuadroAnexo (ticketId, name, path, isCapa).
- [ ] Tabela QuadroStatusLog (ticketId, fromLaneId, toLaneId, userId, createdAt).
- [ ] **GET** `/tickets/:ticketUuid/quadro` → ticket + quadro (com valorServico, valorEntrada) + attachments.
- [ ] **PUT** `/tickets/:ticketUuid/quadro/status`.
- [ ] **PUT** `/tickets/:ticketUuid/quadro/description`.
- [ ] **PUT** `/tickets/:ticketId/quadro` com body `{ valorServico, valorEntrada, nomeProjeto?, customFields? }`.
- [ ] **POST** `/tickets/:ticketUuid/quadro/attachments` (multipart).
- [ ] **PATCH** `/tickets/:ticketUuid/quadro/attachments/:id/capa`.
- [ ] **DELETE** `/tickets/:ticketId/quadro/attachments/:id`.
- [ ] Servir arquivos de anexo em URL acessível (ex.: `public/companyX/quadro/:ticketId/`).
- [ ] **PUT** `/tickets/:ticketId/contact` com `{ contactId }`.
- [ ] **POST** `/tickets/:ticketId/quadro/log` ao arrastar card.
- [ ] **GET** `/tickets/:ticketUuid/quadro/logs` (opcional).
- [ ] Autenticação e validação por companyId/filas em todos os endpoints.

Com isso, o front consegue usar 100% do Quadro Kanban (cards com foto, modal, anexos, trocar cliente e logs) integrado ao backend.
