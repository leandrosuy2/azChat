# Tutorial de Filas — Todos os campos explicados

Este guia descreve **cada campo** da tela de Filas no PrimataZap: o que é, onde fica e para que serve.

---

## O que são as Filas

As **filas** organizam o atendimento: quando um contato manda mensagem, o sistema pode colocar o atendimento em uma fila. Cada fila pode ter **cor**, **mensagem de saudação**, **horário de expediente**, **integração** (ex.: FlowBuilder, Typebot) e **opções de menu** (chatbot) que direcionam o contato para texto, atendente, outra fila, integração ou arquivo.

O cadastro da fila tem **duas abas**: **Dados da fila** e **Horários de atendimento** (esta última aparece só se a empresa tiver horários por fila habilitado nas configurações).

---

## Aba: Dados da fila

### Nome

- **Campo:** Nome da fila.
- **Obrigatório:** Sim.
- **Exemplo:** "Vendas", "Suporte", "Financeiro".
- **Dica:** Use um nome curto e claro; ele aparece na lista de filas, na conexão WhatsApp e para os atendentes.

---

### Cor

- **Campo:** Cor da fila (exibida na interface).
- **Obrigatório:** Sim.
- **Como preencher:** Clique no campo ou no ícone de cor e escolha no seletor. A cor aparece em um quadradinho ao lado do campo.
- **Uso:** Ajuda a identificar a fila rapidamente na lista de tickets e no painel.

---

### Ordem da fila (Bot)

- **Campo:** Número que define a **ordem** em que a fila aparece no bot/menu (quando há opções de fila em outras filas ou no fluxo).
- **Obrigatório:** Não.
- **Exemplo:** 1, 2, 3. Quanto menor o número, mais “no topo” a fila tende a aparecer em listas ordenadas.
- **Uso:** Útil quando você lista várias filas em um menu; controla a ordem de exibição.

---

### Fechar ticket

- **Campo:** Switch (liga/desliga) **"Fechar ticket"**.
- **O que faz:** Se ativado, ao finalizar o fluxo dessa fila o sistema pode **fechar o ticket** automaticamente (conforme a regra do sistema).
- **Uso:** Ative quando a fila representar um atendimento que, ao terminar, deve encerrar o ticket.

---

### Rodízio

- **Campo:** Switch **"Rodízio"**.
- **O que faz:** Quando ativado, os atendimentos da fila são **distribuídos em rodízio** entre os atendentes (em vez de ficar sempre com o mesmo).
- **Uso:** Use para equilibrar a carga entre a equipe.

---

### Tempo de rodízio

- **Campo:** Lista **"Tempo de Rodízio"** (em minutos).
- **Aparece quando:** O switch **Rodízio** está ativado.
- **Opções:** 2, 5, 10, 15, 30, 45 ou 60 minutos.
- **O que faz:** Define de quanto em quanto tempo o sistema **rotaciona** o atendimento para outro atendente (se aplicável).
- **Exemplo:** 10 minutos = a cada 10 min o ticket pode ser repassado para o próximo atendente da fila.

---

### Integração

- **Campo:** Lista **"Integração"**.
- **Aparece quando:** O plano da empresa tem **Integrações** habilitado.
- **Opções:** Nenhum ou uma das integrações cadastradas (FlowBuilder, Typebot, N8N, Webhook, DialogFlow, etc.).
- **O que faz:** Associa a fila a essa integração. Quando um atendimento cai nessa fila, o sistema pode iniciar o fluxo/chatbot da integração escolhida (conforme a configuração da **conexão** e do backend).
- **Dica:** Para usar FlowBuilder nessa fila, crie primeiro uma integração do tipo Flowbuilder em **Integrações** e escolha-a aqui.

---

### Lista de arquivos

- **Campo:** Lista **"Lista de arquivos"**.
- **Opções:** Nenhum ou uma das listas de arquivos cadastradas na empresa (menu **Arquivos**).
- **O que faz:** Vincula a fila a uma **lista de arquivos**. Pode ser usada em opções do tipo **Arquivo** no menu da fila, para enviar ou oferecer arquivos ao contato.
- **Uso:** Quando a fila precisa trabalhar com um conjunto de arquivos (manuais, formulários, etc.).

---

### Mensagem de saudação

- **Campo:** Área de texto **"Mensagem de saudação"** (multilinhas).
- **Obrigatório:** Não (mas recomendado).
- **O que faz:** É a **primeira mensagem** que o contato recebe quando o atendimento entra nessa fila. Pode ser uma boas-vindas e/ou instrução (ex.: "Você está na fila de Vendas. Em instantes um atendente irá atendê-lo.").
- **Dica:** Pode usar quebras de linha e texto simples; em alguns contextos o sistema pode suportar formatação.

---

### Mensagem de fora de expediente

- **Campo:** Área de texto **"Mensagem de fora de expediente"**.
- **Aparece quando:** A empresa tem **Horários de atendimento por fila** habilitado (aba **Horários de atendimento** disponível).
- **Obrigatório:** Pode ser obrigatório quando esse recurso está ativo (conforme validação do sistema).
- **O que faz:** Mensagem enviada quando o contato escreve **fora do horário** configurado na aba **Horários de atendimento**. Ex.: "No momento estamos fora do expediente. Nosso horário é de seg a sex, 8h às 18h."

---

## Opções (menu do bot/chatbot)

As **Opções** são os itens de menu que o contato pode escolher quando está nessa fila (ex.: "Falar com vendas", "Suporte", "Falar com atendente"). Cada opção tem **nome**, **tipo** e, conforme o tipo, **mensagem** e um destino (texto, atendente, fila, integração ou arquivo).

### Título da seção

- **Texto:** "Opções" (com ícone de ajuda).
- **Dica do sistema:** "Adicione opções para construir um chatbot. Se houver apenas uma opção, ela será escolhida automaticamente."

---

### Adicionar opção

- **Ação:** Clique em **"Adicionar opções"** no final da lista de opções.
- **O que faz:** Cria uma nova opção. É obrigatório informar pelo menos o **nome** e o **tipo de menu** e salvar (ícone de salvar) para a opção valer.

---

### Por opção: Nome / Descrição da opção

- **Campo:** **Nome** (ou texto que identifica a opção).
- **Obrigatório:** Sim.
- **Exemplo:** "Falar com vendas", "Enviar catálogo", "Suporte técnico".
- **Uso:** É o que aparece para o contato no menu (ou o texto que identifica a ação quando há só uma opção).

---

### Por opção: Tipo de menu

- **Campo:** Lista **"Tipo de menu"**.
- **Opções:**
  - **Texto** — Responde só com uma mensagem e segue o fluxo.
  - **Atendente** — Transfere para um **atendente** (e opcionalmente para uma **fila** desse atendente).
  - **Fila** — Transfere o atendimento para **outra fila**.
  - **Integração** — Encaminha para uma **integração** (FlowBuilder, Typebot, etc.).
  - **Arquivo** — Envia ou oferece um **arquivo** da lista de arquivos.
- **O que faz:** Define o **destino** da opção: mensagem, pessoa, fila, integração ou arquivo.

---

### Por opção: Mensagem de retorno

- **Campo:** **"Mensagem de retorno"** (ou "Mensagem") em cada opção.
- **Onde aparece:** Em todos os tipos (Texto, Atendente, Fila, Integração, Arquivo).
- **O que faz:** Mensagem enviada **antes** de executar a ação (ex.: antes de transferir ou antes de enviar o arquivo). O sistema indica que essa mensagem é importante para seguir ao próximo nível.
- **Exemplo:** "Você será transferido para o setor de vendas em instantes."

---

### Por opção (tipo **Texto**)

- **Campos:** Nome + Tipo "Texto" + Mensagem de retorno.
- **O que faz:** O bot envia a **mensagem de retorno** e pode seguir para a próxima etapa do fluxo (se houver). Não transfere e não chama integração.

---

### Por opção (tipo **Atendente**)

- **Campos adicionais:**
  - **Selecione um usuário (atendente):** Busca por nome; ao escolher, o sistema pode preencher automaticamente a fila desse atendente (se ele tiver uma fila).
  - **Fila (para transferência):** Lista de filas. Se o atendente tiver apenas uma fila, pode vir preenchida automaticamente; caso contrário, escolha a fila de destino.
- **O que faz:** Transfere o atendimento para o **atendente** escolhido e, na prática, para a **fila** selecionada (onde esse atendente atende).

---

### Por opção (tipo **Fila**)

- **Campos adicionais:**
  - **Mensagem de retorno** (obrigatória na prática).
  - **Fila para transferência:** Lista com todas as filas.
- **O que faz:** Transfere o atendimento para a **fila** escolhida. O contato passa a ser atendido por quem estiver naquela fila.

---

### Por opção (tipo **Integração**)

- **Campos adicionais:**
  - **Mensagem de retorno.**
  - **Integração:** Lista das integrações cadastradas (FlowBuilder, Typebot, etc.).
- **O que faz:** Encaminha o fluxo para a **integração** selecionada (ex.: inicia um fluxo do FlowBuilder ou do Typebot).

---

### Por opção (tipo **Arquivo**)

- **Campos adicionais:**
  - **Mensagem de retorno.**
  - **Selecione um arquivo:** Lista de arquivos cadastrados (menu **Arquivos**).
- **O que faz:** Envia ou disponibiliza o **arquivo** escolhido para o contato.

---

### Por opção: Fechar ticket

- **Campo:** Checkbox **"Fechar ticket"** em cada opção.
- **O que faz:** Se marcado, ao concluir essa opção o sistema pode **fechar o ticket** automaticamente.
- **Uso:** Opções do tipo "Encerrar atendimento" ou "Não quero mais falar" podem ter essa opção ativada.

---

## Aba: Horários de atendimento

Esta aba só aparece se a **empresa** tiver o tipo de horário **por fila** habilitado nas configurações (ex.: configuração "scheduleType" = "queue").

### Dia da semana

- **Campos:** Uma linha por dia (Segunda a Domingo).
- **Colunas (por dia):**
  - **Hora inicial – Turno A** e **Hora final – Turno A**
  - **Hora inicial – Turno B** e **Hora final – Turno B**
- **O que faz:** Define em quais **horários** a fila está em expediente. Fora desse horário, o sistema pode enviar a **Mensagem de fora de expediente** (campo da aba Dados da fila).
- **Exemplo:** Segunda a sexta, Turno A 08:00–12:00 e Turno B 13:00–18:00; sábado e domingo vazios = fora de expediente no fim de semana.

---

### Como salvar os horários

- **Dica do sistema:** Após alterar os horários, clique em **Salvar** no formulário de horários; em seguida, **salve a fila** (botão principal "Salvar" / "Adicionar") para registrar tudo.

---

## Resumo rápido dos campos

| Onde | Campo | Obrigatório | Descrição curta |
|------|--------|-------------|------------------|
| Dados da fila | Nome | Sim | Nome da fila |
| Dados da fila | Cor | Sim | Cor na interface |
| Dados da fila | Ordem da fila (Bot) | Não | Ordem no menu de filas |
| Dados da fila | Fechar ticket | Não | Fechar ticket ao finalizar |
| Dados da fila | Rodízio | Não | Distribuir em rodízio |
| Dados da fila | Tempo de rodízio | Se rodízio ativo | Intervalo em minutos (2 a 60) |
| Dados da fila | Integração | Não | Integração da fila (FlowBuilder, etc.) |
| Dados da fila | Lista de arquivos | Não | Lista de arquivos vinculada |
| Dados da fila | Mensagem de saudação | Não | Primeira mensagem ao entrar na fila |
| Dados da fila | Mensagem de fora de expediente | Conforme plano | Mensagem fora do horário |
| Opções | Nome da opção | Sim | Nome do item de menu |
| Opções | Tipo de menu | Sim | Texto, Atendente, Fila, Integração, Arquivo |
| Opções | Mensagem de retorno | Recomendado | Mensagem antes da ação |
| Opções | Fila / Atendente / Integração / Arquivo | Conforme tipo | Destino da opção |
| Opções | Fechar ticket | Não | Fechar ticket ao concluir a opção |
| Horários | Turno A e B por dia | Conforme config | Expediente da fila |

---

## Onde acessar

- **Menu:** **Administração** → **Filas**.
- **Adicionar:** Botão para abrir o modal **Adicionar fila**.
- **Editar:** Clique no ícone de editar na linha da fila para abrir **Editar fila**.

Se algum campo não aparecer (ex.: Integração, Horários de atendimento), verifique o **plano da empresa** e as **configurações** (horário por fila, integrações habilitadas).
