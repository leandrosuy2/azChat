# Bug Tracker — azChat

Formato de cada entrada:

```
## [ID] Título curto
- **Data:** AAAA-MM-DD
- **Branch:** nome-da-branch
- **Commit:** hash (git log --oneline)
- **Arquivos alterados:** lista
- **Reproduzir:** passos mínimos para ver o bug
- **Causa:** explicação técnica
- **Fix:** o que foi mudado
- **Verificar:** como confirmar que está resolvido
```

---

## [001] Contatos sem nome/número aparecendo como LID

- **Data:** 2026-04-26
- **Branch:** `change-contacts-to-show-name`
- **Commit:** `bed7482`
- **Arquivos alterados:**
  - `frontend/src/components/TicketListItemCustom/index.js`
- **Reproduzir:** Abrir `/tickets` — contatos sem nome cadastrado exibiam "LID" ou campo vazio
- **Causa:** Fallback de exibição não tratava contatos sem `name` nem `number`
- **Fix:** Adicionado fallback para exibir número quando nome ausente
- **Verificar:** Contatos sem nome mostram número no lugar

---

## [002] Card Kanban dava refresh completo ao salvar campo

- **Data:** 2026-04-26
- **Branch:** `ajustar-auto-refresh-kanban-editar-quadro`
- **Commit:** `c63f77f`
- **Arquivos alterados:**
  - `frontend/src/pages/Kanban/QuadroModal.js`
- **Reproduzir:** Abrir cartão no Kanban → editar qualquer campo → clicar Salvar → modal vai pro topo e pisca
- **Causa:** Prop `onClose` (arrow function no pai) recriada a cada render → `loadAll` useCallback com dep `[onClose]` mudava → useEffect `[open, ticketUuid, loadAll]` refazia → `setLoading(true)` + reload completo
- **Fix:** Removido `loadAll` das deps do useEffect; cada handler de save atualiza `savedValuesRef` localmente sem recarregar tudo
- **Verificar:** Salvar campo mostra só toast, modal não pisca nem volta pro topo

### [002b] Fechar modal sem aviso com mudanças não salvas

- **Data:** 2026-04-26
- **Branch:** `ajustar-auto-refresh-kanban-editar-quadro`
- **Commit:** `c63f77f`
- **Arquivos alterados:**
  - `frontend/src/pages/Kanban/QuadroModal.js`
- **Reproduzir:** Abrir cartão → editar título, descrição, valores ou dados de contato → clicar fora ou no X → modal fecha sem aviso
- **Causa:** Sem rastreamento de dirty state; `onClose` chamado direto
- **Fix:** `savedValuesRef` snapshot dos valores salvos; `dirtyValores/dirtyDescription/dirtyContact/dirtyTitulo` useMemos; `handleRequestClose` intercepta e abre dialog de confirmação com 3 opções: Continuar editando / Descartar / Salvar e fechar
- **Verificar:** Editar qualquer campo → clicar X → dialog aparece listando campos modificados

---

## [003] ticketsList.noMessages aparecia como chave literal

- **Data:** 2026-04-27
- **Branch:** `ajustar-problema-ticketlistnomessage`
- **Commit:** `aecc9f4`
- **Arquivos alterados:**
  - `frontend/src/components/TicketListItemCustom/index.js`
  - `frontend/src/translate/languages/pt.js`
  - `frontend/src/translate/languages/en.js`
- **Reproduzir:** Abrir `/tickets` — conversa com `lastMessage === ""` (string vazia) exibia a chave `ticketsList.noMessages` em texto puro
- **Causa:** Check `if (!lm)` falha para string vazia (`""` é falsy mas passava antes do i18n); chave `noMessages` ausente nos arquivos de tradução
- **Fix:** `if (!lm)` → `if (!lm?.trim())`; adicionado `noMessages: "Sem mensagens"` em pt.js e `noMessages: "No messages"` em en.js
- **Verificar:** Conversa sem mensagens mostra "Sem mensagens" (não a chave literal)

---

## [004] Limite de download hardcoded e mensagem não configurável

- **Data:** 2026-04-27
- **Branch:** `setar-limite-de-download`
- **Commit:** mergeada em main
- **Arquivos alterados:**
  - `backend/src/services/WbotServices/wbotMessageListener.ts`
  - `frontend/src/components/Settings/Options.js`
- **Reproduzir:** Cliente envia arquivo > 15 MiB → sistema responde com mensagem hardcoded "Nosso sistema aceita apenas arquivos com no máximo 15 MiB"; mensagem registrada no ticket era diferente da enviada ao cliente; limite não era configurável por empresa
- **Causa:** `CheckSettings1` usava `companyId: 1` fixo (ignorava empresa real); texto da mensagem interna sobrescrito por string hardcoded após o envio; sem UI para alterar limite ou mensagem
- **Fix:**
  - `CheckSettings1` → `CheckCompanySetting(ticket.companyId, ...)` — respeita empresa do ticket
  - Novo setting `downloadLimitMessage`: se preenchido, usa como texto; se vazio, usa padrão dinâmico com o limite atual
  - `sendMsg.message.extendedTextMessage.text` agora usa `msgText` (não hardcoded)
  - UI em Configurações → Opções: campo numérico "Limite de download (MiB)" + textarea "Mensagem automática de arquivo grande" com helper mostrando o texto padrão atual
- **Verificar:**
  1. Configurações → Opções → alterar limite para 1 MiB → salvar
  2. Enviar qualquer foto pelo WhatsApp para o número conectado
  3. Mensagem recebida pelo cliente e registrada no ticket devem bater com o texto configurado (ou padrão se vazio)

---

## [005] Lembrete Kanban sem opção de destino para usuário específico

- **Data:** 2026-04-27
- **Branch:** `adicionar-destino-usuario-lembrete-kanban`
- **Commit:** (em aberto)
- **Arquivos alterados:**
  - `frontend/src/pages/Kanban/QuadroModal.js`
  - `backend/src/services/TicketLembreteServices/DispatchKanbanLembreteService.ts`
- **Reproduzir:** Abrir cartão Kanban → criar/editar lembrete → seção "Destino e ativação" → só existiam 4 opções: Só alerta no sistema, Só o responsável pelo ticket, Grupo/Fila, Contato do ticket (WhatsApp). Não dava para escolher um usuário específico do grupo (ex.: alguém do financeiro ou da produção).
- **Causa:** Faltava opção `usuario` em `LEMBRETE_DESTINO_OPTIONS`; backend `DispatchKanbanLembreteService` sempre emitia `targetUserId = ticket.userId` (responsável), ignorando outros usuários
- **Fix:**
  - Frontend: adicionada opção "Usuário específico (escolha o atendente)" em `LEMBRETE_DESTINO_OPTIONS`
  - Frontend: useEffect carrega `GET /users/` ao abrir editor de lembrete
  - Frontend: Select de usuário aparece quando `destinoTipo === "usuario"`; valida que `destinoId` foi escolhido antes de salvar
  - Backend: `DispatchKanbanLembreteService` agora calcula `targetUserId = lembrete.destinoId` quando `dest === "usuario"` (em vez do responsável do ticket)
  - `NotificationsPopOver` (já existente) já filtrava `dt === "usuario"` por `targetUserId === user.id`, então a notificação chega só pro usuário escolhido
- **Verificar:**
  1. Abrir cartão Kanban → criar lembrete → escolher destino "Usuário específico" → selecionar atendente
  2. Disparar gatilho (mover coluna, mudar status, etc.)
  3. Apenas o usuário escolhido recebe a notificação no toast/sino

---

## Como adicionar novo bug

1. Cria branch: `git checkout -b corrigir-nome-do-bug`
2. Faz o fix + commit
3. Adiciona entrada aqui neste arquivo seguindo o formato acima
4. Abre PR para `main`



Lembretes nao funcionam como deve!
testar criar um lembrete.
