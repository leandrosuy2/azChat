# Instagram DM: configuracao e conexao de contas

## Escopo suportado

Esta integracao cobre conversas de Instagram Direct entre clientes e uma empresa:

- recebimento de mensagens de texto
- recebimento de anexos enviados por DM
- envio de mensagens de texto pelo atendente
- envio de anexos pelo atendente
- criacao de contato, ticket e historico no sistema

Nao fazem parte deste fluxo: Stories, comentarios em posts, Reels, publicacoes do feed ou automacoes fora do Direct.

## Como o sistema trabalha

O Instagram usa o mesmo bloco tecnico do Facebook:

1. O usuario faz login com Facebook no frontend.
2. O backend consulta as Paginas do Facebook desse usuario.
3. Para cada Pagina com `instagram_business_account`, o backend cria uma conexao `channel = "instagram"`.
4. A Meta entrega eventos em `POST /webhook/` com `body.object = "instagram"`.
5. O controller busca a conexao pelo `entry.id` em `facebookPageUserId`.
6. `facebookMessageListener` cria/atualiza contato, ticket e mensagem.
7. O envio usa a Graph API em `me/messages`.

Arquivos principais:

| Arquivo | Papel |
|---------|-------|
| `frontend/src/pages/Connections/index.js` | Botao de login Instagram no menu de conexoes |
| `backend/src/controllers/WhatsAppController.ts` | Recebe o token do Facebook e cria conexoes Facebook/Instagram |
| `backend/src/controllers/WebHookController.ts` | Valida webhook e roteia `page` ou `instagram` |
| `backend/src/services/FacebookServices/graphAPI.ts` | Wrapper da Graph API |
| `backend/src/services/FacebookServices/facebookMessageListener.ts` | Processa mensagens recebidas |
| `backend/src/controllers/MessageController.ts` | Envia textos/anexos do atendente |

## Requisitos da conta Instagram

Antes de conectar no sistema:

1. A conta do Instagram deve ser profissional: Business ou Creator.
2. A conta deve estar vinculada a uma Pagina do Facebook.
3. O usuario que faz login precisa ter permissao administrativa ou permissao suficiente nessa Pagina.
4. O app da Meta precisa ter o produto de Instagram/Messenger configurado e permissoes aprovadas para producao.

## Variaveis de ambiente

Backend:

```env
BACKEND_URL=https://api.seu-dominio.com
FRONTEND_URL=https://app.seu-dominio.com
FACEBOOK_APP_ID=seu_app_id
FACEBOOK_APP_SECRET=seu_app_secret
INSTAGRAM_APP_ID=seu_instagram_app_id
INSTAGRAM_APP_SECRET=seu_instagram_app_secret
VERIFY_TOKEN=um_token_forte_para_webhook
META_GRAPH_API_VERSION=v25.0
INSTAGRAM_GRAPH_API_VERSION=v25.0
META_REQUIRE_WEBHOOK_SIGNATURE=true
```

Frontend:

```env
REACT_APP_BACKEND_URL=https://api.seu-dominio.com
REACT_APP_FACEBOOK_APP_ID=seu_app_id
REACT_APP_FACEBOOK_API_VERSION=25.0
REACT_APP_REQUIRE_BUSINESS_MANAGEMENT=true
REACT_APP_INSTAGRAM_APP_ID=seu_instagram_app_id
REACT_APP_INSTAGRAM_REDIRECT_URI=https://app.seu-dominio.com/instagram/callback
REACT_APP_INSTAGRAM_SCOPE=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments
```

Notas:

- `META_GRAPH_API_VERSION` e `REACT_APP_FACEBOOK_API_VERSION` devem ficar alinhadas com uma versao suportada no app da Meta.
- `META_REQUIRE_WEBHOOK_SIGNATURE=true` faz o backend rejeitar webhook sem `X-Hub-Signature-256`.
- Para testes manuais via Postman/cURL, deixe `META_REQUIRE_WEBHOOK_SIGNATURE` ausente ou `false`.

## Configuracao no painel da Meta

1. Acesse o app em Meta for Developers.
2. Configure o Facebook Login usando a URL do frontend.
3. Configure o webhook:
   - Callback URL: `https://api.seu-dominio.com/webhook/`
   - Verify Token: mesmo valor de `VERIFY_TOKEN`
4. Assine os eventos de mensagens usados pelo sistema:
   - `messages`
   - `messaging_postbacks`
   - `message_deliveries`
   - `message_reads`
   - `message_echoes`
5. Garanta que o app tenha permissao para Instagram Messaging.

## URLs para preencher no Meta Developers

Use estas URLs em producao, trocando pelos dominios reais:

| Campo na Meta | URL |
|---------------|-----|
| App Domains | `app.seu-dominio.com`, `api.seu-dominio.com` |
| Privacy Policy URL | `https://app.seu-dominio.com/privacy` |
| Terms of Service URL | `https://app.seu-dominio.com/terms` |
| User Data Deletion | `https://api.seu-dominio.com/meta/data-deletion` |
| Webhook Callback URL | `https://api.seu-dominio.com/webhook/` |
| Webhook Verify Token | mesmo valor de `VERIFY_TOKEN` |
| Allowed Domains for JavaScript SDK | `https://app.seu-dominio.com` |
| Valid OAuth Redirect URI principal | `https://app.seu-dominio.com/connections` |
| Valid OAuth Redirect URI opcional | `https://app.seu-dominio.com/facebook/callback` |
| Valid OAuth Redirect URI opcional | `https://app.seu-dominio.com/instagram/callback` |

No projeto, estas rotas existem:

- frontend: `/privacy`
- frontend: `/terms`
- frontend: `/facebook/callback`
- frontend: `/instagram/callback`
- backend: `/meta/data-deletion`
- backend: `/meta/data-deletion/status`
- backend: `/webhook/`

O fluxo atual usa `react-facebook-login`/SDK no frontend. Nesse caso, normalmente a URL realmente usada e a tela onde o botao e clicado, como `/connections`. As rotas `/facebook/callback` e `/instagram/callback` existem apenas para evitar 404 caso voce cadastre callbacks opcionais no painel.

Para ambiente dev HTTPS na VPS, use tambem:

| Campo na Meta | URL dev |
|---------------|---------|
| App Domains | `dev-app.azvdodesigner.site`, `dev-api.azvdodesigner.site` |
| Privacy Policy URL | `https://dev-app.azvdodesigner.site/privacy` |
| Terms of Service URL | `https://dev-app.azvdodesigner.site/terms` |
| User Data Deletion | `https://dev-api.azvdodesigner.site/meta/data-deletion` |
| Webhook Callback URL | `https://dev-api.azvdodesigner.site/webhook/` |
| Allowed Domains for JavaScript SDK | `dev-app.azvdodesigner.site` |
| Valid OAuth Redirect URI principal | `https://dev-app.azvdodesigner.site/connections` |
| Valid OAuth Redirect URI opcional | `https://dev-app.azvdodesigner.site/facebook/callback` |
| Valid OAuth Redirect URI opcional | `https://dev-app.azvdodesigner.site/instagram/callback` |

Permissoes usadas no login do Instagram:

```text
public_profile
instagram_basic
instagram_manage_messages
pages_messaging
pages_show_list
pages_manage_metadata
pages_read_engagement
business_management
```

`business_management` pode ser desativada no frontend com `REACT_APP_REQUIRE_BUSINESS_MANAGEMENT=false`, mas em contas Business ela costuma evitar falhas de permissao ao listar ativos.

## Como conectar uma conta no sistema

1. Entre no sistema com um usuario da empresa.
2. Va em **Conexoes**.
3. Clique em **Adicionar** e escolha **Instagram**.
4. Faca login no Facebook com o usuario que administra a Pagina vinculada ao Instagram.
5. Aceite as permissoes solicitadas.
6. A conexao deve aparecer como `Instagram` e `CONNECTED`.
7. Envie uma DM para a conta do Instagram a partir de outro perfil.
8. Confirme se o ticket foi criado no painel.
9. Responda pelo sistema com texto e depois com um anexo.

## Checklist rapido de teste

- `GET /webhook/?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=123` retorna `123`.
- O login Instagram cria uma linha em `Whatsapps` com `channel = "instagram"`.
- Essa linha tem `facebookPageUserId` igual ao ID da conta profissional do Instagram.
- A Pagina vinculada foi assinada em `/subscribed_apps`.
- Ao receber DM, cria contato com `channel = "instagram"`.
- Ao enviar texto pelo sistema, a mensagem aparece no chat local.
- Ao enviar anexo pelo sistema, o arquivo continua acessivel em `/public/company<id>/<arquivo>`.

## Problemas comuns

**Login abre, mas nao cria conexao Instagram**

- A conta do Instagram nao esta vinculada a uma Pagina.
- O usuario logado nao administra a Pagina.
- O app nao recebeu `instagram_manage_messages`.
- A conta nao e profissional.

**Webhook valida no painel da Meta, mas DM nao chega**

- Confirme se o app esta assinado na Pagina correta.
- Confirme se a URL publica aponta para o backend certo.
- Confira logs de `WebHookController`.
- Em producao, confirme se `FACEBOOK_APP_SECRET` bate com o app que envia o webhook.

**Mensagem enviada pelo sistema nao chega no Instagram**

- Token de Pagina expirado ou sem permissao.
- A conversa pode estar fora da janela/politica permitida pela Meta.
- O contato salvo no ticket precisa ser o PSID/IGSID retornado pelo webhook.

## Referencias oficiais

- Instagram Messaging API: https://developers.facebook.com/docs/messenger-platform/instagram/
- Webhooks da Meta: https://developers.facebook.com/docs/graph-api/webhooks/
- Permissoes do Facebook Login: https://developers.facebook.com/docs/facebook-login/permissions/



No facebook, crie uma pagina para a empresa
No instagram, o perfil da empresa precisa ser business ou creator

depois, nas configurações da pagina, conecte com o instagram:
Facebook
→ sua Página
→ Configurações da Página
→ Contas vinculadas
→ Instagram
→ Conectar conta

Acesse Meta for Developers.
Vá em My Apps.
Clique em Create App ou abra o app existente.
Use um app do tipo Business, se estiver criando agora. A própria coleção oficial de Postman da Meta recomenda criar um Facebook App e, para esse tipo de guia, usar app Business.
Conecte o app ao Business Manager correto.
Preencha:
App name;
contact email;
privacy policy URL;
terms URL, se tiver;
app icon;
categoria;
domínio do app.

Em ambiente de produção, não deixe esses campos incompletos. A Meta App Review costuma reprovar integração quando o app não tem política de privacidade, vídeo claro ou instruções reproduzíveis.

Configurar domínios e URLs básicas do app

No app da Meta, vá em App Settings → Basic.

Configure:

App Domains:
app.seu-dominio.com
api.seu-dominio.com

Também configure:

Privacy Policy URL:
https://app.seu-dominio.com/privacy

Terms of Service URL:
https://app.seu-dominio.com/terms

User Data Deletion:
https://api.seu-dominio.com/meta/data-deletion


Adicionar produtos necessários no app

Você provavelmente vai precisar configurar estes blocos no painel:

6.1. Facebook Login for Business

A documentação atual da Meta descreve o Facebook Login for Business como um fluxo customizável em que você define permissões e ativos necessários ao app.

Use esse produto para o login do usuário administrador da empresa.

Configure:

Valid OAuth Redirect URIs:
https://app.seu-dominio.com/connections
https://app.seu-dominio.com/facebook/callback
https://app.seu-dominio.com/instagram/callback

A URL exata depende do seu frontend. O essencial é: a URL usada pelo FB.login ou redirect OAuth precisa estar cadastrada.

Também configure:

Allowed Domains for the JavaScript SDK:
https://app.seu-dominio.com
6.2. Instagram / Instagram Messaging

Adicione o caso de uso relacionado a Instagram, algo como:

Manage messaging and content on Instagram
