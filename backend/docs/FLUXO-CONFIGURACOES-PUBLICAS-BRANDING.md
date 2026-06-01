# Fluxo: Configurações Públicas de Branding (logo, cores, nome)

## Visão geral

O frontend busca **logo, cores e nome da aplicação** do banco de dados via uma rota pública do
backend, sem necessitar de autenticação JWT. Esse mecanismo permite que a tela de login já exiba
a identidade visual correta antes de qualquer usuário estar logado.

---

## Diagrama do fluxo

```
Frontend (App.js / useSettings)
  │
  ├─ getPublicSetting("primaryColorLight")
  ├─ getPublicSetting("primaryColorDark")
  ├─ getPublicSetting("appLogoLight")
  ├─ getPublicSetting("appLogoDark")
  ├─ getPublicSetting("appLogoFavicon")
  └─ getPublicSetting("appName")
        │
        └─ GET /public-settings/:key?token=<ENV_TOKEN>
             │
             ├─ Middleware: envTokenAuth.ts
             │    └─ Verifica se query ?token === process.env.ENV_TOKEN
             │         ✓ → next()
             │         ✗ → 403 "Token inválido"
             │
             └─ Controller: SettingController.publicShow
                  └─ Service: GetPublicSettingService
                       ├─ Valida se a key está na whitelist (publicSettingsKeys)
                       └─ SELECT Settings WHERE companyId=1 AND key=:key
```

---

## Arquivos envolvidos

| Arquivo | Papel |
|---------|-------|
| `frontend/src/hooks/useSettings/index.js` | Chama `GET /public-settings/:key?token=wtV` via `openApi` (sem JWT) |
| `frontend/src/App.js` | Consome `getPublicSetting` e aplica os valores no tema MUI e `document.title` |
| `backend/src/routes/settingRoutes.ts` | Define a rota pública `GET /public-settings/:settingKey` |
| `backend/src/middleware/envTokenAuth.ts` | Valida o `?token` contra `process.env.ENV_TOKEN` |
| `backend/src/controllers/SettingController.ts` | Handler `publicShow` |
| `backend/src/services/SettingServices/GetPublicSettingService.ts` | Consulta o banco com whitelist de keys |

---

## Variáveis de ambiente necessárias

| Onde | Variável | Valor em dev | Descrição |
|------|----------|-------------|-----------|
| Backend `.env` / `.env.dev` | `ENV_TOKEN` | `wtV` | Token que o frontend envia no `?token`. Deve bater com o valor hardcoded em `useSettings/index.js` |

> **Nota de segurança:** o token não é segredo de alta criticidade — ele apenas evita que a rota
> pública seja chamada de forma completamente aberta. As keys acessíveis estão restritas por
> whitelist em `GetPublicSettingService.ts`.

---

## Keys permitidas (whitelist)

Definidas em `GetPublicSettingService.ts`:

```ts
const publicSettingsKeys = [
  "allowSignup",
  "primaryColorLight",
  "primaryColorDark",
  "appLogoLight",
  "appLogoDark",
  "appLogoFavicon",
  "appName"
]
```

Qualquer key fora dessa lista retorna `null` sem consultar o banco.

---

## Como alterar logo/cores/nome

Os valores ficam salvos na tabela `Settings` do banco (empresa `companyId = 1`).
Para alterá-los em desenvolvimento:

1. Acesse o painel admin do sistema após fazer login
2. Vá em **Configurações → Aparência** (ou equivalente)
3. Faça upload do logo e defina as cores — o sistema chama `PUT /settings/:key` com JWT

Alternativamente, atualize diretamente no banco:

```sql
UPDATE "Settings"
SET value = 'Meu App'
WHERE key = 'appName' AND "companyId" = 1;
```

---

## Como alterar o ENV_TOKEN

Se precisar trocar o token (ex.: em produção usar um valor mais seguro):

1. Atualize `ENV_TOKEN` no `.env` do backend
2. Atualize o `token` hardcoded em `frontend/src/hooks/useSettings/index.js` linha ~33:
   ```js
   const params = { token: "novo-token-aqui" }
   ```
3. Faça rebuild do frontend
