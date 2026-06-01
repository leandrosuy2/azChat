import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  IconButton,
  Typography,
  Box,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  useMediaQuery,
  useTheme,
  Paper,
  Chip,
  CircularProgress,
  InputAdornment,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import GetAppIcon from "@material-ui/icons/GetApp";
import SendIcon from "@material-ui/icons/Send";
import SaveIcon from "@material-ui/icons/Save";
import BusinessIcon from "@material-ui/icons/Business";
import PersonIcon from "@material-ui/icons/Person";
import ShoppingCartIcon from "@material-ui/icons/ShoppingCart";
import NoteIcon from "@material-ui/icons/Note";
import VisibilityIcon from "@material-ui/icons/Visibility";
import AutorenewIcon from "@material-ui/icons/Autorenew";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { contactHasWhatsAppDestination } from "../../utils/resolveContactWhatsAppPhone";
import { generateBudgetPdfBlob } from "../../utils/generateBudgetPdfBlob";

/** PDF monocromático (documento comercial). */
const PDF_BLACK = "#111111";
const PDF_TEXT = "#222222";
const PDF_MUTED = "#555555";
const PDF_BORDER = "#cccccc";
const PDF_RULE = "#000000";

const getExtra = (extraInfo, name) => {
  if (!extraInfo || !Array.isArray(extraInfo)) return "";
  const f = extraInfo.find(
    (x) => (x.name || "").toLowerCase() === String(name).toLowerCase()
  );
  return f?.value != null && f?.value !== "" ? String(f.value).trim() : "";
};

/** Monta endereço e CEP como no ContactDrawer (campos extras + colunas do contato). */
const buildClientFromContact = (c) => {
  if (!c || !c.id) {
    return {
      name: "",
      doc: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      email: "",
      phone: "",
    };
  }
  const ex = c.extraInfo || [];
  const street = getExtra(ex, "endereco");
  const num =
    getExtra(ex, "numero_endereco") || getExtra(ex, "numero");
  const comp = getExtra(ex, "complemento");
  const district = getExtra(ex, "bairro");
  const cep = getExtra(ex, "cep");
  const city = getExtra(ex, "cidade") || c.city || "";
  const state = getExtra(ex, "estado") || c.state || "";

  const lineA = [street, num].filter(Boolean).join(", ");
  const lineB = [comp, district].filter(Boolean).join(" — ");
  const address = [lineA, lineB].filter(Boolean).join(" • ");

  const doc =
    getExtra(ex, "CPF") ||
    getExtra(ex, "CNPJ") ||
    getExtra(ex, "cpf") ||
    getExtra(ex, "cnpj") ||
    getExtra(ex, "documento") ||
    "";

  let phone = (c.number || "").replace(/\D/g, "");
  if (phone.length >= 10) {
    const ddd = phone.slice(0, 2);
    const rest = phone.slice(2);
    const p1 = rest.length === 9 ? rest.slice(0, 5) : rest.slice(0, 4);
    const p2 = rest.length === 9 ? rest.slice(5) : rest.slice(4);
    phone = `(${ddd}) ${p1}-${p2}`;
  } else {
    phone = c.number || "";
  }

  return {
    name: (c.name || "").trim(),
    doc,
    address,
    city: city.trim(),
    state: state.trim(),
    zip: cep,
    email: (c.email || "").trim(),
    phone,
  };
};

const addDaysIso = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const emptyItem = () => ({
  code: "",
  description: "",
  qty: 1,
  unitPrice: 0,
  total: 0,
});

const fmtMoney = (n) =>
  (Number(n) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const useStyles = makeStyles((theme) => ({
  titleBar: {
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    padding: theme.spacing(2, 2.5),
    margin: theme.spacing(-2, -2, 0),
    marginBottom: theme.spacing(2),
    borderRadius: 0,
    borderBottom: `2px solid ${theme.palette.type === "dark" ? "#444" : "#000"}`,
  },
  titleSub: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
    fontSize: "0.8rem",
  },
  metaRow: {
    marginBottom: theme.spacing(2),
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontWeight: 600,
    fontSize: "0.9rem",
    color: theme.palette.text.primary,
  },
  sectionIcon: {
    color: theme.palette.text.secondary,
    fontSize: 20,
  },
  accordionRoot: {
    boxShadow: "none",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "4px !important",
    marginBottom: theme.spacing(1.5),
    overflow: "hidden",
    "&:before": { display: "none" },
  },
  accordionSummary: {
    minHeight: 48,
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
  },
  totalBox: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(1.5, 2),
    borderRadius: 0,
    background: "transparent",
    border: `2px solid ${theme.palette.type === "dark" ? "#666" : "#000"}`,
    textAlign: "right",
  },
  totalValue: {
    fontWeight: 700,
    fontSize: "1.25rem",
    color: theme.palette.text.primary,
  },
  linkBox: {
    padding: theme.spacing(1.5),
    borderRadius: 0,
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.grey[900] : theme.palette.grey[100],
    border: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  previewAccordion: {
    marginTop: theme.spacing(1),
  },
  previewPanel: {
    padding: 8,
    background: theme.palette.type === "dark" ? "#1a1a1a" : "#f5f5f5",
    border: `1px solid ${theme.palette.divider}`,
  },
  actions: {
    padding: theme.spacing(1.5, 2),
    gap: theme.spacing(1),
    flexWrap: "wrap",
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  btnDark: {
    backgroundColor: theme.palette.type === "dark" ? "#e0e0e0" : "#212121",
    color: theme.palette.type === "dark" ? "#111" : "#fff",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "#fff" : "#000",
    },
  },
}));

/** Bloco HTML só para PDF — estilos inline para o html2canvas. */
const BudgetPrintDocument = React.forwardRef(function BudgetPrintDocument(
  {
    companyBlock,
    clientBlock,
    sellerName,
    notes,
    items,
    totals,
    budgetNumber,
    validUntil,
  },
  ref
) {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const validLabel = validUntil
    ? new Date(validUntil + "T12:00:00").toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <div
      ref={ref}
      style={{
        fontFamily: '"Times New Roman", Times, Georgia, serif',
        color: PDF_TEXT,
        background: "#ffffff",
        padding: "24px 28px 32px",
        maxWidth: 720,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          borderTop: `3px double ${PDF_RULE}`,
          borderBottom: `1px solid ${PDF_BORDER}`,
          padding: "12px 0 14px",
          marginBottom: 20,
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top", width: "58%" }}>
                {companyBlock.logoUrl ? (
                  <img
                    src={companyBlock.logoUrl}
                    alt=""
                    crossOrigin="anonymous"
                    style={{
                      maxWidth: 150,
                      maxHeight: 56,
                      objectFit: "contain",
                      marginBottom: 8,
                      display: "block",
                    }}
                  />
                ) : null}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: PDF_BLACK,
                    marginBottom: 4,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {companyBlock.name || "—"}
                </div>
                <div style={{ fontSize: 10, color: PDF_MUTED, lineHeight: 1.5 }}>
                  {companyBlock.phone ? <div>{companyBlock.phone}</div> : null}
                  {companyBlock.email ? <div>{companyBlock.email}</div> : null}
                  {companyBlock.document ? <div>CNPJ {companyBlock.document}</div> : null}
                </div>
              </td>
              <td style={{ verticalAlign: "top", textAlign: "right" }}>
                <div
                  style={{
                    display: "inline-block",
                    textAlign: "right",
                    border: `1px solid ${PDF_BLACK}`,
                    padding: "12px 16px",
                    minWidth: 200,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      color: PDF_MUTED,
                      marginBottom: 4,
                    }}
                  >
                    Orçamento
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: PDF_BLACK }}>
                    {budgetNumber || "—"}
                  </div>
                  <div style={{ fontSize: 10, color: PDF_MUTED, marginTop: 8 }}>
                    <span style={{ color: PDF_TEXT, fontWeight: 600 }}>Data: </span>
                    {today}
                  </div>
                  <div style={{ fontSize: 10, color: PDF_MUTED, marginTop: 2 }}>
                    <span style={{ color: PDF_TEXT, fontWeight: 600 }}>Validade: </span>
                    {validLabel}
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        style={{
          border: `1px solid ${PDF_BORDER}`,
          padding: "14px 16px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: PDF_MUTED,
            fontWeight: 600,
            marginBottom: 8,
            borderBottom: `1px solid ${PDF_BORDER}`,
            paddingBottom: 6,
          }}
        >
          Cliente
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: PDF_BLACK }}>
          {clientBlock.name || "—"}
        </div>
        <div style={{ fontSize: 10, color: PDF_MUTED, lineHeight: 1.55 }}>
          {clientBlock.doc ? <div>CPF/CNPJ: {clientBlock.doc}</div> : null}
          {clientBlock.phone ? <div>Tel.: {clientBlock.phone}</div> : null}
          {clientBlock.email ? <div>E-mail: {clientBlock.email}</div> : null}
          {clientBlock.address || clientBlock.city || clientBlock.state || clientBlock.zip ? (
            <div style={{ marginTop: 4 }}>
              {[clientBlock.address, [clientBlock.city, clientBlock.state].filter(Boolean).join("/"), clientBlock.zip ? `CEP ${clientBlock.zip}` : ""]
                .filter(Boolean)
                .join(" · ")}
            </div>
          ) : null}
          {sellerName ? (
            <div style={{ marginTop: 6, color: PDF_TEXT }}>
              Representante: {sellerName}
            </div>
          ) : null}
        </div>
      </div>

      <div
        style={{
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: PDF_MUTED,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Discriminação dos itens
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 10,
          border: `1px solid ${PDF_BLACK}`,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "8px 6px",
                textAlign: "center",
                width: 40,
                borderBottom: `2px solid ${PDF_BLACK}`,
                borderRight: `1px solid ${PDF_BORDER}`,
                fontWeight: 700,
              }}
            >
              Item
            </th>
            <th
              style={{
                padding: "8px 8px",
                textAlign: "left",
                borderBottom: `2px solid ${PDF_BLACK}`,
                borderRight: `1px solid ${PDF_BORDER}`,
                fontWeight: 700,
              }}
            >
              Descrição
            </th>
            <th
              style={{
                padding: "8px 6px",
                textAlign: "right",
                width: 48,
                borderBottom: `2px solid ${PDF_BLACK}`,
                borderRight: `1px solid ${PDF_BORDER}`,
                fontWeight: 700,
              }}
            >
              Qtd.
            </th>
            <th
              style={{
                padding: "8px 6px",
                textAlign: "right",
                width: 80,
                borderBottom: `2px solid ${PDF_BLACK}`,
                borderRight: `1px solid ${PDF_BORDER}`,
                fontWeight: 700,
              }}
            >
              V. unit.
            </th>
            <th
              style={{
                padding: "8px 6px",
                textAlign: "right",
                width: 84,
                borderBottom: `2px solid ${PDF_BLACK}`,
                fontWeight: 700,
              }}
            >
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const lineTotal =
              it.total != null && it.total !== ""
                ? Number(it.total)
                : Number(it.qty || 0) * Number(it.unitPrice || 0);
            return (
              <tr key={i}>
                <td
                  style={{
                    padding: "7px 6px",
                    textAlign: "center",
                    borderBottom: `1px solid ${PDF_BORDER}`,
                    borderRight: `1px solid ${PDF_BORDER}`,
                  }}
                >
                  {it.code || i + 1}
                </td>
                <td
                  style={{
                    padding: "7px 8px",
                    borderBottom: `1px solid ${PDF_BORDER}`,
                    borderRight: `1px solid ${PDF_BORDER}`,
                  }}
                >
                  {it.description}
                </td>
                <td
                  style={{
                    padding: "7px 6px",
                    textAlign: "right",
                    borderBottom: `1px solid ${PDF_BORDER}`,
                    borderRight: `1px solid ${PDF_BORDER}`,
                  }}
                >
                  {it.qty}
                </td>
                <td
                  style={{
                    padding: "7px 6px",
                    textAlign: "right",
                    borderBottom: `1px solid ${PDF_BORDER}`,
                    borderRight: `1px solid ${PDF_BORDER}`,
                  }}
                >
                  {fmtMoney(it.unitPrice)}
                </td>
                <td
                  style={{
                    padding: "7px 6px",
                    textAlign: "right",
                    fontWeight: 600,
                    borderBottom: `1px solid ${PDF_BORDER}`,
                  }}
                >
                  {fmtMoney(lineTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <table style={{ width: "100%", marginTop: 14, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td />
            <td style={{ width: 260, verticalAlign: "top" }}>
              <div
                style={{
                  border: `2px solid ${PDF_BLACK}`,
                  padding: "12px 14px",
                  textAlign: "right",
                }}
              >
                <div style={{ fontSize: 9, color: PDF_MUTED, marginBottom: 2 }}>TOTAL GERAL</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: PDF_BLACK }}>{fmtMoney(totals)}</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {notes ? (
        <div
          style={{
            marginTop: 20,
            paddingTop: 12,
            borderTop: `1px solid ${PDF_BORDER}`,
            fontSize: 10,
            color: PDF_MUTED,
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: PDF_BLACK, fontWeight: 600 }}>Observações. </span>
          {notes}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 24,
          paddingTop: 12,
          borderTop: `1px solid ${PDF_BORDER}`,
          fontSize: 8,
          color: PDF_MUTED,
          textAlign: "center",
          lineHeight: 1.45,
        }}
      >
        Documento para fins de cotação / proposta comercial.
        <br />
        Em caso de dúvidas, utilize os dados de contato do emitente no cabeçalho.
      </div>
    </div>
  );
});

const BudgetOrcamentoModal = ({
  open,
  onClose,
  ticket,
  contact,
  user,
  editBudgetId,
  onAfterSave,
}) => {
  const theme = useTheme();
  const classes = useStyles();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const printRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [validUntil, setValidUntil] = useState("");
  const [kanbanTagId, setKanbanTagId] = useState("");
  const [kanbanTags, setKanbanTags] = useState([]);
  const [budgetNumber, setBudgetNumber] = useState(null);
  const [publicToken, setPublicToken] = useState(null);
  const [savedId, setSavedId] = useState(null);

  const [companyBlock, setCompanyBlock] = useState({
    name: "",
    phone: "",
    email: "",
    document: "",
    logoUrl: "",
  });
  const [clientBlock, setClientBlock] = useState({
    name: "",
    doc: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    email: "",
    phone: "",
  });
  const [sellerName, setSellerName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([emptyItem()]);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, it) =>
          acc +
          (it.total != null && it.total !== ""
            ? Number(it.total)
            : Number(it.qty || 0) * Number(it.unitPrice || 0)),
        0
      ),
    [items]
  );

  /** Mescla ticket + prop (socket pode deixar um dos dois incompleto). */
  const contactForWhatsApp = useMemo(
    () => ({ ...(ticket?.contact || {}), ...(contact || {}) }),
    [ticket?.contact, contact]
  );

  const recalcLine = (row) => {
    const qty = Number(row.qty) || 0;
    const unit = Number(row.unitPrice) || 0;
    return { ...row, total: Math.round(qty * unit * 100) / 100 };
  };

  const applyContactAuto = useCallback(async (c) => {
    if (!c?.id) {
      setClientBlock({
        name: "",
        doc: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        email: "",
        phone: "",
      });
      return;
    }
    try {
      const { data } = await api.get(`/contacts/${c.id}`);
      setClientBlock(buildClientFromContact(data));
    } catch {
      setClientBlock(buildClientFromContact(c));
    }
  }, []);

  const resetFromProps = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const { data: comp } = await api.get(`/companies/${user.companyId}`);
      setCompanyBlock({
        name: comp.name || "",
        phone: comp.phone || "",
        email: comp.email || "",
        document: comp.document || "",
        logoUrl: "",
      });
    } catch (e) {
      toastError(e);
    }

    if (contact?.id) {
      await applyContactAuto(contact);
    } else {
      setClientBlock({
        name: "",
        doc: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        email: "",
        phone: "",
      });
    }

    setSellerName(user?.name || "");
    setNotes("");
    setItems([emptyItem()]);
    setValidUntil(addDaysIso(new Date(), 30));
    setKanbanTagId("");
    setBudgetNumber(null);
    setPublicToken(null);
    setSavedId(null);

    const qg = ticket?.quadroGroupId;
    if (qg) {
      try {
        const { data } = await api.get("/tag/kanban/", {
          params: { quadroGroupId: qg },
        });
        const list = Array.isArray(data?.lista) ? data.lista : [];
        setKanbanTags(list);
      } catch {
        setKanbanTags([]);
      }
    } else {
      setKanbanTags([]);
    }
  }, [user, contact, ticket, applyContactAuto]);

  useEffect(() => {
    if (!open) {
      setSavedId(null);
      setBudgetNumber(null);
      setPublicToken(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editBudgetId) {
      (async () => {
        setLoading(true);
        try {
          const { data } = await api.get(`/ticket-budgets/${editBudgetId}`);
          const p = data.payload || {};
          setCompanyBlock({
            name: p.company?.name || "",
            phone: p.company?.phone || "",
            email: p.company?.email || "",
            document: p.company?.document || "",
            logoUrl: p.company?.logoUrl || "",
          });
          setClientBlock({
            name: p.client?.name || "",
            doc: p.client?.doc || "",
            address: p.client?.address || "",
            city: p.client?.city || "",
            state: p.client?.state || "",
            zip: p.client?.zip || "",
            email: p.client?.email || "",
            phone: p.client?.phone || "",
          });
          setSellerName(p.sellerName || "");
          setNotes(p.notes || "");
          setItems(
            (p.items || []).length
              ? p.items.map((it) => recalcLine({ ...it }))
              : [emptyItem()]
          );
          setValidUntil(data.validUntil || "");
          setKanbanTagId(
            p.automation?.kanbanTagId != null
              ? String(p.automation.kanbanTagId)
              : ""
          );
          setBudgetNumber(data.budgetNumber);
          setPublicToken(data.publicToken);
          setSavedId(data.id);
        } catch (e) {
          toastError(e);
        } finally {
          setLoading(false);
        }
      })();
      return;
    }
    resetFromProps();
  }, [open, editBudgetId, resetFromProps]);

  const handleRefreshClient = () => {
    if (contact?.id) {
      applyContactAuto(contact);
      toast.success("Dados do cliente atualizados a partir do cadastro.");
    } else {
      toast.info("Não há contato vinculado ao ticket.");
    }
  };

  const buildPayload = () => ({
    company: { ...companyBlock },
    client: { ...clientBlock },
    sellerName,
    notes: notes || undefined,
    items: items.map((it, i) =>
      recalcLine({
        ...it,
        code: it.code || String(i + 1),
      })
    ),
    automation:
      kanbanTagId !== "" && !Number.isNaN(Number(kanbanTagId))
        ? { kanbanTagId: Number(kanbanTagId) }
        : undefined,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = buildPayload();
      if (editBudgetId || savedId) {
        const id = editBudgetId || savedId;
        await api.put(`/ticket-budgets/${id}`, {
          validUntil: validUntil || null,
          payload,
        });
        toast.success("Orçamento atualizado.");
      } else {
        const { data } = await api.post("/ticket-budgets", {
          ticketId: ticket?.id ?? null,
          contactId: contact?.id ?? null,
          validUntil: validUntil || null,
          payload,
        });
        setSavedId(data.id);
        setBudgetNumber(data.budgetNumber);
        setPublicToken(data.publicToken);
        toast.success("Orçamento salvo.");
      }
      if (onAfterSave) onAfterSave();
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePdf = async () => {
    const el = printRef.current;
    if (!el) return;
    try {
      const mod = await import("html2pdf.js");
      const html2pdf = mod.default || mod;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `orcamento-${budgetNumber || "rascunho"}.pdf`,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: { scale: 2, useCORS: true, logging: false, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      html2pdf().set(opt).from(el).save();
    } catch (e) {
      toastError(e);
    }
  };

  const handleSendWa = async () => {
    const id = editBudgetId || savedId;
    if (!id) {
      toast.warning("Salve o orçamento antes de enviar pelo WhatsApp.");
      return;
    }
    if (!ticket?.id || !contactForWhatsApp?.id) {
      toast.warning("Ticket sem contato — não é possível enviar pelo WhatsApp.");
      return;
    }
    if (!contactHasWhatsAppDestination(contactForWhatsApp)) {
      toast.warning("Nenhum número vinculado ao contato.");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/ticket-budgets/${id}/send-link-whatsapp`);
      toast.success("Link enviado pelo WhatsApp.");
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPdfWhatsApp = async () => {
    const id = editBudgetId || savedId;
    if (!id) {
      toast.warning("Salve o orçamento antes de enviar pelo WhatsApp.");
      return;
    }
    if (!ticket?.id || !contactForWhatsApp?.id) {
      toast.warning("Ticket sem contato — não é possível enviar pelo WhatsApp.");
      return;
    }
    if (!contactHasWhatsAppDestination(contactForWhatsApp)) {
      toast.warning("Nenhum número vinculado ao contato.");
      return;
    }
    const el = printRef.current;
    if (!el) {
      toast.warning("Não foi possível montar o PDF. Tente fechar e abrir o orçamento.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const blob = await generateBudgetPdfBlob(printRef.current);
      const fd = new FormData();
      fd.append("pdf", blob, `orcamento-${budgetNumber || id}.pdf`);
      await api.post(`/ticket-budgets/${id}/send-pdf-whatsapp`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("PDF enviado pelo WhatsApp.");
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  const publicLink = publicToken
    ? `${window.location.origin}/orcamento/${publicToken}`
    : "";

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (idx) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

  const textFieldProps = {
    variant: "outlined",
    margin: "dense",
    fullWidth: true,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      PaperProps={{
        elevation: 2,
        style: { borderRadius: fullScreen ? 0 : 4 },
      }}
    >
      <DialogContent style={{ paddingTop: 16 }}>
        <Box className={classes.titleBar}>
          <Typography variant="h6" style={{ fontWeight: 700 }}>
            {editBudgetId || savedId ? "Editar orçamento" : "Novo orçamento"}
          </Typography>
          <Typography className={classes.titleSub}>
            {budgetNumber
              ? `Nº ${budgetNumber} · Preenchimento inteligente a partir da empresa e do contato`
              : "Dados da empresa e do cliente carregados automaticamente quando possível"}
          </Typography>
        </Box>

        {loading && (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={32} style={{ color: "#757575" }} />
          </Box>
        )}

        <Grid container spacing={2} className={classes.metaRow}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Proposta válida até"
              type="date"
              value={validUntil || ""}
              onChange={(e) => {
                const v = e.target.value;
                setValidUntil(v);
              }}
              InputLabelProps={{ shrink: true }}
              helperText="Padrão: 30 dias a partir de hoje (ajuste se precisar)"
              {...textFieldProps}
            />
          </Grid>
          {kanbanTags.length > 0 && (
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Ao aprovar: mover card no Kanban"
                value={kanbanTagId}
                onChange={(e) => {
                  const v = e.target.value;
                  setKanbanTagId(v);
                }}
                helperText="Opcional — mesma área de trabalho do ticket"
                {...textFieldProps}
              >
                <MenuItem value="">
                  <em>Não mover automaticamente</em>
                </MenuItem>
                {kanbanTags.map((t) => (
                  <MenuItem key={t.id} value={String(t.id)}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
        </Grid>

        <Accordion defaultExpanded className={classes.accordionRoot}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
            <Box className={classes.sectionHeader} style={{ marginBottom: 0 }}>
              <BusinessIcon className={classes.sectionIcon} />
              Emitente
            </Box>
          </AccordionSummary>
          <AccordionDetails style={{ display: "block" }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="URL do logo (ex.: link do seu site ou Google Drive público)"
                  value={companyBlock.logoUrl}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCompanyBlock((s) => ({ ...s, logoUrl: v }));
                  }}
                  placeholder="https://..."
                  {...textFieldProps}
                />
              </Grid>
              {["name", "phone", "email", "document"].map((f) => (
                <Grid item xs={12} sm={6} key={f}>
                  <TextField
                    label={
                      f === "name"
                        ? "Razão social / nome fantasia"
                        : f === "document"
                          ? "CNPJ"
                          : f === "phone"
                            ? "Telefone / WhatsApp comercial"
                            : "E-mail"
 }
                    value={companyBlock[f]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCompanyBlock((s) => ({ ...s, [f]: v }));
                    }}
                    {...textFieldProps}
                  />
                </Grid>
              ))}
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded className={classes.accordionRoot}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1}>
              <Box className={classes.sectionHeader} style={{ marginBottom: 0 }}>
                <PersonIcon className={classes.sectionIcon} />
                Cliente
              </Box>
              <Tooltip title="Buscar de novo no cadastro do contato">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AutorenewIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRefreshClient();
                  }}
                  disabled={!contact?.id}
                >
                  Atualizar do cadastro
                </Button>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails style={{ display: "block" }}>
            {contact?.id ? (
              <Chip
                size="small"
                label="Dados carregados do cadastro do contato"
                style={{ marginBottom: 12, borderColor: "#bdbdbd" }}
                variant="outlined"
              />
            ) : (
              <Chip
                size="small"
                label="Sem contato no ticket — preenchimento manual"
                style={{ marginBottom: 12, borderColor: "#bdbdbd" }}
                variant="outlined"
              />
            )}
            <Grid container spacing={2}>
              {[
                ["name", "Nome ou razão social"],
                ["doc", "CPF / CNPJ"],
                ["phone", "Telefone / WhatsApp"],
                ["email", "E-mail"],
                ["address", "Endereço (rua, nº, bairro)"],
                ["city", "Cidade"],
                ["state", "UF"],
                ["zip", "CEP"],
              ].map(([key, label]) => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    label={label}
                    value={clientBlock[key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setClientBlock((s) => ({ ...s, [key]: v }));
                    }}
                    {...textFieldProps}
                  />
                </Grid>
              ))}
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Vendedor / responsável"
                  value={sellerName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSellerName(v);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography variant="caption" color="textSecondary">
                          @
                        </Typography>
                      </InputAdornment>
                    ),
                  }}
                  {...textFieldProps}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded className={classes.accordionRoot}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
            <Box className={classes.sectionHeader} style={{ marginBottom: 0 }}>
              <ShoppingCartIcon className={classes.sectionIcon} />
              Itens e valores
            </Box>
          </AccordionSummary>
          <AccordionDetails style={{ display: "block" }}>
            <Box width="100%">
              {items.map((row, idx) => (
                <Paper key={idx} variant="outlined" style={{ padding: 12, marginBottom: 10, borderRadius: 0 }}>
                  <Grid container spacing={1} alignItems="flex-start">
                    <Grid item xs={6} sm={2}>
                      <TextField
                        label="Cód."
                        size="small"
                        value={row.code}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, code: v } : r))
                          );
                        }}
                        variant="outlined"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        label="Descrição do produto ou serviço"
                        size="small"
                        value={row.description}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, description: v } : r
                            )
                          );
                        }}
                        variant="outlined"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <TextField
                        label="Qtd"
                        size="small"
                        type="number"
                        value={row.qty}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) =>
                            prev.map((r, i) =>
                              i === idx ? recalcLine({ ...r, qty: v }) : r
                            )
                          );
                        }}
                        variant="outlined"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={4} sm={2}>
                      <TextField
                        label="Valor unit. (R$)"
                        size="small"
                        type="number"
                        value={row.unitPrice}
                        onChange={(e) => {
                          const v = e.target.value;
                          setItems((prev) =>
                            prev.map((r, i) =>
                              i === idx ? recalcLine({ ...r, unitPrice: v }) : r
                            )
                          );
                        }}
                        variant="outlined"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={3} sm={1}>
                      <TextField
                        label="Total"
                        size="small"
                        value={fmtMoney(row.total)}
                        InputProps={{ readOnly: true }}
                        variant="outlined"
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={1} sm={1} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Tooltip title="Remover linha">
                        <IconButton size="small" onClick={() => removeRow(idx)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <Button
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
                onClick={addRow}
                style={{ marginTop: 4 }}
              >
                Adicionar linha
              </Button>
              <Box className={classes.totalBox}>
                <Typography variant="caption" color="textSecondary">
                  Total do orçamento
                </Typography>
                <Typography className={classes.totalValue}>{fmtMoney(totals)}</Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion className={classes.accordionRoot}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
            <Box className={classes.sectionHeader} style={{ marginBottom: 0 }}>
              <NoteIcon className={classes.sectionIcon} />
              Observações ao cliente
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TextField
              multiline
              minRows={3}
              fullWidth
              variant="outlined"
              placeholder="Condições de pagamento, prazo de entrega, garantia..."
              value={notes}
              onChange={(e) => {
                const v = e.target.value;
                setNotes(v);
              }}
            />
          </AccordionDetails>
        </Accordion>

        {publicLink ? (
          <Box className={classes.linkBox}>
            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
              Link para o cliente aprovar online
            </Typography>
            <Typography
              variant="body2"
              component="a"
              href={publicLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ wordBreak: "break-all", color: "inherit", textDecoration: "underline" }}
            >
              {publicLink}
            </Typography>
          </Box>
        ) : null}

        <Accordion className={`${classes.accordionRoot} ${classes.previewAccordion}`}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} className={classes.accordionSummary}>
            <Box className={classes.sectionHeader} style={{ marginBottom: 0 }}>
              <VisibilityIcon className={classes.sectionIcon} />
              Pré-visualização do PDF
            </Box>
          </AccordionSummary>
          <AccordionDetails className={classes.previewPanel}>
            <BudgetPrintDocument
              companyBlock={companyBlock}
              clientBlock={clientBlock}
              sellerName={sellerName}
              notes={notes}
              items={items}
              totals={totals}
              budgetNumber={budgetNumber}
              validUntil={validUntil}
            />
          </AccordionDetails>
        </Accordion>

        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            transform: "translateX(-14000px)",
            width: 800,
            pointerEvents: "none",
          }}
          aria-hidden
        >
          <BudgetPrintDocument
            ref={printRef}
            companyBlock={companyBlock}
            clientBlock={clientBlock}
            sellerName={sellerName}
            notes={notes}
            items={items}
            totals={totals}
            budgetNumber={budgetNumber}
            validUntil={validUntil}
          />
        </div>
      </DialogContent>
      <DialogActions className={classes.actions}>
        <Button onClick={onClose}>Fechar</Button>
        <Button startIcon={<GetAppIcon />} variant="outlined" onClick={handlePdf} disabled={loading}>
          Baixar PDF
        </Button>
        <Button
          variant="contained"
          style={{ backgroundColor: "#25d366", color: "#fff" }}
          startIcon={<SendIcon />}
          onClick={handleSendPdfWhatsApp}
          disabled={loading}
        >
          Enviar PDF (WhatsApp)
        </Button>
        <Button variant="outlined" startIcon={<SendIcon />} onClick={handleSendWa} disabled={loading}>
          Enviar link (WhatsApp)
        </Button>
        <Button
          variant="contained"
          className={classes.btnDark}
          disableElevation
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={loading}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { BudgetPrintDocument };
export default BudgetOrcamentoModal;
