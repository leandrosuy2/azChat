# Próximos Passos — Plano de Entregas

Começar em fluxos e disparo em massa.

As tarefas foram agrupadas em entregas, ordenadas da mais prioritária para a mais demorada.

---

## Entrega 1 — Integração Instagram/Facebook + Tutoriais (10 dias úteis)

Esta entrega junta as duas frentes obrigatórias da primeira janela.
Já existem no backend `InstagramServices`, `FacebookServices` e `MetaController`, então o trabalho é de refatoração, robustez e UX, não criação do zero.

Integração Instagram e Facebook (refatoração) — ✅ 90% CONCLUÍDO (2026-05-15)
- [x] Revisar fluxo de autenticação Meta (OAuth, refresh de token, webhook de mensagens).
      - Corrigido bug crítico: validação de assinatura do webhook rejeitava IG (usava só
        FACEBOOK_APP_SECRET; agora aceita FACEBOOK_APP_SECRET + INSTAGRAM_APP_SECRET).
      - Refresh de token IG (ig_refresh_token) + fallback quando ig_exchange_token falha.
      - CheckMetaConnectionsService (cron 6h): valida/renova token, marca DISCONNECTED.
      - subscribe corrigido para `me/subscribed_apps`; base URL IG sem prefixo de versão.
- [x] Padronizar entrada de mensagens IG/FB no mesmo pipeline de tickets/contatos do WhatsApp.
      - Recepção validada em produção (ticket + contato + mensagens criados).
- [x] Tratar mídias (imagem, vídeo, áudio, stickers) — stickers/mídia de DM já funcionam.
      Reactions e respostas a stories/comentários: FORA DE ESCOPO (definido com cliente).
- [ ] Garantir envio fora da janela de 24h (template/aprovadas Meta) — PENDENTE (Item 2, crítico).
- [~] Tela "Conexões": status real + erro persistido no backend (campo metaConnectionError).
      Falta expor erro/status na UI (ajuste leve de frontend).
- [ ] Testes de ponta a ponta — PENDENTE.

> BLOQUEIO EXTERNO (não-código): app Meta exige App Review aprovado das permissões
> instagram_business_basic / instagram_business_manage_messages / instagram_manage_comments
> para contas de clientes (não-testers) conectarem. App está Live mas review incompleto.
> Só contas adicionadas no painel "Generate access tokens" funcionam hoje.
> Restante (10%): ajustes leves de frontend + App Review (processo Meta).

Tutoriais (reformulação)
- Permitir editar tutorial existente (texto, imagem, PDF, vídeo embed).
- Upload de anexos no tutorial (reaproveitar `FileServices`).
- Componente "vincular tutorial" exposto como ícone (i/?) ao lado de áreas/botões do sistema.
- Ao clicar no ícone, abrir modal com o tutorial vinculado àquela área.

PLANO (definido 2026-05-15) — base: sistema "Helps" já existe (CRUD completo).
Storage: SEM MinIO — disco local da VPS (67GB livres), reusar config/upload.ts
(`multer.diskStorage` + `public/companyX/helps/{helpId}/`). Vídeo = embed URL,
nunca upload de arquivo de vídeo. Limite de tamanho + whitelist de mimetype.
- [x] Migration: Help ganha `content` (TEXT) e `areaKey` (STRING, indexed, nullable).
- [x] Migration: nova tabela `HelpAttachments` (helpId, name, path, type, mimetype, size).
- [x] Backend: estender Create/Update (content, areaKey); rotas POST/DELETE anexos;
      GET /helps/by-area/:areaKey; GET /helps/areas; DeleteService apaga arquivos físicos.
      Constante compartilhada src/constants/helpAreas.ts (14 áreas). tsc OK.
- [x] Frontend: editor (content multiline) + dropdown areaKey + uploader/lista de anexos
      no HelpsManager; hook useHelps estendido.
- [x] Componente `<HelpHint areaKey>`: ícone (?) → modal com título, vídeo embed
      (YouTube), conteúdo markdown e anexos (imagem inline / link).
- [x] Piloto: `<HelpHint areaKey="connections">` plantado no header de Conexões.
- [ ] Espalhar `<HelpHint>` nas demais áreas prioritárias (pendente).

> Migrations aplicadas no banco DEV (azchat_dev). NÃO aplicadas em produção ainda.
> Storage: disco local da VPS, public/helps/{helpId}/. Sem MinIO. Vídeo = embed.
> Build do frontend NÃO executado (política: usuário testa localmente).

---

## Entrega 2 — Limpezas rápidas e ajustes de UI (3 dias úteis)

Conjunto de itens curtos, baixo risco, alto impacto visual.

- Respostas rápidas: remover a página dedicada (já está dentro do contato).
- Tags: remover a página dedicada (tags já aparecem nos atendimentos).
- Cards de respostas rápidas dentro do contato:
  - Puxar a cor real do card escolhido (hoje está esmaecida).
  - Mover botão de ação para um local visível (não embaixo).
  - Permitir editar o card direto na visualização.
  - Remover o botão "editar e enviar".
  - Permitir reordenar as tags por drag and drop (e não só itens dentro delas).
- Chat interno: aplicar o mesmo layout do chat de clientes.
- Atendimento: adicionar botão para pausar IA naquele ticket (filas/chatbots).

---

## Entrega 3 — Respostas rápidas, Notificações e Informativos (4 dias úteis)

Respostas rápidas (criação)
- Ao criar mensagem rápida com tipo, permitir adicionar os mesmos tipos no "adicionar ação".
- Permissão dedicada para editar/remover respostas rápidas.

Notificações
- Dividir tela por abas (ex.: gerais, lembretes, sistema).
- Na criação de lembrete, escolher o escopo: pessoal, específico para alguém ou geral.
- Garantir que lembretes pessoais não vazem para todos os usuários.

Informativos
- Na criação, escolher público alvo: equipe da empresa ou clientes da plataforma (compradores).

---

## Entrega 4 — Agendamentos e Calendário (5 dias úteis)

- Botão "Agendamentos" abrindo abas para cada tipo (contatos, mensagens, etc.).
- Cada tipo de agendamento tem sua aba de calendário própria.
- Mensagens agendadas vão para o calendário "mensagens agendadas".
- Esconder eventos sem dados (instalação/visita técnica vazias) — mostrar só eventos criados.
- Cards no calendário com cor de destaque, foto/nome do cliente.
- Clique no card mostra detalhes do agendamento.
- Botões de editar e excluir nos cards (hoje não existem).
- Drag and drop dos cards entre datas (atualizando no backend).

---

## Entrega 5 — Permissões e Acessibilidade por Usuário (4 dias úteis)

- Revisar permissões considerando as novas features e bugs corrigidos.
- Adicionar permissões a respostas rápidas (criar/editar/remover).
- Adicionar permissões em Quadros Kanban.
- "Perfil de acessibilidade" por usuário: o usuário escolhe o que aparece na tela dele e salva como preferência (ex.: ocultar mensagens rápidas que não usa). Persistência por usuário, aplicada no login.

---

## Entrega 6 — Processos, Tickets e Orçamentos (8 dias úteis)

Refatoração de uma das áreas mais densas do sistema (`BudgetServices`, `TicketBudgetController`, páginas de Tickets/Processos).

- Permitir mais de um orçamento por cliente.
- Cards de orçamento rolando dentro do próprio card do tipo de orçamento.
- Renomear "Orçamento aceito" para "Aprovado" e diferenciar claramente Orçamento × Ordem de Serviço.
- Permitir criar OS direto, sem precisar criar orçamento antes (botões separados).
- Substituir a seção "Áreas de trabalho em que este contato participa" por um KANBAN.
- Unificar abas de Ticket e Processos em uma única visão mais compacta.
- Remover campo "observação" do Ticket. Levar informações do Ticket para o cartão de Contato.
- Adicionar ícone de informação (i/?) explicando cada área (já consumindo Tutoriais da Entrega 1).

---

## Entrega 7 — Painel de Atendimentos, Dashboards e Relatórios (6 dias úteis)

- Unificar Relatórios e Dashboard em uma única página.
- Painel de Atendimento integrado ao Dashboard.
- Nas conversas, botão de atalho do WhatsApp para abrir a conversa externamente.
- Métricas por vendedor: quanto atendeu, quanto vendeu, ticket médio.

---

## Entrega 8 — Produtos e Financeiro (8 dias úteis)

Produtos
- Cadastro de produtos.
- Ao criar orçamento, linkar item com produto cadastrado.

Financeiro (faturas e visão da empresa)
- Visão financeira por cliente.
- Faturamento geral da empresa.
- Overview de vendas: usuário que mais vendeu, produto que mais saiu, ticket médio.
- Integrar com módulo de Produtos para puxar dados de saída.

---

## Entrega 9 — Empresas e Ciclo de Vida (3 dias úteis)

- Histórico das empresas registradas: tempo de cadastro, pagamentos realizados, dia de vencimento, status atual.
- Linha do tempo de eventos por empresa.

---

Observações
- Entregas 2 e 3 podem ser paralelizadas se houver mais de um dev, reduzindo ~3 dias do total.
- Entrega 6 (Processos/Orçamentos) é a mais arriscada por mexer em fluxo central de negócio.
    recomendado período de validação com usuário antes de remover o fluxo antigo.
- Entrega 8 depende parcialmente da 6 (orçamento <-> produto).
