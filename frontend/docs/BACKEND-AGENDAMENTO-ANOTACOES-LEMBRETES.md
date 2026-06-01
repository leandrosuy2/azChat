# Backend – Agendamento, Anotações e Lembretes (por ticket)

Documentação para conectar o front ao backend nas funcionalidades do **botão flutuante** na conversa do ticket: **Agendamento** (calendário por setor), **Anotações** e **Lembretes**.

O front hoje usa `localStorage`; ao implementar estes endpoints, o front passará a usar a API (e poderá remover o fallback em `TicketFloatingActions`).

---

## 1. Visão geral

| Módulo       | Recurso   | Descrição                                              |
|-------------|-----------|--------------------------------------------------------|
| Agendamento | Eventos   | Eventos por setor (Consulta, Instalação, Visita Técnica) vinculados ao ticket |
| Anotações   | Anotações | Texto + opcional upload de arquivo; status (aberta, concluída, pendente); opcional vínculo com evento |
| Lembretes   | Lembretes | Nome, descrição, data/hora; opção “adicionar ao Google”; opcional vínculo com evento |

Todos são **por ticket** (e por company). Autenticação e `companyId` devem ser validados em todos os endpoints.

---

## 2. Setores (fixos no front)

O front usa estes setores. O backend pode manter a mesma lista ou expor via endpoint (opcional).

| id              | name           |
|-----------------|----------------|
| consulta        | Consulta       |
| instalacao      | Instalação     |
| visita_tecnica  | Visita Técnica |

Tipos de agendamento usados no front: `Consulta`, `Instalação`, `Visita Técnica`, `Retorno`, `Outro`.

---

## 3. Eventos (Agendamento)

### 3.1 Tabela sugerida

```text
ticket_eventos / ticket_schedule_events
- id (PK)
- ticketId (FK → tickets)
- companyId (FK → companies)
- setor (string: "consulta" | "instalacao" | "visita_tecnica")
- responsavel (string, nullable)   // nome do responsável
- tipo (string)                    // ex.: "Consulta", "Instalação", "Retorno", "Outro"
- data (date)                      // YYYY-MM-DD
- hora (string)                    // ex.: "14:30"
- localizacao (string, nullable)
- descricao (text, nullable)
- createdAt, updatedAt
```

### 3.2 GET `/tickets/:ticketId/eventos`

Lista todos os eventos do ticket (o front agrupa por setor).

**Response 200**

```json
{
  "eventos": [
    {
      "id": 1,
      "ticketId": 8,
      "setor": "consulta",
      "responsavel": "Leandro Dantas",
      "tipo": "Consulta",
      "data": "2026-02-20",
      "hora": "14:30",
      "localizacao": "",
      "descricao": "Primeira consulta",
      "createdAt": "2026-02-19T12:00:00.000Z"
    }
  ]
}
```

### 3.3 POST `/tickets/:ticketId/eventos`

Cria evento vinculado ao ticket e ao calendário do setor.

**Body**

```json
{
  "setor": "consulta",
  "responsavel": "Leandro Dantas",
  "tipo": "Consulta",
  "data": "2026-02-20",
  "hora": "14:30",
  "localizacao": "Sala 2",
  "descricao": "Primeira consulta"
}
```

| Campo        | Tipo   | Obrigatório | Descrição                          |
|-------------|--------|-------------|------------------------------------|
| setor       | string | Sim         | `consulta` \| `instalacao` \| `visita_tecnica` |
| responsavel | string | Não         | Nome do responsável                |
| tipo        | string | Sim         | Tipo do agendamento                |
| data        | string | Sim         | YYYY-MM-DD                         |
| hora        | string | Sim         | Ex.: "14:30"                       |
| localizacao | string | Não         | Localização                        |
| descricao   | string | Não         | Descrição                          |

**Response 201**

```json
{
  "evento": {
    "id": 1,
    "ticketId": 8,
    "setor": "consulta",
    "responsavel": "Leandro Dantas",
    "tipo": "Consulta",
    "data": "2026-02-20",
    "hora": "14:30",
    "localizacao": "Sala 2",
    "descricao": "Primeira consulta",
    "createdAt": "2026-02-19T12:00:00.000Z"
  }
}
```

### 3.4 DELETE `/tickets/:ticketId/eventos/:eventoId` (opcional)

Remove um evento. Front pode usar para “excluir” no futuro.

---

## 4. Anotações

### 4.1 Tabela sugerida

```text
ticket_anotacoes / ticket_notes
- id (PK)
- ticketId (FK → tickets)
- companyId (FK → companies)
- eventoId (FK → ticket_eventos, nullable)  // opcional: anotação vinculada a um evento
- texto (text)
- arquivoNome (string, nullable)            // nome do arquivo enviado
- arquivoPath (string, nullable)           // caminho no disco, se fizer upload
- status (string)                           // "aberta" | "concluída" | "pendente"
- createdAt, updatedAt
```

### 4.2 GET `/tickets/:ticketId/anotacoes`

Lista anotações do ticket (ordenadas por data, mais recente primeiro).

**Response 200**

```json
{
  "anotacoes": [
    {
      "id": 1,
      "ticketId": 8,
      "eventoId": null,
      "texto": "Cliente confirmou presença.",
      "arquivoNome": null,
      "arquivoUrl": null,
      "status": "aberta",
      "createdAt": "2026-02-19T14:00:00.000Z"
    }
  ]
}
```

Se houver arquivo, retornar `arquivoUrl` (URL pública) em vez de ou além de `arquivoPath`.

### 4.3 POST `/tickets/:ticketId/anotacoes`

Cria anotação. Pode enviar só texto ou texto + arquivo (multipart).

**Opção A – JSON (só texto)**

**Body (application/json)**

```json
{
  "texto": "Cliente confirmou presença.",
  "eventoId": null,
  "status": "aberta"
}
```

**Opção B – multipart/form-data (texto + arquivo)**

- `texto` (string)
- `eventoId` (number, opcional)
- `status` (string, opcional; default "aberta")
- `file` (arquivo, opcional)

**Response 201**

```json
{
  "anotacao": {
    "id": 1,
    "ticketId": 8,
    "eventoId": null,
    "texto": "Cliente confirmou presença.",
    "arquivoNome": null,
    "arquivoUrl": null,
    "status": "aberta",
    "createdAt": "2026-02-19T14:00:00.000Z"
  }
}
```

### 4.4 PATCH `/tickets/:ticketId/anotacoes/:anotacaoId` (opcional)

Atualizar status (e eventualmente texto). Body: `{ "status": "concluída" }` ou `{ "texto": "..." }`.

### 4.5 DELETE `/tickets/:ticketId/anotacoes/:anotacaoId` (opcional)

Remove anotação (e arquivo do disco, se houver).

---

## 5. Lembretes

### 5.1 Tabela sugerida

```text
ticket_lembretes / ticket_reminders
- id (PK)
- ticketId (FK → tickets)
- companyId (FK → companies)
- eventoId (FK → ticket_eventos, nullable)
- nome (string)
- descricao (text, nullable)
- data (date)                      // YYYY-MM-DD
- hora (string)                    // ex.: "09:00"
- addGoogle (boolean, default false)  // se usuário quis adicionar ao Google Calendar
- createdAt, updatedAt
```

### 5.2 GET `/tickets/:ticketId/lembretes`

Lista lembretes do ticket.

**Response 200**

```json
{
  "lembretes": [
    {
      "id": 1,
      "ticketId": 8,
      "eventoId": null,
      "nome": "Ligar para cliente",
      "descricao": "Confirmar horário da instalação",
      "data": "2026-02-20",
      "hora": "09:00",
      "addGoogle": true,
      "createdAt": "2026-02-19T12:00:00.000Z"
    }
  ]
}
```

### 5.3 POST `/tickets/:ticketId/lembretes`

Cria lembrete.

**Body**

```json
{
  "nome": "Ligar para cliente",
  "descricao": "Confirmar horário da instalação",
  "data": "2026-02-20",
  "hora": "09:00",
  "eventoId": null,
  "addGoogle": true
}
```

| Campo     | Tipo    | Obrigatório | Descrição                                  |
|----------|---------|-------------|--------------------------------------------|
| nome     | string  | Sim         | Nome do lembrete                           |
| descricao| string  | Não         | Descrição                                  |
| data     | string  | Sim         | YYYY-MM-DD                                 |
| hora     | string  | Sim         | Ex.: "09:00"                               |
| eventoId | number  | Não         | ID do evento ao qual o lembrete está ligado |
| addGoogle| boolean | Não         | Se deve ser adicionado ao Google Calendar  |

**Response 201**

```json
{
  "lembrete": {
    "id": 1,
    "ticketId": 8,
    "eventoId": null,
    "nome": "Ligar para cliente",
    "descricao": "Confirmar horário da instalação",
    "data": "2026-02-20",
    "hora": "09:00",
    "addGoogle": true,
    "createdAt": "2026-02-19T12:00:00.000Z"
  }
}
```

Se `addGoogle` for `true`, o backend pode (em outro serviço/job) integrar com a API do Google Calendar; isso fica a critério da implementação.

### 5.4 DELETE `/tickets/:ticketId/lembretes/:lembreteId` (opcional)

Remove lembrete.

---

## 6. Resumo dos endpoints

| Módulo       | Método | URL | Body / Observação |
|-------------|--------|-----|-------------------|
| Eventos     | GET    | `/tickets/:ticketId/eventos` | - |
| Eventos     | POST   | `/tickets/:ticketId/eventos` | setor, responsavel?, tipo, data, hora, localizacao?, descricao? |
| Eventos     | DELETE | `/tickets/:ticketId/eventos/:eventoId` | (opcional) |
| Anotações   | GET    | `/tickets/:ticketId/anotacoes` | - |
| Anotações   | POST   | `/tickets/:ticketId/anotacoes` | JSON: texto, eventoId?, status? OU multipart: texto, file?, eventoId?, status? |
| Anotações   | PATCH  | `/tickets/:ticketId/anotacoes/:anotacaoId` | { status } ou { texto } (opcional) |
| Anotações   | DELETE | `/tickets/:ticketId/anotacoes/:anotacaoId` | (opcional) |
| Lembretes   | GET    | `/tickets/:ticketId/lembretes` | - |
| Lembretes   | POST   | `/tickets/:ticketId/lembretes` | nome, descricao?, data, hora, eventoId?, addGoogle? |
| Lembretes   | DELETE | `/tickets/:ticketId/lembretes/:lembreteId` | (opcional) |

---

## 7. Integração no front

Quando estes endpoints existirem, no componente `TicketFloatingActions`:

- **Eventos:** trocar `loadFromStorage(ticketId, "eventos")` por `GET /tickets/:ticketId/eventos` e `handleCriarEvento` por `POST /tickets/:ticketId/eventos`.
- **Anotações:** trocar leitura/gravação em localStorage por `GET` e `POST /tickets/:ticketId/anotacoes` (e, se tiver upload, usar multipart no POST).
- **Lembretes:** trocar por `GET` e `POST /tickets/:ticketId/lembretes`.

Usar o `ticketId` numérico (id do ticket), que o front obtém do ticket carregado na conversa (ex.: `ticket.id` no contexto do Ticket).

Com isso, as funcionalidades de **Agendamento**, **Anotações** e **Lembretes** ficam totalmente conectadas ao backend.
