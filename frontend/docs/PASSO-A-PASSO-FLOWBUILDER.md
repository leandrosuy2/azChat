# Como fazer o FlowBuilder funcionar — Passo a passo completo

Guia para o **usuário do sistema**: tudo que precisa estar pronto e em que ordem, para os fluxos de conversa funcionarem de ponta a ponta.

---

## O que o FlowBuilder precisa para funcionar

Para o fluxo **rodar de verdade** (enviar e receber mensagens no WhatsApp na sua conexão), o sistema exige:

1. **Plano da empresa** com opção de integrações habilitada.
2. **Pelo menos uma fila** criada.
3. **Uma integração do tipo Flowbuilder** criada (na tela de Integrações).
4. **Uma conexão WhatsApp** criada, conectada e **configurada** (filas + integração Flowbuilder + fluxos de boas-vindas e resposta padrão).
5. **Fluxos criados e montados** (com os blocos que você quer).

Se faltar um desses, o fluxo não dispara ou não aparece onde você espera.

---

## Passo 1 — Entrar no sistema

1. Abra o PrimataZap no navegador.
2. Faça **login** com seu usuário e senha.
3. Confirme que você está dentro do painel (menu lateral visível).

---

## Passo 2 — Ter pelo menos uma fila

O fluxo é usado **junto com filas**. Sem fila, não há onde o atendimento “cair” e a integração não tem efeito.

1. No menu, vá em **Filas**.
2. Se já existir alguma fila (ex.: “Vendas”, “Suporte”), pode usar essa.
3. Se não existir, **crie uma fila**: clique em adicionar, dê um nome e salve.

---

## Passo 3 — Criar uma integração do tipo Flowbuilder

A conexão WhatsApp precisa estar ligada a uma **integração** do tipo Flowbuilder. Essa integração é criada em uma tela separada (Integrações), não dentro da fila.

1. No menu, procure e entre em **Integrações** (pode estar como “Integrações da fila” ou próximo a Filas, dependendo do menu).
2. Clique para **adicionar** uma nova integração.
3. No tipo, escolha **Flowbuilder**.
4. Dê um **nome** (ex.: “Atendimento com fluxo”).
5. Salve.

Sem essa integração, na hora de configurar a conexão você não consegue escolher “usar fluxo” e a aba **Fluxo Padrão** pode não fazer efeito.

---

## Passo 4 — Criar os fluxos (nome e blocos)

1. No menu, vá em **Fluxos** (ou “Fluxos de conversa”).
2. Clique em **Adicionar Fluxo**.
3. Digite o **nome** (ex.: “Boas-vindas”, “Resposta padrão”) e salve.
4. Na lista, clique no **nome do fluxo** ou no menu (⋮) → **Editar fluxo**.
5. No editor, **monte o fluxo**: adicione blocos (texto, imagem, menu, pergunta, etc.), ligue um ao outro e salve.
6. Repita para quantos fluxos precisar (mínimo: um para boas-vindas e um para resposta padrão, se quiser os dois).

Esses fluxos vão aparecer depois na **conexão**, na aba “Fluxo Padrão”.

---

## Passo 5 — Criar e conectar a conexão WhatsApp

1. No menu, vá em **Conexões** (Conexões WhatsApp).
2. **Adicione** uma nova conexão ou abra uma existente.
3. Conecte o WhatsApp (QR Code ou método que o sistema usar) e deixe a conexão **conectada** (status ativo).

Sem conexão conectada, nenhum fluxo envia mensagem.

---

## Passo 6 — Configurar a conexão: filas, integração e fluxos

Só criar a conexão não basta. É preciso **configurar** nela as filas, a integração Flowbuilder e quais fluxos usar.

1. Com a conexão já criada/conectada, **edite** essa conexão (abrir de novo o cadastro da conexão).
2. Vá na aba **Integrações** (ou “Integrações” / configuração de filas):
   - Em **Filas**, selecione as filas que essa conexão vai atender.
   - Em **Integração**, selecione a integração do tipo **Flowbuilder** que você criou no Passo 3.
   - Se não aparecer o campo de Integração ou a aba “Fluxo Padrão”, o **plano da empresa** pode não ter “Integrações” habilitado — aí é com o administrador do sistema.
3. Vá na aba **Fluxo Padrão**:
   - **Fluxo de boas-vindas**: escolha na lista o fluxo que deve rodar para **novos contatos** (quem manda mensagem e não está na sua lista).
   - **Fluxo de resposta padrão**: escolha o fluxo que deve rodar quando a pessoa manda **qualquer coisa que não seja uma palavra-chave** (e em alguns casos quando o atendimento já estava fechado).
4. **Salve** a conexão.

Só depois dessa configuração o FlowBuilder passa a funcionar nessa conexão: o sistema usa a integração Flowbuilder e os dois fluxos que você escolheu.

---

## Passo 7 — (Opcional) Palavras-chave e fluxos específicos

Se o sistema tiver **lista de frases** / campanhas de frase (palavra-chave → fluxo):

- Configure lá qual **palavra-chave** dispara qual **fluxo**.
- Isso é independente do “Fluxo de boas-vindas” e “Fluxo de resposta padrão” da conexão.

---

## Resumo em ordem (o que fazer e por quê)

| Ordem | O que fazer | Por quê |
|-------|-------------|--------|
| 1 | **Login** no sistema. | Sem login não acessa nada. |
| 2 | Ter **pelo menos uma fila**. | Fluxo trabalha com filas; sem fila a integração não tem onde atuar. |
| 3 | Em **Integrações**, criar uma integração tipo **Flowbuilder** (dar nome e salvar). | A conexão precisa “apontar” para uma integração Flowbuilder. |
| 4 | Em **Fluxos**, **criar e montar** os fluxos (boas-vindas, resposta padrão, etc.). | São esses fluxos que você escolhe na conexão na aba Fluxo Padrão. |
| 5 | Em **Conexões**, **criar e conectar** o WhatsApp. | Sem conexão conectada o fluxo não envia/recebe mensagem. |
| 6 | **Editar a conexão** → aba Integrações: escolher **filas** e a **integração Flowbuilder** → aba **Fluxo Padrão**: escolher **fluxo de boas-vindas** e **fluxo de resposta padrão** → Salvar. | Sem isso o sistema não sabe qual integração e quais fluxos usar nessa conexão. |

---

## Se algo não funcionar

- **Não aparece aba “Fluxo Padrão” ou campo “Integração” na conexão**  
  O plano da empresa pode não ter **Integrações** habilitado. Falar com quem administra o sistema/plano.

- **Fluxo não envia mensagem**  
  Conferir: conexão WhatsApp **conectada**; na conexão, aba Integrações com **Integração Flowbuilder** escolhida e **Fluxo Padrão** preenchido (boas-vindas e/ou resposta padrão).

- **Fluxo não dispara para novo contato**  
  Conferir na conexão se o **Fluxo de boas-vindas** está selecionado e salvo.

- **Fluxo não dispara para “qualquer mensagem”**  
  Conferir na conexão se o **Fluxo de resposta padrão** está selecionado e salvo.

- **Lista de fluxos vazia na conexão**  
  Criar e salvar pelo menos um fluxo em **Fluxos** (Passo 4); a lista da aba Fluxo Padrão vem dali.
