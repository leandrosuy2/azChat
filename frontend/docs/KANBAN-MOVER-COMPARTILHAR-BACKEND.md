# Kanban – Mover e Compartilhar (backend)

Este documento descreve o que o frontend envia para **Mover** e **Compartilhar** e o que o backend deve implementar.

---

## 1. Mover ticket (sai do quadro atual)

O usuário escolhe **Mover** para tirar o ticket da área atual e colocá-lo em outra área (e opcionalmente em uma etapa e/ou atendente). O ticket **some** do quadro atual.

### Endpoint

- **POST** `/tickets/:ticketId/quadro/move`

### Body

```json
{
  "targetGroupId": 2,
  "targetTagId": 5,
  "userId": 3
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `targetGroupId` | number | Sim | ID da área de trabalho (quadro group) de destino. O ticket deixa de aparecer na área de origem e passa a aparecer só nesta área. |
| `targetTagId` | number | Não | ID da tag (etapa/coluna) na área de destino. Se omitido, ticket fica "Em aberto" na área de destino. |
| `userId` | number | Não | ID do usuário (atendente) a quem atribuir o ticket. |

### Comportamento esperado

- O ticket deve deixar de ser exibido na área de origem (e, se existir lógica de “área principal” do ticket, passar a ter a área de destino como principal).
- Na área de destino, o ticket deve aparecer na etapa indicada por `targetTagId` (ou Em aberto) e, se `userId` for enviado, atribuído a esse atendente.

---

## 2. Compartilhar (com vínculo e etapas)

O usuário escolhe **Compartilhar** para que o card apareça em outras áreas, podendo escolher **etapas** por área e se o compartilhamento é **vinculado** ou **desvinculado**.

### Endpoint

- **POST** `/tickets/:ticketId/quadro/share`

### Body (novo contrato)

```json
{
  "groupIds": [2, 3],
  "linkType": "linked",
  "sharedStagesByGroup": {
    "2": [5, 6],
    "3": [5, 6, 7]
  }
}
```

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `groupIds` | number[] | Sim | IDs das áreas com as quais o ticket será compartilhado. |
| `linkType` | string | Não (default: `"linked"`) | `"linked"` ou `"unlinked"`. |
| `sharedStagesByGroup` | object | Não | Chaves = `groupId` (string); valores = array de `tagId` (number). Indica em quais etapas (colunas) o card aparece em cada área. Se omitido ou vazio para uma área, o card pode aparecer em todas as etapas dessa área (comportamento a definir no backend). |

### linkType: Manter vinculado x Desvincular

- **`linked` (Manter vinculado)**  
  - Existe um único “quadro” (dados) do ticket.  
  - Alterações feitas em qualquer área (Produção, Financeiro, etc.) refletem em todas as outras.  
  - O backend deve registrar **histórico** de onde foi alterado (ex.: “Alterado em Produção”, “Alterado em Financeiro”) para exibir no front (ex.: GET do quadro ou GET de logs).

- **`unlinked` (Desvincular ao compartilhar)**  
  - O backend pode criar **cópias** do quadro por área (ou por grupo), de forma que cada área edita sua própria versão.  
  - As informações **não** se espelham entre áreas.

### Resposta no GET do ticket / quadro

Para o front exibir o estado atual do compartilhamento e as etapas por área, convém retornar algo como:

- `quadroSharedGroupIds` ou `sharedQuadroGroupIds`: array de IDs das áreas compartilhadas.
- `quadroLinkType`: `"linked"` ou `"unlinked"`.
- `quadroSharedStagesByGroup`: objeto `{ [groupId]: tagId[] }` com as etapas por área (quando existir).

---

## 3. Resumo

| Ação | Método | URL | Body principal |
|------|--------|-----|----------------|
| Mover ticket | POST | `/tickets/:ticketId/quadro/move` | `targetGroupId`, `targetTagId?`, `userId?` |
| Compartilhar | POST | `/tickets/:ticketId/quadro/share` | `groupIds`, `linkType?`, `sharedStagesByGroup?` |

Com isso, o front consegue usar **Mover** (ticket saindo do quadro atual) e **Compartilhar** (com escolha de etapas e opção manter vinculado ou desvincular).
