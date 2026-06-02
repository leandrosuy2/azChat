# Guia de Testes — AzChat

Documento de referência para **acessar, executar e validar** cada cartão/entrega do plano.
Use em conjunto com `proximos.md`.

---

## Antes de começar

| Item | Detalhe |
|------|---------|
| **Login admin** | Perfil `admin` — necessário para Produtos, Dashboard completo, Usuários etc. |
| **Login atendente** | Perfil `user` — validar permissões e restrições |
| **Login super** | Usuário com flag `super` — necessário para Empresas / Ciclo de vida |
| **Backend** | `cd backend && npm run dev:local` (ou ambiente equivalente) |
| **Frontend** | `cd frontend && npm start` |
| **Migrations pendentes** | `cd backend && npm run db:migrate` (obrigatório para catálogo de produtos) |
| **Conexão WhatsApp** | Necessária para testes de atendimento, duplicidade e envio de orçamento |

---

## Cartão: Mensagens Duplicadas

**Problema:** conversas aparecendo mais de uma vez na fila de atendimentos.

**Status:** correção implementada em `TicketsListCustom` (deduplicação por conversa + ID).

### Onde acessar

- Menu lateral → **Atendimentos** (`/tickets`)

### Como testar

1. Faça login como atendente ou admin.
2. Abra **Atendimentos** e percorra as sub-abas:
   - **Atendendo** (`open`)
   - **Aguardando** (`pending`)
   - **Grupos** (`group`) — se habilitado no usuário
3. Com a tela aberta, envie **várias mensagens seguidas** do mesmo contato (WhatsApp ou simulador).
4. **Atualize a página** (F5) e confira se a conversa continua aparecendo **uma única vez** em cada aba.
5. Aceite ou transfira um ticket e verifique se **não surge uma segunda linha** para o mesmo contato/conexão.
6. Repita o teste após eventos em tempo real (nova mensagem via socket).

### O que validar

- [ ] Cada contato/conversa aparece **apenas uma vez** por aba
- [ ] Não há duplicata ao receber mensagens em sequência
- [ ] Não há duplicata após refresh
- [ ] Comportamento consistente em Atendendo, Aguardando e Grupos

### Resultado esperado

Lista de atendimentos limpa, sem poluição visual, com uma única entrada por conversa.

---

## Cartão: 4 — Agendamentos e Calendário

**Escopo:** calendários por categoria, cards visuais, drag-and-drop, edição/exclusão.

**Status:** implementado (parcialmente — abas por categoria no calendário; lista separada).

### Onde acessar

- Menu lateral → **Agendamentos** (`/schedules`)
- Com contato específico: `/schedules?contactId={id}`

### Como testar

#### Organização por categoria

1. Acesse **Agendamentos**.
2. Clique na aba **Calendário** (padrão).
3. Verifique as **sub-abas de categoria** (só aparecem categorias **com eventos**):
   - Mensagens agendadas
   - Contatos
   - Instalações
   - Visitas técnicas
4. Crie um agendamento de contato (**+ Adicionar**) e confirme que ele aparece na categoria correta.
5. Crie uma **mensagem agendada** e confirme que ela aparece em **Mensagens agendadas**, não misturada com outros tipos.

#### Visual e interação

1. No calendário, clique em um **card de evento** → deve abrir edição.
2. Use os ícones **Editar** / **Excluir** no card.
3. **Arraste** um evento para outra data/horário → deve persistir após recarregar a página.
4. Confira no card: cor da categoria, foto e nome do cliente.

#### Modo lista

1. Alterne para a aba **Lista**.
2. Use os filtros: Todos / Com ticket / Somente diretos.
3. Edite e exclua registros pela tabela.

### Resultado esperado

Calendário segmentado por categoria, eventos vazios ocultos, drag-and-drop funcional e cards informativos.

---

## Cartão: 5 — Permissões e Acessibilidade do Usuário

**Escopo:** permissões granulares + preferências individuais de interface.

**Status:** implementado (base).

### Onde acessar

| Funcionalidade | Caminho |
|----------------|---------|
| Permissões por usuário | Menu **Usuários** → editar usuário → aba de permissões |
| Preferências de acessibilidade | Menu **Usuários** → editar usuário → seção **Preferências de acessibilidade** |
| Validação como atendente | Login com perfil `user` |

### Como testar — Permissões

1. Login como **admin** → **Usuários** (`/users`).
2. Edite um atendente e **desmarque** permissões de respostas rápidas (`quickMessages:create`, `edit`, `delete`).
3. Salve e faça login com esse atendente.
4. Tente criar/editar/excluir resposta rápida no contato → deve respeitar a permissão.
5. Repita para **Kanban** (`kanban:view`, `kanban:create`, `kanban:moveCard` etc.).

### Como testar — Acessibilidade

1. Admin → **Usuários** → editar o próprio usuário.
2. Na seção **Preferências de acessibilidade**, oculte um bloco (ex.: mensagens rápidas).
3. Salve, **saia e entre novamente**.
4. Confirme que a preferência foi aplicada automaticamente no login.

### Resultado esperado

Controle de acesso por perfil/permissão e interface personalizada por usuário.

---

## Cartão: 6 — Processos, Tickets e Orçamentos

**Escopo:** orçamentos, OS, unificação ticket/processo, Kanban no contato.

**Status:** implementado (parcial — fluxos principais prontos; unificação total ticket/processo ainda em evolução).

### Onde acessar

| Funcionalidade | Caminho |
|----------------|---------|
| Atendimento + drawer do contato | `/tickets` → abrir ticket → painel lateral do contato |
| Orçamento no ticket | Barra de ações do ticket → ícone de orçamento |
| Orçamentos/OS do contato | Drawer do contato → seção **Orçamentos** |
| Kanban do contato | Drawer do contato → abas de processos/Kanban |
| Orçamento público | Link `/orcamento/{token}` (gerado ao salvar orçamento) |

### Como testar — Orçamentos

1. Abra um ticket com contato vinculado (`/tickets/{uuid}`).
2. No drawer, clique **Criar orçamento**.
3. Na seção **Itens e valores**:
   - Selecione produto do **catálogo** (se houver produtos cadastrados)
   - Confira preenchimento automático de descrição, unidade, valor e categoria
   - Altere quantidade/valor **no orçamento** sem alterar o produto no cadastro
4. Salve, gere PDF e envie link por WhatsApp (se conexão ativa).
5. Crie **segundo orçamento** para o mesmo contato → deve listar ambos em faixas **Pendentes / Aprovados / Recusados**.

### Como testar — Ordem de Serviço (OS)

1. No drawer do contato, clique **Criar OS** (sem precisar de orçamento).
2. Selecione produtos do catálogo ou preencha manualmente.
3. Salve → deve gerar número `OS-AAAA-NNNN`.
4. Aprove um orçamento e confirme geração de pedido `PED-AAAA-NNNN` (diferente de OS).

### Como testar — Status e nomenclatura

1. Verifique status **Aprovado** (não "Orçamento aceito") nos cards do contato.
2. Confirme distinção visual entre **Orçamento** (proposta) e **OS/Pedido** (venda executada).

### Como testar — Observações migradas

1. No drawer → **Observações do contato** (centralizadas no contato, não no ticket).
2. Salve anotação e confirme persistência ao reabrir o contato.

### Como testar — Ajuda contextual

1. Clique no ícone **?** nas seções Orçamentos, observações etc.
2. Deve abrir tutorial vinculado (Entrega 1 — Helps).

### Resultado esperado

Fluxo integrado de orçamento ↔ OS ↔ contato, múltiplos orçamentos por cliente, nomenclatura clara e histórico centralizado.

---

## Cartão: 7 — Painel de Atendimento e BI

**Escopo:** dashboard unificado, painel ao vivo, BI comercial, atalho WhatsApp.

**Status:** implementado.

### Onde acessar

| Aba | URL |
|-----|-----|
| Indicadores | `/` |
| Relatórios | `/?hub=reports` (ou `/reports` — redireciona) |
| Painel ao vivo | `/?hub=live` (ou `/moments` — redireciona) |
| BI Comercial | `/?hub=commercial` |
| Financeiro empresa | `/?hub=finance` |

Menu: **Dashboard** (submenu Produtos fica dentro do grupo Dashboard para admin).

### Como testar — Dashboard unificado

1. Acesse `/` logado como admin.
2. Percorra as **5 abas** do Painel operacional.
3. Em **Relatórios**, confirme que a página antiga foi incorporada (sem tela separada).
4. Em **Painel ao vivo**, acompanhe atendimentos em tempo real (`MomentsUser`).

### Como testar — BI Comercial

1. Acesse `/?hub=commercial`.
2. Ajuste período (De / Até).
3. Valide cards: receita, vendas, ticket médio, atendimentos, orçamentos aprovados.
4. Confira tabelas:
   - Desempenho por vendedor
   - **Produtos mais vendidos**
   - **Faturamento por categoria**
   - Faturamento por dia

> Para gerar dados: crie OS ou aprove orçamentos com itens vinculados ao catálogo.

### Como testar — Atalho WhatsApp externo

1. Abra um ticket (`/tickets/{uuid}`).
2. Na barra superior de ações, clique no ícone **WhatsApp verde**.
3. Deve abrir `wa.me` em nova aba com o número do contato.

### Resultado esperado

Visão gerencial única, métricas por vendedor/produto/categoria e atalho para WhatsApp externo.

---

## Cartão: 8 — Produtos e Financeiro

**Escopo:** catálogo comercial, integração com orçamentos/OS, BI e financeiro por cliente/empresa.

**Status:** implementado.

### Pré-requisito

```bash
cd backend
npm run db:migrate
```

### Onde acessar

| Funcionalidade | Caminho |
|----------------|---------|
| Catálogo de produtos | Menu Dashboard → **Produtos** (`/products`) — **somente admin** |
| Categorias | `/products` → aba **Categorias** |
| Orçamento com catálogo | Ticket → modal Orçamento → dropdown **Produto cadastrado** |
| OS com catálogo | Drawer contato → **Criar OS** → dropdown catálogo |
| Financeiro do cliente | Drawer contato → **Resumo financeiro** |
| BI produtos/categorias | `/?hub=commercial` |
| Faturamento empresa | `/?hub=finance` |
| Faturas SaaS (plataforma) | `/financeiro` — **não confundir** com financeiro comercial |

### Como testar — Cadastro de produtos

1. Admin → **Produtos** → **Novo produto**.
2. Preencha: nome, SKU, categoria/subcategoria, unidade, venda, custo, status, imagem, observações internas.
3. Salve e confirme na listagem (aba **Catálogo**).
4. Crie **categorias e subcategorias** na aba **Categorias** (ex.: Gráfica → Folders).

### Como testar — Integração com orçamento/OS

1. Crie produto ativo no catálogo.
2. Abra orçamento ou OS e selecione o produto.
3. Confirme auto-preenchimento e **altere valor no documento** sem mudar o cadastro.
4. Salve e verifique no BI (aba Comercial) após aprovação/OS.

### Como testar — Financeiro por cliente

1. Abra contato com vendas/orçamentos.
2. No drawer, veja **Resumo financeiro**: receita, vendas, aprovados, pendentes.

### Como testar — Faturamento da empresa

1. Acesse `/?hub=finance`.
2. Filtre por período e valide receita, orçamentos aprovados e evolução diária.

### Resultado esperado

Catálogo flexível por segmento, vendas alimentando BI automaticamente, visão financeira por cliente e por empresa.

---

## Cartão: 9 — Empresas e Ciclo de Vida

**Escopo:** histórico, timeline e eventos por empresa da plataforma.

**Status:** implementado (modal de ciclo de vida).

### Onde acessar

- Menu **Empresas** (`/companies`) — **somente usuário super**
- Ícone **Histórico / Ciclo de vida** na linha de cada empresa

### Como testar

1. Login com usuário **super**.
2. Acesse **Empresas**.
3. Clique no ícone de **histórico** (relógio) de uma empresa.
4. No modal, valide:
   - Tempo de cadastro, vencimento, status
   - Pagamentos e situação financeira
   - **Linha do tempo** de eventos (cadastro, plano, pagamento, bloqueio etc.)

### Resultado esperado

Visão rastreável do ciclo de vida de cada empresa cliente da plataforma.

---

## Cartão: 10 — Variáveis e Regras de Notificações do Kanban

**Escopo:** lembretes inteligentes, variáveis, gatilhos e notificação ao compartilhar área.

**Status:** implementado (base).

### Onde acessar

| Funcionalidade | Caminho |
|----------------|---------|
| Kanban | Menu **Kanban** (`/kanban`) |
| Lembretes do card | Abrir card → modal do quadro → seção **Lembretes inteligentes** |
| Central de notificações | Menu **Notificações** (`/notifications`) |

### Como testar — Variáveis

1. Abra um card no Kanban.
2. Crie/edite um **lembrete inteligente**.
3. Na mensagem, use variáveis como:
   - `{{nomeCard}}`, `{{coluna}}`, `{{contato}}`, `{{responsavel}}`
   - `{{area_trabalho}}`, `{{area_origem}}`, `{{area_destino}}`, `{{data_movimentacao}}`
4. Use a **pré-visualização** no editor e confirme substituição correta.

### Como testar — Tipo de gatilho

1. No lembrete, selecione gatilho (ex.: movimentação, compartilhamento, prazo).
2. Salve, execute a ação no card (mover coluna, compartilhar área etc.).
3. Verifique disparo em **Notificações** (`/notifications` → aba **Lembretes** ou **Kanban**).

### Como testar — Compartilhamento entre áreas

1. Crie lembrete com gatilho **Compartilhamento**.
2. Ative **Notificar ao compartilhar com outra área de trabalho**.
3. Selecione uma ou mais áreas destinatárias.
4. Compartilhe o card com outra área e valide notificação.

### Resultado esperado

Notificações personalizadas, gatilhos configuráveis e controle fino de quem recebe alerta ao compartilhar cards.

---

## Referência rápida de rotas

| Rota | Tela |
|------|------|
| `/tickets` | Atendimentos |
| `/schedules` | Agendamentos |
| `/users` | Usuários e permissões |
| `/products` | Produtos (admin) |
| `/` | Dashboard / Painel operacional |
| `/?hub=commercial` | BI Comercial |
| `/?hub=finance` | Financeiro da empresa |
| `/financeiro` | Faturas SaaS (assinatura) |
| `/companies` | Empresas (super) |
| `/kanban` | Kanban |
| `/notifications` | Central de notificações |
| `/orcamento/:token` | Orçamento público (cliente) |

---

## Observações

- **Entrega 1** (Instagram/Facebook, Tutoriais): testes em `/connections`, `/helps`, `/tutoriais` — ver `proximos.md`.
- **Entrega 2** (limpezas UI): respostas rápidas e tags redirecionam para `/tickets`.
- Sempre testar com **dois perfis** (admin + atendente) quando a funcionalidade envolve permissão.
- Após migrations, reinicie o backend antes de testar Produtos e BI comerciais.
