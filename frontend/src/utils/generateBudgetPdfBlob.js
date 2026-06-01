/**
 * Gera PDF a partir do nó montado pelo BudgetPrintDocument (mesmas opções do modal).
 */
export async function generateBudgetPdfBlob(printRootEl) {
  if (!printRootEl) {
    throw new Error("Elemento de impressão ausente.");
  }
  const mod = await import("html2pdf.js");
  const html2pdf = mod.default || mod;
  const opt = {
    margin: [10, 10, 10, 10],
    image: { type: "jpeg", quality: 0.96 },
    html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };
  return html2pdf().set(opt).from(printRootEl).outputPdf("blob");
}

export function budgetItemsTotal(items) {
  return (items || []).reduce((acc, it) => {
    const line =
      it.total != null && it.total !== ""
        ? Number(it.total)
        : Number(it.qty || 0) * Number(it.unitPrice || 0);
    return acc + line;
  }, 0);
}
