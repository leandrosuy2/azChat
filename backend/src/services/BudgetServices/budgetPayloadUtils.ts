import { BudgetPayloadStored } from "../../models/TicketBudget";

export const normalizePayloadLikeCreate = (
  p: BudgetPayloadStored
): BudgetPayloadStored => ({
  company: {
    name: String(p.company?.name ?? "").trim(),
    phone: String(p.company?.phone ?? "").trim(),
    email: String(p.company?.email ?? "").trim(),
    document: String(p.company?.document ?? "").trim(),
    logoUrl: p.company?.logoUrl ? String(p.company.logoUrl).trim() : undefined
  },
  client: {
    name: String(p.client?.name ?? "").trim(),
    doc: String(p.client?.doc ?? "").trim(),
    address: String(p.client?.address ?? "").trim(),
    city: String(p.client?.city ?? "").trim(),
    state: String(p.client?.state ?? "").trim(),
    zip: String(p.client?.zip ?? "").trim(),
    email: String(p.client?.email ?? "").trim(),
    phone: String(p.client?.phone ?? "").trim()
  },
  sellerName: String(p.sellerName ?? "").trim(),
  notes: p.notes ? String(p.notes) : undefined,
  items: Array.isArray(p.items)
    ? p.items.map((it, i) => {
        const qty = Number(it.qty) || 0;
        const unitPrice = Number(it.unitPrice) || 0;
        const total =
          it.total != null && !Number.isNaN(Number(it.total))
            ? Number(it.total)
            : Math.round(qty * unitPrice * 100) / 100;
        return {
          code: String(it.code ?? `${i + 1}`),
          description: String(it.description ?? ""),
          qty,
          unitPrice,
          total,
          productId:
            it.productId != null && !Number.isNaN(Number(it.productId))
              ? Number(it.productId)
              : undefined,
          unit: it.unit ? String(it.unit).trim() : undefined,
          category: it.category ? String(it.category).trim() : undefined
        };
      })
    : [],
  automation: p.automation?.kanbanTagId != null
    ? { kanbanTagId: Number(p.automation.kanbanTagId) }
    : undefined
});

export const sumBudgetItems = (
  items: BudgetPayloadStored["items"]
): number => {
  const s = items.reduce((acc, it) => acc + (Number(it.total) || 0), 0);
  return Math.round(s * 100) / 100;
};

/** Título curto para listagens (itens / observação / número). */
export const displayTitleFromPayload = (
  payload: BudgetPayloadStored | null | undefined,
  budgetNumber: string
): string => {
  const norm = normalizePayloadLikeCreate(
    payload ||
      ({
        company: { name: "", phone: "", email: "", document: "" },
        client: {
          name: "",
          doc: "",
          address: "",
          city: "",
          state: "",
          zip: "",
          email: "",
          phone: ""
        },
        sellerName: "",
        items: []
      } as BudgetPayloadStored)
  );
  const descs = norm.items
    .map((i) => String(i.description || "").trim())
    .filter(Boolean);
  if (descs.length === 1) return descs[0];
  if (descs.length > 1) return `${descs[0]} (+${descs.length - 1})`;
  const noteLine = (norm.notes || "").trim().split("\n")[0]?.trim() || "";
  if (noteLine) {
    return noteLine.length > 52 ? `${noteLine.slice(0, 49)}…` : noteLine;
  }
  return (budgetNumber || "").trim() || "Orçamento";
};
