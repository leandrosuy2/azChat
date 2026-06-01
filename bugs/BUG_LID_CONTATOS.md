# Bug: Contatos sem nome e número estranho — Sistema de LID do WhatsApp

## Resumo executivo

Alguns contatos aparecem na lista como **"Sem nome (final XXXX)"** com números como `+164361469427798`. Não é bug no sistema de importação de planilhas. É consequência de uma mudança na arquitetura do WhatsApp lançada a partir de 2024.

---

## O que é o LID?

O WhatsApp introduziu o **LID (Linked ID)** — um identificador interno anônimo atribuído a cada usuário, independente do número de telefone. O objetivo declarado pelo Meta é aumentar a privacidade: o sistema funciona mesmo se o usuário trocar de número.

- **Número real (antigo):** `5511987654321@s.whatsapp.net`
- **LID (novo):** `164361469427798@lid`

O Baileys (biblioteca open-source que conecta ao WhatsApp Web) ainda não resolve LID → número real de forma confiável em todos os cenários. Isso afeta qualquer sistema que usa WhatsApp Web (não a API oficial Meta).

---

## Como o sistema importa contatos — dois modos distintos

### Modo 1: Importação por planilha Excel (.xlsx)

**Como funciona:**
- Usuário faz upload de arquivo `.xlsx` com colunas `Nome`, `Numero`, `Email`
- Sistema lê diretamente da planilha e cria os contatos com os dados fornecidos

**Limitações:**
- Nenhuma verificação automática de número (validação pelo WhatsApp está desativada por ser lenta)
- Não gera contatos `@lid` — os números vêm da planilha, são telefones normais

**Este modo NÃO é a causa do problema.**

---

### Modo 2: Importação do dispositivo (agenda do WhatsApp)

**Como funciona:**
- Sistema lê os contatos sincronizados internamente pelo Baileys (backup da agenda do WhatsApp conectado)
- O backup mistura dois formatos de contato:

| Formato | Exemplo de `id` | Tem número real? |
|---------|----------------|-----------------|
| Contato antigo | `5511987654321@s.whatsapp.net` | ✅ Sim |
| Contato novo (LID) | `164361469427798@lid` + `phoneNumber: "55119..."` | Às vezes |
| Contato novo (LID sem PN) | `164361469427798@lid` sem `phoneNumber` | ❌ Não |

**Comportamento atual:**
- Se o LID tem `phoneNumber` mapeado → importa normalmente com número real
- Se o LID **não tem** `phoneNumber` → **ignora o contato** (não importa, não gera entrada inválida)

**Este modo também NÃO é a causa dos 109 contatos problemáticos.**

---

## Onde os contatos `@lid` sem nome realmente entram no sistema

### Fonte real: mensagens recebidas

Quando um usuário com `@lid` envia uma mensagem:

1. O Baileys entrega a mensagem com `pushName` vazio (acontece em mensagens iniciais ou quando o contato está configurado para não compartilhar o nome)
2. O sistema cria o contato automaticamente para abrir o atendimento
3. Como `pushName` está vazio, o `name` salvo no banco fica `""`
4. O campo `number` recebe os dígitos do LID (`164361469427798`) — que **não é um telefone**
5. O evento `contacts.update` do Baileys deveria corrigir o nome depois (quando o WhatsApp sincroniza o `notify`/push name), mas pode demorar ou não chegar

**Resultado:** 109 contatos no banco com `name = ""` e `number = dígitos do LID`.

---

## O que o usuário via na tela (sintomas)

### 1. Nome: "Sem nome (final 7798)"
O frontend detecta `name = ""` e exibe o rótulo com os últimos 4 dígitos do número para diferenciar as linhas.

### 2. Número: "+164361469427798"
O frontend não sabia que aquele número era um LID interno. Formatava como número internacional com `+`, resultando em `+164361469427798` — que não é um telefone real e não funciona para envio.

---

## O que foi corrigido

### Fix 1 — Backend: busca nome no store interno do Baileys

**Arquivo:** `backend/src/services/WbotServices/wbotMessageListener.ts`

**Problema:** Quando `pushName` chega vazio, o sistema não tentava buscar o nome no cache interno do Baileys (`wbot.store.contacts`).

**Correção:** Antes de criar o contato, consulta `wbot.store?.contacts[remoteJid]?.notify` (push name do store) como fallback. Se o Baileys já sincronizou o nome naquela sessão, usa ele. Isso resolve contatos novos recebidos de agora em diante.

```
pushName vazio → tenta store interno → se tiver nome, usa → se não, salva vazio
                                                                   ↓
                                              contacts.update corrige quando chegar
```

### Fix 2 — Frontend: exibição correta de LIDs na lista de contatos

**Arquivo:** `frontend/src/pages/Contacts/index.js`

**Problema:** A função `displayContactNumberForList` não identificava LIDs e formatava os dígitos internos como número internacional (`+164...`).

**Correção:** Adicionada detecção de LID (padrão: 14–16 dígitos começando com `1`, ou `remoteJid` terminando em `@lid`). Quando detectado, exibe **"Número não disponível (ID interno WhatsApp)"** em vez de um número inválido.

---

## O que NÃO foi corrigido (limitação estrutural)

Os **109 contatos já existentes** no banco com `name = ""` e number = LID precisam de tratamento separado:

- **Nome:** Será atualizado automaticamente quando esses contatos enviarem nova mensagem (o `contacts.update` do Baileys atualiza o nome quando recebe o `notify`)
- **Número:** O número real (telefone) desses contatos é **desconhecido** pelo sistema. O WhatsApp não expõe o mapeamento LID → telefone via WhatsApp Web exceto em contexto de mensagem ativa ou sincronização. Para cadastrar o telefone, é necessário:
  1. Aguardar o contato enviar nova mensagem (o sistema captura `pushName` e associa)
  2. Editar manualmente o contato e adicionar o telefone no campo "TELEFONE 1" dos campos extras
  3. O botão "Importar do aparelho" pode resolver parcialmente se o celular conectado tiver esse contato na agenda com `phoneNumber` mapeado

---

## Por que isso acontece com o WhatsApp Web e não com a API oficial

| | WhatsApp Web (Baileys) | API Oficial Meta |
|---|---|---|
| Custo | Gratuito | Pago por mensagem |
| LID → telefone | Limitado, depende de sincronização | Transparente (API resolve) |
| Aprovação Meta | Não oficial | Oficial |
| Recursos | Completos (grupos, stickers, áudio) | Limitados pelo plano |

O sistema usa WhatsApp Web por custo e flexibilidade. O LID é uma limitação da própria plataforma neste modo de acesso.

---

## Impacto operacional

| Cenário | Impacto |
|---------|---------|
| Contatos importados por planilha | ✅ Nenhum — dados vêm da planilha |
| Novos atendimentos de contatos @lid | 🟡 Melhorado com o fix — nome busca no cache do Baileys |
| 109 contatos existentes sem nome | 🟡 Nome corrige quando mandam nova mensagem |
| Envio para contatos @lid | ❌ Não tem telefone real — envio pelo ticket (JID) funciona, mas número não aparece |
| Exibição do número na lista | ✅ Corrigido — mostra "Número não disponível" em vez de `+16436...` |

---

## Recomendação ao cliente

1. **Curto prazo:** As correções já aplicadas melhoram a experiência para novos atendimentos e limpa a exibição na lista de contatos.

2. **Médio prazo:** Para os contatos existentes sem nome/número, o ideal é aguardar nova interação deles (o sistema atualiza automaticamente) ou exportar a lista e complementar com os dados reais via importação Excel.

3. **Longo prazo:** Se o volume de contatos `@lid` crescer e o problema de resolução de número for crítico para operação, a alternativa é migrar para a **API Oficial do WhatsApp Business (Meta)**, que resolve LID → telefone de forma transparente. Isso tem custo por mensagem mas elimina essa categoria de problema.
