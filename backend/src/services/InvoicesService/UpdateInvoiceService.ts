import AppError from "../../errors/AppError";
import Invoice from "../../models/Invoices";
import LogCompanyLifecycleEventService from "../CompanyService/LogCompanyLifecycleEventService";

interface InvoiceData {
  status: string;
  id?: number | string;
}

const UpdateInvoiceService = async (InvoiceData: InvoiceData): Promise<Invoice> => {
  const { id, status } = InvoiceData;

  const invoice = await Invoice.findByPk(id);

  if (!invoice) {
    throw new AppError("ERR_NO_INVOICE_FOUND", 404);
  }

  const prevStatus = invoice.status;
  await invoice.update({
    status,
  });

  try {
    const paid = ["paid", "pago", "approved", "aprovado", "confirmado"].includes(
      String(status || "").toLowerCase()
    );
    const wasPaid = ["paid", "pago", "approved", "aprovado", "confirmado"].includes(
      String(prevStatus || "").toLowerCase()
    );
    if (paid && !wasPaid) {
      await LogCompanyLifecycleEventService({
        companyId: invoice.companyId,
        eventType: "pagamento_confirmado",
        title: "Pagamento confirmado",
        description: `${invoice.detail || "Fatura"} — R$ ${Number(invoice.value).toFixed(2)}`,
        previousStatus: prevStatus,
        newStatus: status,
        metadata: { invoiceId: invoice.id }
      });
    } else if (status !== prevStatus) {
      await LogCompanyLifecycleEventService({
        companyId: invoice.companyId,
        eventType: "alteracao_status",
        title: "Status da fatura alterado",
        description: invoice.detail || undefined,
        previousStatus: prevStatus,
        newStatus: status,
        metadata: { invoiceId: invoice.id }
      });
    }
  } catch {
    /* noop */
  }

  return invoice;
};

export default UpdateInvoiceService;
