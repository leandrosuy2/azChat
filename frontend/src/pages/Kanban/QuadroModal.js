import React, { useState, useEffect, useRef, useContext, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  makeStyles,
  useTheme,
  useMediaQuery,
  Paper,
  Typography,
  Box,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  TextField,
  CircularProgress,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import Alert from "@material-ui/lab/Alert";
import Close from "@material-ui/icons/Close";
import Refresh from "@material-ui/icons/Refresh";
import Edit from "@material-ui/icons/Edit";
import PersonAdd from "@material-ui/icons/PersonAdd";
import WhatsApp from "@material-ui/icons/WhatsApp";
import HelpOutline from "@material-ui/icons/HelpOutline";
import Save from "@material-ui/icons/Save";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import Link from "@material-ui/icons/Link";
import Image from "@material-ui/icons/Image";
import FormatListBulleted from "@material-ui/icons/FormatListBulleted";
import Add from "@material-ui/icons/Add";
import AttachFile from "@material-ui/icons/AttachFile";
import Delete from "@material-ui/icons/Delete";
import Share from "@material-ui/icons/Share";
import SwapHoriz from "@material-ui/icons/SwapHoriz";
import History from "@material-ui/icons/History";
import Settings from "@material-ui/icons/Settings";
import FiberManualRecord from "@material-ui/icons/FiberManualRecord";
import {
  Dialog as StatusDialog,
  DialogTitle as StatusDialogTitle,
  DialogContent as StatusDialogContent,
  DialogActions as StatusDialogActions,
} from "@material-ui/core";
import InputAdornment from "@material-ui/core/InputAdornment";
import Divider from "@material-ui/core/Divider";
import FileCopy from "@material-ui/icons/FileCopy";
import Create from "@material-ui/icons/Create";
import ArrowBack from "@material-ui/icons/ArrowBack";
import ArrowForward from "@material-ui/icons/ArrowForward";
import ExpandMore from "@material-ui/icons/ExpandMore";
import ExpandLess from "@material-ui/icons/ExpandLess";
import CreateNewFolder from "@material-ui/icons/CreateNewFolder";
import Folder from "@material-ui/icons/Folder";
import ViewModule from "@material-ui/icons/ViewModule";
import ArrowUpward from "@material-ui/icons/ArrowUpward";
import ArrowDownward from "@material-ui/icons/ArrowDownward";
import NotificationsActive from "@material-ui/icons/NotificationsActive";
import Send from "@material-ui/icons/Send";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import { CopyToClipboard } from "react-copy-to-clipboard";
import api from "../../services/api";
import { format, parseISO } from "date-fns";
import { AuthContext } from "../../context/Auth/AuthContext";
import { isSocketClientReady } from "../../utils/socketClient";
import { toast } from "react-toastify";
import formatSerializedId from "../../utils/formatSerializedId";
import resolveContactWhatsAppPhone from "../../utils/resolveContactWhatsAppPhone";
import { openWhatsAppWebFromContact } from "../../utils/kanbanWhatsApp";

function newProcessoDetalheItem() {
  return {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    titulo: "",
    descricao: "",
  };
}

/** API: detalhesProcessoItens[]; migra texto legado detalhesProcesso para um item único. */
function normalizeProcessoDetalhesItensFromQuadro(quadro) {
  if (!quadro) return [];
  const raw = quadro.detalhesProcessoItens;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((x, i) => ({
      id: String(x.id || "").trim() || `p_${Date.now()}_${i}`,
      titulo: String(x.titulo ?? ""),
      descricao: String(x.descricao ?? ""),
    }));
  }
  const legacy = quadro.detalhesProcesso;
  if (legacy != null && String(legacy).trim() !== "") {
    return [
      {
        id: "legacy_texto_livre",
        titulo: "Notas anteriores (texto livre)",
        descricao: String(legacy),
      },
    ];
  }
  return [];
}

const LEMBRETE_GATILHO_OPTIONS = [
  { value: "agendado", label: "Data e hora fixa (agendado)" },
  { value: "prazo_proximo", label: "Antes do prazo (alerta)" },
  { value: "prazo_vencido", label: "No atraso / vencido" },
  { value: "movimentacao", label: "Mudança de coluna (Kanban)" },
  { value: "mudanca_status", label: "Mudança de status do quadro" },
  { value: "anexo_adicionado", label: "Novo anexo no cartão" },
];

/** Normaliza hora para HH:mm (API / Sequelize). */
function normalizeLembreteHora(h) {
  const s = String(h || "").trim();
  if (!s) return "";
  const parts = s.split(":");
  const hh = String(parseInt(parts[0], 10) || 0).padStart(2, "0");
  const mm = String(parseInt(parts[1], 10) || 0).padStart(2, "0");
  return `${hh}:${mm}`;
}

const LEMBRETE_DESTINO_OPTIONS = [
  { value: "interno", label: "Só alerta no sistema" },
  { value: "responsavel", label: "Só o responsável pelo ticket" },
  { value: "fila", label: "Grupo/Fila (escolha o grupo)" },
  { value: "usuario", label: "Usuário específico (escolha o atendente)" },
  { value: "contato_whatsapp", label: "Contato do ticket (WhatsApp)" },
];

/** Evita crash do MUI Select: `value` tem de existir num MenuItem. */
function normalizeKanbanLembreteTipoGatilho(raw) {
  const v = String(raw || "").trim();
  return LEMBRETE_GATILHO_OPTIONS.some((o) => o.value === v) ? v : "prazo_proximo";
}

function normalizeKanbanLembreteDestinoTipo(raw) {
  const v = String(raw || "").trim();
  return LEMBRETE_DESTINO_OPTIONS.some((o) => o.value === v) ? v : "interno";
}

function pickValidDestinoFilaId(destinoId, queues) {
  const list = Array.isArray(queues) ? queues : [];
  const idStr = destinoId != null && destinoId !== "" ? String(destinoId) : "";
  if (!idStr) return "";
  return list.some((q) => String(q.id) === idStr) ? idStr : "";
}

const AUTO_MOVE_WHATSAPP_MARKER = "[AUTO_MOVE_WHATSAPP]";

/** Pré-visualização local (mesmas variáveis que o backend). */
function previewKanbanLembreteTemplate(template) {
  let out = (template && String(template).trim()) || "";
  const apply = (aliases, val) => {
    for (const key of aliases) {
      const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      out = out.replace(new RegExp(`\\{\\{${esc}\\}\\}`, "gi"), val);
      out = out.replace(new RegExp(`\\{${esc}\\}`, "gi"), val);
    }
  };
  apply(["nomeCard", "nome_card"], "Meu projeto exemplo");
  apply(["coluna", "nome_coluna", "COLUNA"], "Produção");
  apply(["status", "STATUS"], "Em andamento");
  apply(["data", "DATA"], "31/12/2026");
  apply(["contato", "nome_contato"], "Cliente Exemplo");
  apply(["responsavel", "responsável"], "Maria (responsável)");
  apply(["arquivo", "anexo"], "orcamento.pdf");
  return out || "—";
}

const useStyles = makeStyles((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      maxWidth: 920,
      width: "min(100%, 920px)",
      margin: theme.spacing(2),
      maxHeight: "min(96vh, 920px)",
      borderRadius: 14,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      boxShadow: theme.shadows[8],
      [theme.breakpoints.down("xs")]: {
        margin: theme.spacing(1),
        width: "calc(100% - 16px)",
        maxHeight: "calc(100vh - 16px)",
        borderRadius: 12,
      },
    },
  },
  dialogTitle: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: theme.spacing(1),
  },
  /** Cabeçalho do quadro dentro do scroll (área, cartão, telefone, status, ações) */
  modalHeaderSection: {
    marginBottom: theme.spacing(2),
  },
  /** Cartão elevado no topo: separa visualmente do fundo cinza do scroll */
  headerSurface: {
    padding: theme.spacing(2, 2.25),
    borderRadius: 12,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: theme.palette.type === "dark" ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(1.75, 1.5),
    },
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
  },
  headerMetaRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1, 1.5),
    marginTop: theme.spacing(1.25),
    paddingTop: theme.spacing(1.25),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  dialogContent: {
    flex: "1 1 auto",
    minHeight: 0,
    maxHeight: "calc(96vh - 32px)",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    overscrollBehavior: "contain",
    padding: theme.spacing(2, 2),
    [theme.breakpoints.up("sm")]: {
      padding: theme.spacing(2.5, 3),
    },
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50],
  },
  modalAccordion: {
    marginBottom: theme.spacing(1.5),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.palette.type === "dark" ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
    "&:before": { display: "none" },
    overflow: "hidden",
  },
  modalAccordionSummary: {
    minHeight: 52,
    paddingLeft: theme.spacing(1.75),
    paddingRight: theme.spacing(1),
    "&.Mui-expanded": { minHeight: 52 },
    "& .MuiAccordionSummary-content": {
      margin: theme.spacing(1.15, 0),
      alignItems: "center",
    },
  },
  modalAccordionDetails: {
    padding: theme.spacing(0, 2, 2),
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
    borderTop: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50],
  },
  modalAccordionTitle: {
    fontWeight: 700,
    fontSize: "0.95rem",
    display: "flex",
    alignItems: "center",
    gap: 10,
    letterSpacing: "-0.01em",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    gap: theme.spacing(2),
    padding: theme.spacing(4),
  },
  sectionPaper: {
    padding: theme.spacing(2, 2.25),
    marginBottom: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.palette.type === "dark" ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
    transition: "box-shadow 0.2s ease",
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(1.75, 1.5),
      marginBottom: theme.spacing(1.5),
    },
  },
  sectionHeading: {
    fontWeight: 700,
    fontSize: "0.95rem",
    marginBottom: theme.spacing(1.5),
    paddingLeft: theme.spacing(1.5),
    borderLeft: `4px solid ${theme.palette.primary.main}`,
    color: theme.palette.text.primary,
    letterSpacing: "-0.01em",
    lineHeight: 1.35,
  },
  sectionSubtext: {
    marginBottom: theme.spacing(1.5),
    marginTop: theme.spacing(-0.5),
    paddingLeft: theme.spacing(1.5),
    borderLeft: `4px solid transparent`,
  },
  readOnlyHtmlBox: {
    padding: theme.spacing(2),
    borderRadius: 8,
    // Escuro: HTML colado costuma vir com cor preta — “ilha” clara mantém descrição legível.
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[200]
        : theme.palette.grey[100],
    color:
      theme.palette.type === "dark"
        ? "rgba(0,0,0,0.87)"
        : theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    minHeight: 48,
    wordBreak: "break-word",
    "& p": { margin: "0.35em 0" },
    "& ul": { margin: "0.35em 0", paddingLeft: 22 },
    "& a": {
      color: theme.palette.primary.dark,
      textDecoration: "underline",
    },
  },
  valuesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))",
    gap: theme.spacing(2),
    alignItems: "flex-end",
    marginBottom: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  saldoHighlight: {
    padding: theme.spacing(1, 1.5),
    borderRadius: 8,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(76, 175, 80, 0.12)" : theme.palette.success.light + "33",
    border: `1px solid ${theme.palette.success.main}44`,
    fontWeight: 700,
    fontSize: "0.95rem",
    color: theme.palette.text.primary,
    gridColumn: "1 / -1",
    [theme.breakpoints.up("sm")]: {
      gridColumn: "span 1",
    },
  },
  valuesSaveRow: {
    gridColumn: "1 / -1",
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(0.5),
  },
  processoItemPaper: {
    padding: theme.spacing(1.5, 1.75),
    marginBottom: theme.spacing(1.5),
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50],
  },
  processoItemHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  processoItemActions: {
    display: "flex",
    flexShrink: 0,
    gap: 2,
  },
  processoReadRow: {
    marginBottom: theme.spacing(1.25),
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:last-child": {
      borderBottom: "none",
      marginBottom: 0,
      paddingBottom: 0,
    },
  },
  processoAccordionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    cursor: "pointer",
    userSelect: "none",
    padding: theme.spacing(0.75, 0.5),
    margin: theme.spacing(0, -0.5),
    borderRadius: 8,
    flex: 1,
    minWidth: 0,
    textAlign: "left",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  },
  processoAccordionChevron: {
    transition: "transform 0.2s ease",
    color: theme.palette.text.secondary,
    flexShrink: 0,
  },
  processoAccordionChevronOpen: {
    transform: "rotate(180deg)",
  },
  processoAccordionMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    flexWrap: "wrap",
  },
  statusChip: {
    fontWeight: 600,
    height: 28,
    "& .MuiChip-label": { paddingLeft: 10, paddingRight: 10 },
  },
  coverWrapper: {
    width: "100%",
    maxHeight: 240,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: theme.palette.grey[200],
    marginBottom: theme.spacing(2),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  coverPlaceholder: {
    padding: theme.spacing(3),
    color: theme.palette.text.secondary,
    textAlign: "center",
    fontSize: "0.9rem",
  },
  statusSelect: {
    minWidth: 160,
    [theme.breakpoints.down("xs")]: {
      width: "100%",
      maxWidth: "100%",
      minWidth: 0,
    },
  },
  actionsRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(2),
  },
  editorCard: {
    padding: 0,
    marginBottom: 0,
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
    padding: theme.spacing(1, 0),
    borderBottom: "1px solid",
    borderColor: theme.palette.divider,
    marginBottom: theme.spacing(1),
  },
  editorArea: {
    minHeight: 100,
    padding: theme.spacing(2),
    border: "1px solid",
    borderColor: theme.palette.divider,
    borderRadius: 4,
    outline: "none",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[900]
        : theme.palette.background.paper,
    color: theme.palette.text.primary,
    "&:focus": { borderColor: theme.palette.primary.main },
    "& ul": { margin: "8px 0", paddingLeft: 24 },
    "& p": { margin: "4px 0" },
  },
  editorButtons: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2),
    flexWrap: "wrap",
  },
  attachmentsSection: {
    padding: 0,
    marginTop: 0,
  },
  attachmentItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5),
    border: "1px solid",
    borderColor: theme.palette.divider,
    borderRadius: 8,
    marginBottom: theme.spacing(1),
  },
  attachmentCapa: {
    fontSize: "0.7rem",
    marginLeft: 8,
    padding: "2px 6px",
    borderRadius: 4,
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
  },
  logsSection: {
    padding: 0,
    marginTop: 0,
  },
  logsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    userSelect: "none",
    "&:hover": { opacity: 0.85 },
  },
  logsList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: theme.spacing(1),
    maxHeight: 200,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  logRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 6,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[50],
    border: "1px solid",
    borderColor: theme.palette.divider,
    fontSize: "0.78rem",
    flexWrap: "wrap",
  },
  logDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  logTime: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    fontSize: "0.72rem",
    minWidth: 110,
  },
  logLabel: {
    flex: 1,
    color: theme.palette.text.primary,
    "& span": { color: theme.palette.text.secondary },
  },
  logUser: {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    fontStyle: "italic",
  },
  addAttachmentBtn: { marginTop: theme.spacing(1) },
  inputFile: { display: "none" },
  attachIconInline: {
    marginRight: 8,
    color: theme.palette.text.secondary,
  },
  financeBlockTitle: {
    fontWeight: 600,
    marginBottom: 10,
    color: theme.palette.text.secondary,
  },
  smallMutedIcon: {
    fontSize: 14,
    color: theme.palette.text.secondary,
  },
  attachmentCategoryHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 1.5),
    backgroundColor: theme.palette.grey[100],
    borderRadius: 8,
    marginTop: theme.spacing(1),
    cursor: "pointer",
    "&:hover": { backgroundColor: theme.palette.grey[200] },
  },
  attachmentGroupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 1.5),
    backgroundColor: theme.palette.primary.main + "18",
    borderRadius: 8,
    marginTop: theme.spacing(1),
    cursor: "pointer",
    border: "1px solid",
    borderColor: theme.palette.primary.main + "40",
    "&:hover": { backgroundColor: theme.palette.primary.main + "22" },
  },
  attachmentItemClickable: {
    cursor: "pointer",
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },
  capaPickerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1),
  },
  capaPickerTile: {
    cursor: "pointer",
    borderRadius: 8,
    overflow: "hidden",
    border: "2px solid",
    borderColor: theme.palette.divider,
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  capaPickerTileActive: {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 1px ${theme.palette.primary.main}`,
  },
  capaPickerImg: {
    width: "100%",
    height: 96,
    objectFit: "cover",
    display: "block",
    backgroundColor: theme.palette.grey[200],
  },
  capaPickerTileLabel: {
    padding: theme.spacing(0.5, 0.75),
    fontSize: "0.7rem",
    lineHeight: 1.25,
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  lightboxBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.92)",
    zIndex: theme.zIndex.modal + 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    color: "#fff",
    zIndex: 1,
  },
  lightboxNav: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#fff",
    zIndex: 1,
  },
  lightboxContent: {
    maxWidth: "90vw",
    maxHeight: "85vh",
    objectFit: "contain",
  },
  lightboxCaption: {
    color: "#fff",
    marginTop: 12,
    textAlign: "center",
    padding: "0 48px",
  },
  changeClientRow: { marginBottom: theme.spacing(2), width: "100%" },
  changeClientAutocomplete: {
    minWidth: 280,
    flex: "1 1 200px",
    [theme.breakpoints.down("xs")]: {
      minWidth: "100%",
    },
  },
  contactSection: {
    padding: theme.spacing(0.5, 0, 0, 0),
    marginBottom: 0,
  },
  contactHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  contactPhoneRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  contactFieldsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  contactFieldFull: {
    gridColumn: "1 / -1",
  },
  contactSectionTitle: {
    fontWeight: 600,
    fontSize: 13,
    color: theme.palette.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    gridColumn: "1 / -1",
    marginTop: theme.spacing(1),
  },
  contactChipContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    gridColumn: "1 / -1",
  },
  contactProductChip: {
    backgroundColor: theme.palette.primary.light,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 12,
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  processoMediaRow: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
  },
  processoThumbWrap: {
    position: "relative",
    width: 92,
    height: 92,
    flexShrink: 0,
  },
  processoThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: 8,
    cursor: "pointer",
    border: `1px solid ${theme.palette.divider}`,
    display: "block",
    backgroundColor: theme.palette.grey[100],
  },
  processoDocTile: {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: 160,
    padding: theme.spacing(1),
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    cursor: "pointer",
    fontSize: "0.75rem",
    gap: 6,
    flexShrink: 0,
    "&:hover": { backgroundColor: theme.palette.action.hover },
  },
  processoAnexoActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginTop: theme.spacing(0.5),
    alignItems: "center",
  },
}));

// Deve coincidir com ListQuadroStatusesService (backend) para o Select reconhecer o status vindo do banco antes do GET /quadro-statuses.
const DEFAULT_STATUSES = [
  { value: "aguardando", label: "Aguardando", color: "#fbc02d" },
  { value: "em_andamento", label: "Em andamento", color: "#1976d2" },
  { value: "concluido", label: "Concluído", color: "#388e3c" },
  { value: "cancelado", label: "Cancelado", color: "#d32f2f" },
];

/** Ex.: em_andamento → Em andamento (para status sem label amigável no servidor). */
function humanizeStatusToken(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Ordem: servidor primeiro; mantém status criados só no cliente até o próximo save. */
function mergeStatusLists(serverList, localList) {
  const server = Array.isArray(serverList) ? serverList : [];
  const local = Array.isArray(localList) ? localList : [];
  const byVal = new Map();
  server.forEach((s) => {
    if (s?.value) {
      const lbl = (s.label || "").trim() || humanizeStatusToken(s.value);
      byVal.set(s.value, { value: s.value, label: lbl, color: s.color || "#9e9e9e" });
    }
  });
  local.forEach((s) => {
    if (s?.value && !byVal.has(s.value)) {
      const lbl = (s.label || "").trim() || humanizeStatusToken(s.value);
      byVal.set(s.value, { value: s.value, label: lbl, color: s.color || "#9e9e9e" });
    }
  });
  const order = [
    ...server.map((s) => s.value).filter(Boolean),
    ...local.map((s) => s.value).filter((v) => v && !server.some((s) => s.value === v)),
  ];
  const seen = new Set();
  const out = [];
  order.forEach((v) => {
    if (!v || seen.has(v)) return;
    seen.add(v);
    const row = byVal.get(v);
    if (row) out.push(row);
  });
  return out.length ? out : [...DEFAULT_STATUSES];
}

function ensureStatusInOptions(value, setStatusOptions) {
  if (value == null || value === "") return;
  const v = String(value).trim();
  if (!v) return;
  setStatusOptions((prev) => {
    if (prev.some((o) => o.value === v)) return prev;
    return [...prev, { value: v, label: humanizeStatusToken(v), color: "#9e9e9e" }];
  });
}

function mapStatusesFromApi(list) {
  return (Array.isArray(list) ? list : [])
    .map((s) => {
      const value =
        s.value ||
        String(s.label || "")
          .toLowerCase()
          .replace(/\s+/g, "_") ||
        "";
      const labelRaw = (s.label || s.name || "").trim();
      return {
        value,
        label: labelRaw || humanizeStatusToken(value),
        color: s.color || "#1976d2",
      };
    })
    .filter((s) => s.value);
}

/** Label e cor para o valor salvo no quadro (evita exibir snake_case). Aceita valor ou rótulo. */
function getQuadroStatusMeta(statusValue, statusList) {
  const v = String(statusValue ?? "").trim();
  if (!v) return { label: "—", color: "#9e9e9e" };
  const list = Array.isArray(statusList) && statusList.length > 0 ? statusList : DEFAULT_STATUSES;
  let opt = list.find((o) => o.value === v);
  if (!opt) {
    opt = list.find((o) => (o.label || "").trim().toLowerCase() === v.toLowerCase());
  }
  if (opt) {
    return { label: opt.label || humanizeStatusToken(opt.value), color: opt.color || "#9e9e9e" };
  }
  return { label: humanizeStatusToken(v) || v, color: "#9e9e9e" };
}

const ATTACHMENT_TYPE_ORDER = ["JPG", "PNG", "CDR", "PSD", "PDF", "Vídeos", "Áudios", "Outros"];
const ATTACHMENT_TYPE_LABELS = { JPG: "JPG", PNG: "PNG", CDR: "CDR (Corel)", PSD: "PSD", PDF: "PDF", Vídeos: "Vídeos", Áudios: "Áudios", Outros: "Outros" };

function getAttachmentTypeCategory(name) {
  if (!name || typeof name !== "string") return "Outros";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const isVideo = /^(mp4|webm|mov|avi|mkv|m4v)$/.test(ext) || (name && /video/i.test(name));
  const isAudio = /^(mp3|wav|ogg|m4a|aac|wma)$/.test(ext) || (name && /audio/i.test(name));
  if (isVideo) return "Vídeos";
  if (isAudio) return "Áudios";
  if (["jpg", "jpeg"].includes(ext)) return "JPG";
  if (ext === "png") return "PNG";
  if (["cdr", "eps"].includes(ext)) return "CDR";
  if (ext === "psd") return "PSD";
  if (ext === "pdf") return "PDF";
  return "Outros";
}

/** Arquivo escolhido no input: imagem para capa (tipo MIME ou extensão). */
function isLocalFileImage(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  const ext = (file.name || "").split(".").pop()?.toLowerCase() || "";
  return /^(jpe?g|png|gif|webp|bmp|heic|heif|svg)$/i.test(ext);
}

function isAttachmentImageFilename(name) {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  return /^(jpe?g|png|gif|webp|bmp|svg)$/i.test(ext);
}

function groupAttachmentsByType(attachments) {
  const byType = {};
  attachments.forEach((att) => {
    const cat = getAttachmentTypeCategory(att.name);
    if (!byType[cat]) byType[cat] = [];
    byType[cat].push(att);
  });
  return ATTACHMENT_TYPE_ORDER.filter((cat) => byType[cat]?.length).map((cat) => ({ category: cat, items: byType[cat] }));
}

/** Chave normalizada para comparar nomes de campo do quadro */
function normalizeQuadroCustomFieldKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Campos que já existem em «Dados do contato» / projeto — não exibir em «Campos personalizados»
 * (só extras escolhidos pelo usuário, ex.: nome da fonte).
 * Mantém «Telefone (manual)» (quadro livre).
 */
function isRedundantQuadroCustomFieldName(name) {
  const n = normalizeQuadroCustomFieldKey(name);
  if (!n || n === "telefone (manual)") return false;
  const block = new Set([
    "cpf/cnpj",
    "cpf",
    "cnpj",
    "nome do cliente",
    "e-mail",
    "email",
    "contato",
    "telefone",
    "celular",
    "endereco",
    "empresa",
  ]);
  return block.has(n);
}

function filterQuadroCustomFieldsForUi(fields) {
  return (Array.isArray(fields) ? fields : []).filter((f) => !isRedundantQuadroCustomFieldName(f?.name));
}

/** JSON interno em customFields do quadro: rascunho de «Dados do contato» sem CRM vinculado. */
function isInternalQuadroContactSnapshotField(name) {
  return normalizeQuadroCustomFieldKey(name) === "__quadro_contact_snapshot";
}

/** Campos personalizados visíveis (esconde snapshot + redundantes já cobertos por «Dados do contato»). */
function visibleQuadroCustomFieldsForEditor(fields) {
  return (Array.isArray(fields) ? fields : []).filter(
    (f) => !isInternalQuadroContactSnapshotField(f?.name) && !isRedundantQuadroCustomFieldName(f?.name)
  );
}

const DEFAULT_CONTACT_FORM_STATE = {
  name: "",
  email: "",
  cpf: "",
  cnpj: "",
  country: "",
  city: "",
  state: "",
  leadOrigin: "",
  deliveryDate: "",
  dealValue: "0,00",
  company: "",
  position: "",
  productInput: "",
  products: [],
  observation: "",
};

/** Placeholder de cartão sem cadastro (API usa nome fixo; comparar sem depender de maiúsculas). */
function isQuadroLivrePlaceholderContact(contact) {
  if (!contact) return true;
  if (contact.id != null && Number(contact.id) > 0) return false;
  const name = (contact.name || "").trim();
  if (/^quadro livre$/i.test(name)) return true;
  return false;
}

/** Contato real vinculado ao card (não o placeholder «Quadro livre»). */
function hasRealLinkedContactFromTicket(ticket) {
  const c = ticket?.contact;
  if (!c) return false;
  if (isQuadroLivrePlaceholderContact(c)) return false;
  if (c.id != null && Number(c.id) > 0) return true;
  if (String(c.number || "").replace(/\D/g, "").length >= 8) return true;
  return false;
}

function getExtraInfoValue(extraInfo, fieldName) {
  if (!extraInfo || !Array.isArray(extraInfo)) return "";
  const found = extraInfo.find((info) => info.name?.toLowerCase() === fieldName.toLowerCase());
  return found?.value || "";
}

/** Nome para o formulário do quadro: contato, extraInfo ou título do cartão (nome do projeto). */
function resolveQuadroContactDisplayName(contact, nomeProjetoFallback) {
  if (!contact) return String(nomeProjetoFallback || "").trim();
  const extra = contact.extraInfo || [];
  const n = (contact.name || "").trim();
  if (n) return n;
  const fromExtra =
    getExtraInfoValue(extra, "nome do cliente") ||
    getExtraInfoValue(extra, "Nome do Cliente") ||
    getExtraInfoValue(extra, "nome_cliente");
  if ((fromExtra || "").trim()) return String(fromExtra).trim();
  return String(nomeProjetoFallback || "").trim();
}

const digitsOnly = (s) => String(s || "").replace(/\D/g, "");

function formatCpfInput(v) {
  const x = digitsOnly(v).slice(0, 11);
  if (x.length <= 3) return x;
  if (x.length <= 6) return `${x.slice(0, 3)}.${x.slice(3)}`;
  if (x.length <= 9) return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6)}`;
  return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9)}`;
}

function formatCnpjInput(v) {
  const x = digitsOnly(v).slice(0, 14);
  if (x.length <= 2) return x;
  if (x.length <= 5) return `${x.slice(0, 2)}.${x.slice(2)}`;
  if (x.length <= 8) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5)}`;
  if (x.length <= 12) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8)}`;
  return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}-${x.slice(12)}`;
}

const LS_ATTACHMENT_GROUPS = "quadro_attachment_groups";
const LS_ATTACHMENT_GROUP_ASSIGN = "quadro_attachment_group_assign";

export default function QuadroModal({
  open,
  onClose,
  ticketUuid,
  readOnly = true,
  onOpenShare,
  onOpenMove,
  onQuadroUpdated,
  quadroGroupId: quadroGroupIdProp,
  quadroGroupName: quadroGroupNameProp,
  /** (uuid) => void — abre conversa no app (ex.: modal no Kanban); não abrir WhatsApp Web. */
  onOpenChat,
}) {
  const classes = useStyles();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("xs"));
  const { user, socket } = useContext(AuthContext);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const processoFileInputRef = useRef(null);
  const uploadProcessoBlocoIdRef = useRef(null);
  const lightboxListRef = useRef([]);
  const imageInputRef = useRef(null);
  const lastTicketIdLoadedRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [status, setStatus] = useState("aguardando");
  const [coverImage, setCoverImage] = useState(null);
  const [description, setDescription] = useState("");
  const [descriptionBackup, setDescriptionBackup] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [statusLogs, setStatusLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [changeClientOpen, setChangeClientOpen] = useState(false);
  const [contactOptions, setContactOptions] = useState([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedNewContact, setSelectedNewContact] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  /** Secções principais do modal (accordion); várias podem ficar abertas ao mesmo tempo. */
  const [modalSectionOpen, setModalSectionOpen] = useState({
    capa: false,
    contact: true,
    descricao: true,
    finance: false,
    processo: true,
    custom: false,
    anexos: false,
    lembretes: false,
    historico: false,
  });
  const [statusOptions, setStatusOptions] = useState(DEFAULT_STATUSES);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  /** Lista exibida no lightbox (global do cartão ou só anexos de um bloco de processo). */
  const [lightboxList, setLightboxList] = useState([]);
  const [renameAttId, setRenameAttId] = useState(null);
  const [renameAttValue, setRenameAttValue] = useState("");
  const [attachmentsViewMode, setAttachmentsViewMode] = useState("byType");
  const [attachmentGroups, setAttachmentGroups] = useState([]);
  const [attachmentGroupAssign, setAttachmentGroupAssign] = useState({});
  const [expandedTypeCategories, setExpandedTypeCategories] = useState(() => new Set(ATTACHMENT_TYPE_ORDER));
  const [expandedCustomGroupIds, setExpandedCustomGroupIds] = useState(new Set());
  const [newGroupName, setNewGroupName] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  /** Após enviar 2+ imagens no mesmo lote: escolher qual será a capa do cartão */
  const [capaPickerOpen, setCapaPickerOpen] = useState(false);
  const [capaPickerCandidates, setCapaPickerCandidates] = useState([]);
  const [capaPickerSelectedId, setCapaPickerSelectedId] = useState(null);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#1976d2");
  const [editingStatusIdx, setEditingStatusIdx] = useState(null);
  /** Área cujos status internos (GET/PUT /quadro-statuses) estão em uso */
  const [statusesQuadroGroupId, setStatusesQuadroGroupId] = useState(null);
  const [valorServico, setValorServico] = useState(0);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [nomeProjeto, setNomeProjeto] = useState("");
  /** Data limite do card (YYYY-MM-DD) — usada por lembretes inteligentes de prazo. */
  const [dataPrazo, setDataPrazo] = useState("");
  const [editingTituloCard, setEditingTituloCard] = useState(false);
  const [nomeProjetoDraft, setNomeProjetoDraft] = useState("");
  /** Quadro livre: número digitado manualmente para abrir WhatsApp quando não há contato ou para sobrescrever. */
  const [manualWaPhone, setManualWaPhone] = useState("");
  /** Campos dinâmicos «Detalhes do processo» (backend: detalhesProcessoItens JSON). */
  const [processoDetalhesItens, setProcessoDetalhesItens] = useState([]);
  /** id da etapa → expandido (clique no título para ver descrição e anexos). */
  const [processoRowExpanded, setProcessoRowExpanded] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [kanbanLembretes, setKanbanLembretes] = useState([]);
  const [kanbanLembretesLoading, setKanbanLembretesLoading] = useState(false);
  const [lembreteEditorOpen, setLembreteEditorOpen] = useState(false);
  const [companyUsersList, setCompanyUsersList] = useState([]);
  const [lembreteUsuarioQueueFilter, setLembreteUsuarioQueueFilter] = useState("");
  const [lembreteForm, setLembreteForm] = useState({
    id: null,
    nome: "",
    descricao: "",
    tipoGatilho: "prazo_proximo",
    data: "",
    hora: "",
    mensagemTemplate: "",
    destinoTipo: "interno",
    destinoId: "",
    diasAntecedencia: 1,
    antecedenciaMinutos: "",
    ativo: true,
  });
  /** Painéis colapsáveis no modal de edição do lembrete (evita poluição visual). */
  const [lembreteEditorPanels, setLembreteEditorPanels] = useState({
    info: true,
    gatilho: false,
    mensagem: true,
    destino: false,
  });
  const setLembreteEditorPanel = (key) => (_e, expanded) => {
    setLembreteEditorPanels((prev) => ({ ...prev, [key]: expanded }));
  };
  const [lembreteHistoricoOpen, setLembreteHistoricoOpen] = useState(false);
  const [lembreteHistoricoTitulo, setLembreteHistoricoTitulo] = useState("");
  const [lembreteHistoricoId, setLembreteHistoricoId] = useState(null);
  const [lembreteDisparos, setLembreteDisparos] = useState([]);
  const [lembreteDisparosLoading, setLembreteDisparosLoading] = useState(false);
  const [contactFormData, setContactFormData] = useState(() => ({ ...DEFAULT_CONTACT_FORM_STATE }));
  const [dealNegocioExtraFields, setDealNegocioExtraFields] = useState([]);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  useEffect(() => {
    if (!lembreteEditorOpen) return;
    let cancelled = false;
    api.get("/users/").then(({ data }) => {
      const list = data?.users || data || [];
      if (!cancelled && Array.isArray(list)) setCompanyUsersList(list);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lembreteEditorOpen]);
  const savedValuesRef = useRef({ valorServico: 0, valorEntrada: 0, nomeProjeto: "", dataPrazo: "", processoDetalhesItens: [], customFields: [], description: "", contactFormData: { ...DEFAULT_CONTACT_FORM_STATE }, dealNegocioExtraFields: [] });

  const dirtyValores = useMemo(() => {
    if (readOnly || !ticket) return false;
    const s = savedValuesRef.current;
    if (valorServico !== s.valorServico) return true;
    if (valorEntrada !== s.valorEntrada) return true;
    if (nomeProjeto !== s.nomeProjeto) return true;
    if (dataPrazo !== s.dataPrazo) return true;
    if (JSON.stringify(processoDetalhesItens) !== JSON.stringify(s.processoDetalhesItens)) return true;
    const cfFiltered = filterQuadroCustomFieldsForUi(customFields).filter((f) => (f.name || "").trim());
    const cfSaved = filterQuadroCustomFieldsForUi(s.customFields).filter((f) => (f.name || "").trim());
    if (JSON.stringify(cfFiltered) !== JSON.stringify(cfSaved)) return true;
    return false;
  }, [readOnly, ticket, valorServico, valorEntrada, nomeProjeto, dataPrazo, processoDetalhesItens, customFields]);

  const dirtyDescription = useMemo(() => {
    if (readOnly || !ticket) return false;
    return editMode && description !== savedValuesRef.current.description;
  }, [readOnly, ticket, editMode, description]);

  const dirtyTitulo = useMemo(() => {
    if (readOnly || !ticket) return false;
    return editingTituloCard && (nomeProjetoDraft || "").trim() !== (nomeProjeto || "").trim();
  }, [readOnly, ticket, editingTituloCard, nomeProjetoDraft, nomeProjeto]);

  const dirtyContact = useMemo(() => {
    if (readOnly || !ticket) return false;
    const s = savedValuesRef.current.contactFormData || {};
    const cur = contactFormData || {};
    const fields = ["name","email","cpf","cnpj","country","city","state","leadOrigin","deliveryDate","dealValue","company","position","observation"];
    for (const f of fields) {
      if ((cur[f] || "") !== (s[f] || "")) return true;
    }
    if (JSON.stringify(cur.products || []) !== JSON.stringify(s.products || [])) return true;
    const sNeg = (savedValuesRef.current.dealNegocioExtraFields || []).map(({ label, value }) => ({ label: label || "", value: value || "" }));
    const cNeg = (dealNegocioExtraFields || []).map(({ label, value }) => ({ label: label || "", value: value || "" }));
    if (JSON.stringify(sNeg) !== JSON.stringify(cNeg)) return true;
    return false;
  }, [readOnly, ticket, contactFormData, dealNegocioExtraFields]);

  const hasUnsavedChanges = dirtyValores || dirtyDescription || dirtyContact || dirtyTitulo;

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleSaveRef = useRef(null);
  const handleSaveValoresRef = useRef(null);
  const handleSaveContactRef = useRef(null);
  const handleSaveTituloRef = useRef(null);
  const dirtyValoresRef = useRef(false);
  const dirtyDescriptionRef = useRef(false);
  const dirtyContactRef = useRef(false);
  const dirtyTituloRef = useRef(false);
  useEffect(() => { dirtyValoresRef.current = dirtyValores; }, [dirtyValores]);
  useEffect(() => { dirtyDescriptionRef.current = dirtyDescription; }, [dirtyDescription]);
  useEffect(() => { dirtyContactRef.current = dirtyContact; }, [dirtyContact]);
  useEffect(() => { dirtyTituloRef.current = dirtyTitulo; }, [dirtyTitulo]);

  const handleSaveDirtyAndClose = useCallback(async () => {
    setSavingAll(true);
    try {
      if (dirtyTituloRef.current && handleSaveTituloRef.current) {
        await handleSaveTituloRef.current();
      }
      if (dirtyDescriptionRef.current && handleSaveRef.current) {
        await handleSaveRef.current();
      }
      if (dirtyValoresRef.current && handleSaveValoresRef.current) {
        await handleSaveValoresRef.current();
      }
      if (dirtyContactRef.current && handleSaveContactRef.current) {
        await handleSaveContactRef.current();
      }
      setConfirmCloseOpen(false);
      onClose();
    } finally {
      setSavingAll(false);
    }
  }, [onClose]);

  const lembretesAtivosCount = React.useMemo(
    () => (kanbanLembretes || []).filter((l) => l.ativo !== false).length,
    [kanbanLembretes]
  );
  const lembretesTodosInativos =
    (kanbanLembretes || []).length > 0 && lembretesAtivosCount === 0;
  const autoMoveWhatsappLembrete = React.useMemo(() => {
    return (kanbanLembretes || []).find((l) => {
      const dest = String(l.destinoTipo || "").toLowerCase();
      const isContatoWa =
        dest === "contato_whatsapp" || dest === "whatsapp" || dest === "contato";
      if (!isContatoWa) return false;
      if (String(l.tipoGatilho || "").toLowerCase() !== "movimentacao") return false;
      const nome = String(l.nome || "").toLowerCase();
      const desc = String(l.descricao || "");
      return desc.includes(AUTO_MOVE_WHATSAPP_MARKER) || nome.includes("notificar contato");
    });
  }, [kanbanLembretes]);

  const toggleProcessoRowExpanded = React.useCallback((rowId) => {
    const id = String(rowId);
    setProcessoRowExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const setModalAcc =
    (key) =>
    (_e, expanded) => {
      setModalSectionOpen((prev) => ({ ...prev, [key]: expanded }));
    };

  useEffect(() => {
    if (open) {
      setModalSectionOpen({
        capa: false,
        contact: true,
        descricao: true,
        finance: false,
        processo: true,
        custom: false,
        anexos: false,
        lembretes: false,
        historico: false,
      });
    }
  }, [open]);

  const globalAttachments = React.useMemo(() => {
    const ids = new Set((processoDetalhesItens || []).map((r) => String(r.id)));
    return attachments.filter((a) => {
      const bid = a.processoBlocoId != null && a.processoBlocoId !== "" ? String(a.processoBlocoId) : "";
      if (!bid) return true;
      return !ids.has(bid);
    });
  }, [attachments, processoDetalhesItens]);

  React.useEffect(() => {
    lightboxListRef.current = lightboxList;
  }, [lightboxList]);

  const [contactFormSaving, setContactFormSaving] = useState(false);
  const [resolvedQuadroGroupName, setResolvedQuadroGroupName] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (quadroGroupNameProp != null && String(quadroGroupNameProp).trim() !== "") {
      setResolvedQuadroGroupName(null);
      return;
    }
    const gid = statusesQuadroGroupId ?? quadroGroupIdProp;
    if (gid == null || gid === "") {
      setResolvedQuadroGroupName(null);
      return;
    }
    let cancelled = false;
    api
      .get("/quadro-groups")
      .then(({ data }) => {
        if (cancelled) return;
        const list = data.groups || data.lista || data || [];
        const g = Array.isArray(list) ? list.find((x) => String(x.id) === String(gid)) : null;
        setResolvedQuadroGroupName(g?.name || null);
      })
      .catch(() => {
        if (!cancelled) setResolvedQuadroGroupName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, quadroGroupNameProp, statusesQuadroGroupId, quadroGroupIdProp]);

  const displayQuadroGroupName =
    (quadroGroupNameProp != null && String(quadroGroupNameProp).trim() !== "" ? String(quadroGroupNameProp).trim() : null) ||
    resolvedQuadroGroupName ||
    null;

  const saveStatuses = async (newList) => {
    if (statusesQuadroGroupId == null) return;
    await api.put("/quadro-statuses", { statuses: newList, quadroGroupId: statusesQuadroGroupId });
    const { data } = await api.get("/quadro-statuses", { params: { quadroGroupId: statusesQuadroGroupId } });
    const parsed = mapStatusesFromApi(data.statuses || data || []);
    setStatusOptions(parsed.length ? parsed : DEFAULT_STATUSES);
  };

  const handleAddStatus = async () => {
    const label = newStatusLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (statusOptions.some((s) => s.value === value)) {
      toast.warn("Já existe um status com esse nome.");
      return;
    }
    const updated = [...statusOptions, { value, label, color: newStatusColor }];
    try {
      await saveStatuses(updated);
      setNewStatusLabel("");
      setNewStatusColor("#1976d2");
      toast.success(`Status "${label}" criado.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar status no servidor.");
    }
  };

  const handleUpdateStatus = async (index) => {
    const label = newStatusLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const updated = statusOptions.map((s, i) =>
      i === index ? { value, label, color: newStatusColor } : s
    );
    try {
      await saveStatuses(updated);
      setEditingStatusIdx(null);
      setNewStatusLabel("");
      setNewStatusColor("#1976d2");
      toast.success("Status atualizado.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar status no servidor.");
    }
  };

  const handleDeleteStatus = async (index) => {
    const s = statusOptions[index];
    if (!window.confirm(`Excluir o status "${s.label}"?`)) return;
    const updated = statusOptions.filter((_, i) => i !== index);
    if (updated.length === 0) {
      toast.warn("É necessário ter pelo menos um status.");
      return;
    }
    try {
      await saveStatuses(updated);
      toast.success("Status removido.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar status no servidor.");
    }
  };

  const handleEditStatusStart = (index) => {
    setEditingStatusIdx(index);
    setNewStatusLabel(statusOptions[index].label);
    setNewStatusColor(statusOptions[index].color);
  };

  const handleCancelEditStatus = () => {
    setEditingStatusIdx(null);
    setNewStatusLabel("");
    setNewStatusColor("#1976d2");
  };

  const setExtraInfoValueHelper = (extraInfo, fieldName, value) => {
    if (!extraInfo || !Array.isArray(extraInfo)) extraInfo = [];
    const newExtraInfo = [...extraInfo];
    const idx = newExtraInfo.findIndex((info) => info.name?.toLowerCase() === fieldName.toLowerCase());
    if (idx !== -1) {
      newExtraInfo[idx] = { ...newExtraInfo[idx], value };
    } else {
      newExtraInfo.push({ name: fieldName, value });
    }
    return newExtraInfo;
  };

  // Preencher form de contato quando o ticket carrega
  useEffect(() => {
    const contact = ticket?.contact;
    const shouldLoadContactForm =
      contact &&
      !isQuadroLivrePlaceholderContact(contact) &&
      (Number(contact.id) > 0 ||
        String(contact.number || "").replace(/\D/g, "").length >= 8);

    if (shouldLoadContactForm) {
      const extra = contact.extraInfo || [];
      const nomeCard = (ticket?.nomeProjeto || ticket?.quadroNomeProjeto || "").trim();
      const resolvedName = resolveQuadroContactDisplayName(contact, nomeCard);
      const productsRaw = getExtraInfoValue(extra, "produtos_interesse");
      let extrasNegocio = [];
      try {
        const rawNeg = getExtraInfoValue(extra, "negocio_campos_extras_json");
        const parsed = rawNeg ? JSON.parse(rawNeg) : [];
        if (Array.isArray(parsed)) {
          extrasNegocio = parsed
            .filter((row) => row && (row.label != null || row.value != null))
            .map((row, idx) => ({
              id: `neg_${idx}_${String(row.label || "").slice(0, 8)}`,
              label: String(row.label || ""),
              value: String(row.value || ""),
            }));
        }
      } catch (e) {
        extrasNegocio = [];
      }
      setDealNegocioExtraFields(extrasNegocio);

      const loadedContact = {
        name: resolvedName,
        email: contact.email || "",
        cpf: getExtraInfoValue(extra, "cpf") || "",
        cnpj: getExtraInfoValue(extra, "cnpj") || "",
        country: getExtraInfoValue(extra, "pais") || "",
        city: getExtraInfoValue(extra, "cidade") || "",
        state: getExtraInfoValue(extra, "estado") || "",
        leadOrigin: getExtraInfoValue(extra, "origem_lead") || "",
        deliveryDate:
          getExtraInfoValue(extra, "data_entrega") ||
          getExtraInfoValue(extra, "data_saida") ||
          "",
        dealValue: getExtraInfoValue(extra, "valor_negocio") || "0,00",
        company: getExtraInfoValue(extra, "empresa") || "",
        position: getExtraInfoValue(extra, "cargo") || "",
        productInput: "",
        products: productsRaw ? productsRaw.split(",").map((p) => p.trim()).filter(Boolean) : [],
        observation: getExtraInfoValue(extra, "observacao") || "",
      };
      setContactFormData(loadedContact);
      savedValuesRef.current = {
        ...savedValuesRef.current,
        contactFormData: loadedContact,
        dealNegocioExtraFields: extrasNegocio.map(({ id, label, value }) => ({ id, label, value })),
      };
    }
    /* Cartão livre: formulário vem do snapshot em loadAll (`__quadro_contact_snapshot`), não limpar aqui. */
  }, [ticket]);

  const contactPhoneResolved = useMemo(
    () => resolveContactWhatsAppPhone(ticket?.contact),
    [ticket?.contact]
  );

  /** Dígitos para wa.me: prioriza número resolvido do contato, senão manual / number bruto */
  const whatsappDialDigits = useMemo(() => {
    const r = resolveContactWhatsAppPhone(ticket?.contact);
    let d = String(r.copyText || "").replace(/\D/g, "");
    if (d.length < 10) {
      d = String(manualWaPhone || ticket?.contact?.number || "").replace(/\D/g, "");
    }
    return d;
  }, [ticket?.contact, manualWaPhone]);

  const handleContactFieldChange = (field, value) => {
    setContactFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveAllContactFields = async () => {
    const contact = ticket?.contact;
    const hasRealContact =
      contact &&
      !isQuadroLivrePlaceholderContact(contact) &&
      contact.id != null &&
      Number(contact.id) > 0;

    if (hasRealContact) {
      setContactFormSaving(true);
      try {
        let updateData = {};
        let extraInfo = contact.extraInfo ? [...contact.extraInfo] : [];

        updateData.name = contactFormData.name;
        updateData.email = contactFormData.email;

        const extraFieldMap = {
          cpf: "cpf",
          cnpj: "cnpj",
          country: "pais", city: "cidade", state: "estado",
          leadOrigin: "origem_lead",
          deliveryDate: "data_entrega",
          dealValue: "valor_negocio",
          company: "empresa", position: "cargo",
          products: "produtos_interesse", observation: "observacao",
        };

        for (const [field, extraName] of Object.entries(extraFieldMap)) {
          const value = field === "products" ? contactFormData.products.join(", ") : contactFormData[field];
          extraInfo = setExtraInfoValueHelper(extraInfo, extraName, value);
        }
        const negocioExtrasPayload = dealNegocioExtraFields
          .map((row) => ({ label: (row.label || "").trim(), value: (row.value || "").trim() }))
          .filter((row) => row.label || row.value);
        extraInfo = setExtraInfoValueHelper(
          extraInfo,
          "negocio_campos_extras_json",
          JSON.stringify(negocioExtrasPayload)
        );
        updateData.extraInfo = extraInfo;

        const { data: savedContact } = await api.put(`/contacts/${contact.id}`, updateData);
        setTicket((prev) =>
          prev && savedContact
            ? { ...prev, contact: { ...prev.contact, ...savedContact, extraInfo: savedContact.extraInfo || extraInfo } }
            : prev
        );
        savedValuesRef.current = {
          ...savedValuesRef.current,
          contactFormData: { ...contactFormData },
          dealNegocioExtraFields: dealNegocioExtraFields.map(({ id, label, value }) => ({ id, label, value })),
        };
        toast.success("Dados do contato salvos com sucesso!");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Erro ao salvar dados do contato.");
        setContactFormSaving(false);
        throw err;
      }
      setContactFormSaving(false);
      return;
    }

    /* Quadro livre: grava rascunho no próprio cartão (customFields), sem cadastro de contato. */
    if (!isStandaloneQuadro || !quadroApiUuid) {
      toast.warn(
        "Vincule um contato ao cartão para salvar estes dados no cadastro (botão «Vincular contato» acima ou no aviso abaixo)."
      );
      return;
    }

    setContactFormSaving(true);
    try {
      const snapshotObj = {
        v: 1,
        contactFormData: { ...contactFormData, productInput: "" },
        dealNegocioExtraFields: dealNegocioExtraFields.map(({ id, label, value }) => ({
          id,
          label,
          value,
        })),
      };
      const snapshotJson = JSON.stringify(snapshotObj);
      const baseFields = filterQuadroCustomFieldsForUi(customFields)
        .filter((f) => (f.name || "").trim())
        .filter((f) => !isInternalQuadroContactSnapshotField(f.name));
      const merged = [
        ...baseFields,
        { name: "__quadro_contact_snapshot", value: snapshotJson, type: "text" },
      ];
      await api.put(`/tickets/${quadroApiUuid}/quadro`, {
        nomeProjeto: nomeProjeto || undefined,
        valorServico,
        valorEntrada,
        customFields: merged.map((f) => ({
          name: (f.name || "").trim(),
          value: (f.value || "").trim(),
          type: f.type || "text",
        })),
        ...quadroViewContext(),
      });
      const mergedCustomFields = merged.map((f) => ({ name: f.name || "", value: f.value || "", type: f.type || "text" }));
      setCustomFields(mergedCustomFields);
      savedValuesRef.current = {
        ...savedValuesRef.current,
        contactFormData: { ...contactFormData },
        dealNegocioExtraFields: dealNegocioExtraFields.map(({ id, label, value }) => ({ id, label, value })),
        customFields: mergedCustomFields,
      };
      toast.success("Dados salvos no cartão. Vincule um contato para copiar isto ao cadastro do cliente.");
      if (typeof onQuadroUpdated === "function") onQuadroUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar dados no cartão.");
      setContactFormSaving(false);
      throw err;
    }
    setContactFormSaving(false);
  };
  handleSaveContactRef.current = handleSaveAllContactFields;

  const handleContactAddProduct = () => {
    const product = contactFormData.productInput.trim();
    if (!product) return;
    const newProducts = [...contactFormData.products, product];
    setContactFormData((prev) => ({ ...prev, products: newProducts, productInput: "" }));
  };

  const handleContactRemoveProduct = (index) => {
    const newProducts = contactFormData.products.filter((_, i) => i !== index);
    setContactFormData((prev) => ({ ...prev, products: newProducts }));
  };

  const handleAddDealNegocioField = () => {
    setDealNegocioExtraFields((prev) => [
      ...prev,
      { id: `neg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, label: "", value: "" },
    ]);
  };

  const handleDealNegocioFieldChange = (id, key, value) => {
    setDealNegocioExtraFields((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row))
    );
  };

  const handleRemoveDealNegocioField = (id) => {
    setDealNegocioExtraFields((prev) => prev.filter((row) => row.id !== id));
  };

  const resolveImageUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    let resolved = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      const base = process.env.REACT_APP_BACKEND_URL || "";
      resolved = base + (url.startsWith("/") ? url : "/" + url);
    }
    // Corrige URL vinda do backend com porto duplicado (ex: localhost:4000:443)
    return resolved.replace(/:443(?=\/)/, "");
  };

  /** Área do Kanban onde o modal foi aberto — espelho desvinculado grava cópia local por área. */
  const quadroViewContext = React.useCallback(() => {
    if (quadroGroupIdProp == null || quadroGroupIdProp === "") return {};
    const n = Number(quadroGroupIdProp);
    if (!Number.isFinite(n)) return {};
    return { viewQuadroGroupId: n };
  }, [quadroGroupIdProp]);

  const loadAll = React.useCallback(async () => {
    if (!ticketUuid) return;
    try {
      const { data: quadroData } = await api.get("/tickets/" + ticketUuid + "/quadro", {
        params: quadroViewContext(),
      });
      const isStandalone = !!quadroData.standalone;
      let ticketData = quadroData.ticket;
      if (!isStandalone && ticketData?.id) {
        try {
          const { data: full } = await api.get("/tickets/u/" + ticketUuid);
          ticketData = { ...ticketData, ...full };
        } catch (e) {
          /* mantém ticket do getQuadro */
        }
      }
      const quadroCardTitleRaw =
        quadroData.quadro &&
        String(quadroData.quadro.nomeProjeto || quadroData.quadro.nomeEmpresa || "").trim();
      const ticketWithQuadroTitle = { ...ticketData };
      if (quadroCardTitleRaw) {
        ticketWithQuadroTitle.nomeProjeto = quadroData.quadro.nomeProjeto || ticketWithQuadroTitle.nomeProjeto;
        ticketWithQuadroTitle.quadroNomeProjeto = quadroCardTitleRaw;
      }
      setTicket(isStandalone ? { ...ticketWithQuadroTitle, isStandaloneQuadro: true } : ticketWithQuadroTitle);

      const cfList = Array.isArray(quadroData.quadro?.customFields) ? quadroData.quadro.customFields : [];
      const manualRow = cfList.find((f) => (f.name || "").trim() === "Telefone (manual)");
      const manualVal = manualRow?.value != null ? String(manualRow.value).trim() : "";
      setManualWaPhone(
        (ticketData.contact && ticketData.contact.number && String(ticketData.contact.number).trim()) ||
          manualVal ||
          ""
      );

      const gid =
        quadroGroupIdProp != null && quadroGroupIdProp !== ""
          ? Number(quadroGroupIdProp)
          : quadroData.quadro?.quadroGroupId ?? ticketData?.quadroGroupId ?? null;
      setStatusesQuadroGroupId(gid);
      if (gid != null) {
        try {
          const { data: stData } = await api.get("/quadro-statuses", { params: { quadroGroupId: gid } });
          const parsed = mapStatusesFromApi(stData.statuses || []);
          if (parsed.length > 0) {
            setStatusOptions((prev) => mergeStatusLists(parsed, prev));
          }
        } catch (stErr) {
          toast.error(stErr?.response?.data?.message || "Não foi possível carregar os status do quadro.");
        }
      }

      const ctxKey = isStandalone ? ticketUuid : ticketData.id;
      const isNewTicketContext = lastTicketIdLoadedRef.current !== ctxKey;
      lastTicketIdLoadedRef.current = ctxKey;

      let quadroStatus = "aguardando";
      let quadroLoaded = false;
      let quadroDescription = "";
      let quadroAttachments = [];
      quadroLoaded = true;
      if (quadroData.quadro) {
        quadroStatus = quadroData.quadro.status || "aguardando";
        quadroDescription = quadroData.quadro.description || "";
        setValorServico(Number(quadroData.quadro.valorServico) || 0);
        setValorEntrada(Number(quadroData.quadro.valorEntrada) || 0);
        setNomeProjeto(quadroCardTitleRaw || "");
        const dp = quadroData.quadro.dataPrazo;
        setDataPrazo(
          dp && String(dp).length >= 10 ? String(dp).slice(0, 10) : dp ? String(dp) : ""
        );
        const loadedProcessoItens = normalizeProcessoDetalhesItensFromQuadro(quadroData.quadro);
        setProcessoDetalhesItens(loadedProcessoItens);
        const cf = quadroData.quadro.customFields;
        const mapped = Array.isArray(cf)
          ? cf.map((f) => ({ name: f.name || "", value: f.value || "", type: f.type || "text" }))
          : [];
        /* Estado completo (incl. «Telefone (manual)» e snapshot interno); o editor de extras só mostra o filtrado. */
        setCustomFields(mapped);
        savedValuesRef.current = {
          ...savedValuesRef.current,
          valorServico: Number(quadroData.quadro.valorServico) || 0,
          valorEntrada: Number(quadroData.quadro.valorEntrada) || 0,
          nomeProjeto: quadroCardTitleRaw || "",
          dataPrazo: (() => { const dp = quadroData.quadro.dataPrazo; return dp && String(dp).length >= 10 ? String(dp).slice(0, 10) : dp ? String(dp) : ""; })(),
          processoDetalhesItens: loadedProcessoItens,
          customFields: mapped,
        };

        const ticketMerged = isStandalone
          ? { ...ticketWithQuadroTitle, isStandaloneQuadro: true }
          : { ...ticketWithQuadroTitle };
        const cardTitleForForm = (quadroCardTitleRaw || "").trim();
        if (!hasRealLinkedContactFromTicket(ticketMerged)) {
          let loadedContact = null;
          let loadedNegocio = [];
          const snapRow = mapped.find((f) => isInternalQuadroContactSnapshotField(f?.name));
          if (snapRow?.value) {
            try {
              const snap = JSON.parse(String(snapRow.value));
              if (snap.contactFormData && typeof snap.contactFormData === "object") {
                const snapName = (snap.contactFormData.name || "").trim();
                loadedContact = {
                  ...DEFAULT_CONTACT_FORM_STATE,
                  ...snap.contactFormData,
                  name: snapName || cardTitleForForm,
                  productInput: "",
                  products: Array.isArray(snap.contactFormData.products)
                    ? snap.contactFormData.products
                    : DEFAULT_CONTACT_FORM_STATE.products,
                };
              } else {
                loadedContact = {
                  ...DEFAULT_CONTACT_FORM_STATE,
                  ...(cardTitleForForm ? { name: cardTitleForForm } : {}),
                };
              }
              if (Array.isArray(snap.dealNegocioExtraFields)) {
                loadedNegocio = snap.dealNegocioExtraFields.map((row, idx) => ({
                  id: row.id || `neg_${idx}_${String(row.label || "").slice(0, 8)}`,
                  label: String(row.label || ""),
                  value: String(row.value || ""),
                }));
              }
            } catch {
              loadedContact = {
                ...DEFAULT_CONTACT_FORM_STATE,
                ...(cardTitleForForm ? { name: cardTitleForForm } : {}),
              };
              loadedNegocio = [];
            }
          } else {
            loadedContact = {
              ...DEFAULT_CONTACT_FORM_STATE,
              ...(cardTitleForForm ? { name: cardTitleForForm } : {}),
            };
            loadedNegocio = [];
          }
          setContactFormData(loadedContact);
          setDealNegocioExtraFields(loadedNegocio);
          savedValuesRef.current = {
            ...savedValuesRef.current,
            contactFormData: loadedContact,
            dealNegocioExtraFields: loadedNegocio.map(({ id, label, value }) => ({ id, label, value })),
          };
        }
      } else {
        setValorServico(0);
        setValorEntrada(0);
        setNomeProjeto("");
        setProcessoDetalhesItens([]);
        setCustomFields([]);
        if (isStandalone && ticketData && !hasRealLinkedContactFromTicket({ ...ticketData, isStandaloneQuadro: true })) {
          setContactFormData({ ...DEFAULT_CONTACT_FORM_STATE });
          setDealNegocioExtraFields([]);
          savedValuesRef.current = {
            ...savedValuesRef.current,
            contactFormData: { ...DEFAULT_CONTACT_FORM_STATE },
            dealNegocioExtraFields: [],
          };
        }
      }
      if (Array.isArray(quadroData.attachments)) {
        quadroAttachments = quadroData.attachments.map((a) => ({
          id: a.id,
          name: a.name,
          url: a.url,
          isCapa: !!a.isCapa,
          processoBlocoId: a.processoBlocoId != null && a.processoBlocoId !== "" ? String(a.processoBlocoId) : null,
          legenda: a.legenda || "",
          createdAt: a.createdAt,
          date: a.createdAt ? format(parseISO(a.createdAt), "dd/MM/yyyy") : "",
        }));
      }
      if (quadroLoaded) {
        setStatus(quadroStatus);
        ensureStatusInOptions(quadroStatus, setStatusOptions);
      } else if (isNewTicketContext) {
        setStatus("aguardando");
      }
      setDescription(quadroDescription || "");
      savedValuesRef.current = { ...savedValuesRef.current, description: quadroDescription || "" };
      setAttachments(quadroAttachments);
      const capaAttachment = quadroAttachments.find((a) => a.isCapa);
      if (capaAttachment?.url) {
        setCoverImage(resolveImageUrl(capaAttachment.url));
      } else {
        setCoverImage(null);
      }
      try {
        const { data: logsData } = await api.get(`/tickets/${ticketUuid}/quadro/logs`);
        setStatusLogs(logsData.logs || []);
      } catch (logErr) {
        setStatusLogs([]);
      }
    } catch (err) {
      const st = err?.response?.status;
      toast.error(err?.response?.data?.message || "Não foi possível carregar o quadro.");
      if (st === 404) onClose();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketUuid, quadroGroupIdProp, onClose, quadroViewContext]);

  const quadroApiUuid = React.useMemo(() => (ticket && ticket.uuid) || ticketUuid, [ticket, ticketUuid]);
  const isStandaloneQuadro = !!ticket?.isStandaloneQuadro;
  /** API devolve id: 0 para quadro livre; !0 em JS é true e quebrava salvamentos silenciosamente. */
  const hasRealTicketId = ticket?.id != null && Number(ticket.id) > 0;

  useEffect(() => {
    if (!open || !hasRealTicketId || !ticket?.id) {
      setKanbanLembretes([]);
      return;
    }
    let cancelled = false;
    setKanbanLembretesLoading(true);
    api
      .get(`/tickets/${ticket.id}/lembretes`)
      .then(({ data }) => {
        if (!cancelled) setKanbanLembretes(data.lembretes || []);
      })
      .catch(() => {
        if (!cancelled) setKanbanLembretes([]);
      })
      .finally(() => {
        if (!cancelled) setKanbanLembretesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, hasRealTicketId, ticket?.id]);

  useEffect(() => {
    if (!open || !ticketUuid) {
      lastTicketIdLoadedRef.current = null;
      setTicket(null);
      setCoverImage(null);
      setStatus("aguardando");
      setDescription("");
      setAttachments([]);
      setLightboxList([]);
      setStatusLogs([]);
      setValorServico(0);
      setValorEntrada(0);
      setNomeProjeto("");
      setDataPrazo("");
      setProcessoDetalhesItens([]);
      setProcessoRowExpanded({});
      setCustomFields([]);
      setEditMode(false);
      setChangeClientOpen(false);
      setStatusesQuadroGroupId(null);
      setEditingTituloCard(false);
      setNomeProjetoDraft("");
      setManualWaPhone("");
      setContactFormData({ ...DEFAULT_CONTACT_FORM_STATE });
      setDealNegocioExtraFields([]);
      setKanbanLembretes([]);
      setKanbanLembretesLoading(false);
      setLembreteEditorOpen(false);
      setLembreteHistoricoOpen(false);
      setLembreteHistoricoId(null);
      setLembreteDisparos([]);
      return;
    }
    setLoading(true);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketUuid]);

  const handleAtualizar = () => {
    setRefreshing(true);
    loadAll();
  };

  const handleEditClick = () => {
    setDescriptionBackup(description);
    setEditMode(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = description;
    }, 0);
  };

  const handleSave = async () => {
    const newDescription = editorRef.current?.innerHTML ?? description;
    setDescription(newDescription);
    setEditMode(false);
    if (!quadroApiUuid) {
      toast.error("Não foi possível identificar o quadro para salvar a descrição.");
      return;
    }
    try {
      await api.put("/tickets/" + quadroApiUuid + "/quadro/description", {
        description: newDescription,
        ...quadroViewContext(),
      });
      savedValuesRef.current = { ...savedValuesRef.current, description: newDescription };
      toast.success("Descrição salva.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar descrição.");
      throw err;
    }
  };
  handleSaveRef.current = handleSave;

  const handleDiscard = () => {
    setDescription(descriptionBackup);
    if (editorRef.current) editorRef.current.innerHTML = descriptionBackup;
    setEditMode(false);
    toast.info("Alterações descartadas.");
  };

  const execCmd = (cmd, value = null) => {
    document.execCommand(cmd, false, value);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleInsertImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => execCmd("insertImage", reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInsertLink = () => {
    const url = window.prompt("URL do link:");
    if (url) execCmd("createLink", url);
  };

  const uploadQuadroFiles = async (fileList, processoBlocoIdOpt) => {
    if (!fileList?.length) return;
    if (!quadroApiUuid) {
      toast.error("Quadro indisponível para anexos.");
      return;
    }
    const processoIdSet = new Set((processoDetalhesItens || []).map((r) => String(r.id)));
    const countGlobal = attachments.filter(
      (a) => !a.processoBlocoId || !processoIdSet.has(String(a.processoBlocoId))
    ).length;
    const wasGlobalEmpty = !processoBlocoIdOpt && countGlobal === 0;
    const uploadedImagesThisBatch = [];
    let okCount = 0;
    for (const file of fileList) {
      try {
        const form = new FormData();
        form.append("file", file);
        if (processoBlocoIdOpt) {
          form.append("processoBlocoId", String(processoBlocoIdOpt));
        }
        const { data } = await api.post("/tickets/" + quadroApiUuid + "/quadro/attachments", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const att = data.attachment || data;
        const newAtt = {
          id: att.id,
          name: att.name,
          url: att.url,
          isCapa:
            att.isCapa !== undefined
              ? !!att.isCapa
              : wasGlobalEmpty && file === fileList[0] && !processoBlocoIdOpt,
          processoBlocoId:
            att.processoBlocoId != null && att.processoBlocoId !== ""
              ? String(att.processoBlocoId)
              : processoBlocoIdOpt
                ? String(processoBlocoIdOpt)
                : null,
          legenda: att.legenda || "",
          createdAt: att.createdAt,
          date: att.createdAt ? format(parseISO(att.createdAt), "dd/MM/yyyy") : "",
        };
        setAttachments((prev) => [...prev, newAtt]);
        if (newAtt.isCapa && newAtt.url && !processoBlocoIdOpt) setCoverImage(resolveImageUrl(newAtt.url));
        okCount += 1;
        if (!processoBlocoIdOpt && isLocalFileImage(file) && newAtt.id) {
          uploadedImagesThisBatch.push({ id: newAtt.id, name: newAtt.name, url: newAtt.url });
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || "Erro ao enviar " + file.name);
      }
    }
    if (okCount === 1) {
      toast.success(processoBlocoIdOpt ? "Arquivo adicionado à etapa." : "Arquivo enviado.");
    } else if (okCount > 1) {
      toast.success(`${okCount} arquivos enviados.`);
    }
    if (!processoBlocoIdOpt && uploadedImagesThisBatch.length >= 2) {
      setCapaPickerCandidates(uploadedImagesThisBatch);
      setCapaPickerSelectedId(uploadedImagesThisBatch[0].id);
      setCapaPickerOpen(true);
    }
  };

  const handleAddAttachment = async (e) => {
    const files = e.target.files;
    if (!files?.length) {
      e.target.value = "";
      return;
    }
    await uploadQuadroFiles(Array.from(files), null);
    e.target.value = "";
  };

  const handleProcessoAttachmentInput = async (e) => {
    const blocoId = uploadProcessoBlocoIdRef.current;
    uploadProcessoBlocoIdRef.current = null;
    const files = e.target.files;
    if (!files?.length || !blocoId) {
      e.target.value = "";
      return;
    }
    await uploadQuadroFiles(Array.from(files), blocoId);
    e.target.value = "";
  };

  const setAsCapa = async (id) => {
    if (!quadroApiUuid) return;
    try {
      await api.patch("/tickets/" + quadroApiUuid + "/quadro/attachments/" + id + "/capa");
      setAttachments((prev) => {
        const next = prev.map((a) => ({ ...a, isCapa: a.id === id }));
        const att = next.find((a) => a.id === id);
        if (att?.url) setCoverImage(resolveImageUrl(att.url));
        return next;
      });
      toast.success("Capa atualizada.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao marcar capa.");
    }
  };

  const handleCapaPickerConfirm = async () => {
    if (capaPickerSelectedId == null) {
      setCapaPickerOpen(false);
      setCapaPickerCandidates([]);
      return;
    }
    await setAsCapa(capaPickerSelectedId);
    setCapaPickerOpen(false);
    setCapaPickerCandidates([]);
    setCapaPickerSelectedId(null);
  };

  const handleCapaPickerDismiss = () => {
    setCapaPickerOpen(false);
    setCapaPickerCandidates([]);
    setCapaPickerSelectedId(null);
  };

  const handleDeleteAttachment = async (id) => {
    if (!quadroApiUuid) return;
    try {
      await api.delete("/tickets/" + quadroApiUuid + "/quadro/attachments/" + id);
      const deleted = attachments.find((a) => a.id === id);
      const remaining = attachments.filter((a) => a.id !== id);
      setAttachments(remaining);
      setAttachmentGroupAssign((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (deleted?.isCapa) {
        const newCapa = remaining.find((a) => a.isCapa);
        setCoverImage(newCapa?.url ? resolveImageUrl(newCapa.url) : null);
      }
      toast.success("Anexo excluído.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao excluir.");
    }
  };

  const openLightbox = (list, index) => {
    if (!Array.isArray(list) || list.length === 0) return;
    const i = Math.max(0, Math.min(Number(index) || 0, list.length - 1));
    setLightboxList(list);
    setLightboxIndex(i);
    setLightboxOpen(true);
  };
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxList([]);
  };
  const lightboxPrev = () =>
    setLightboxIndex((i) => {
      const len = lightboxListRef.current.length;
      if (len <= 1) return 0;
      return i <= 0 ? len - 1 : i - 1;
    });
  const lightboxNext = () =>
    setLightboxIndex((i) => {
      const len = lightboxListRef.current.length;
      if (len <= 1) return 0;
      return i >= len - 1 ? 0 : i + 1;
    });

  const attachmentsDoProcesso = (blocoId) =>
    attachments.filter((a) => String(a.processoBlocoId || "") === String(blocoId));

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, lightboxList.length]);

  const handleRenameAttachment = async () => {
    if (renameAttId == null || !quadroApiUuid) return;
    const trimmed = (renameAttValue || "").trim();
    if (!trimmed) {
      setRenameAttId(null);
      return;
    }
    try {
      await api.put("/tickets/" + quadroApiUuid + "/quadro/attachments/" + renameAttId + "/rename", { name: trimmed });
      setAttachments((prev) => prev.map((a) => (a.id === renameAttId ? { ...a, name: trimmed } : a)));
      toast.success("Anexo renomeado.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Renomear não disponível no servidor.");
    }
    setRenameAttId(null);
    setRenameAttValue("");
  };

  const loadAttachmentGroupsFromStorage = () => {
    if (!quadroApiUuid) return;
    try {
      const rawGroups = localStorage.getItem(LS_ATTACHMENT_GROUPS);
      const rawAssign = localStorage.getItem(LS_ATTACHMENT_GROUP_ASSIGN);
      const allGroups = rawGroups ? JSON.parse(rawGroups) : {};
      const allAssign = rawAssign ? JSON.parse(rawAssign) : {};
      const tid = String(quadroApiUuid);
      setAttachmentGroups(Array.isArray(allGroups[tid]) ? allGroups[tid] : []);
      setAttachmentGroupAssign(typeof allAssign[tid] === "object" && allAssign[tid] !== null ? allAssign[tid] : {});
    } catch (e) {
      setAttachmentGroups([]);
      setAttachmentGroupAssign({});
    }
  };

  useEffect(() => {
    if (quadroApiUuid) loadAttachmentGroupsFromStorage();
  }, [quadroApiUuid]);

  const saveAttachmentGroupsToStorage = (groups, assign) => {
    if (!quadroApiUuid) return;
    try {
      const rawGroups = localStorage.getItem(LS_ATTACHMENT_GROUPS);
      const rawAssign = localStorage.getItem(LS_ATTACHMENT_GROUP_ASSIGN);
      const allGroups = rawGroups ? JSON.parse(rawGroups) : {};
      const allAssign = rawAssign ? JSON.parse(rawAssign) : {};
      const tid = String(quadroApiUuid);
      allGroups[tid] = groups;
      allAssign[tid] = assign;
      localStorage.setItem(LS_ATTACHMENT_GROUPS, JSON.stringify(allGroups));
      localStorage.setItem(LS_ATTACHMENT_GROUP_ASSIGN, JSON.stringify(allAssign));
    } catch (e) {}
  };

  const createAttachmentGroup = () => {
    const name = (newGroupName || "").trim();
    if (!name) return;
    const newGroup = { id: "g_" + Date.now(), name };
    setAttachmentGroups((prev) => {
      const next = [...prev, newGroup];
      saveAttachmentGroupsToStorage(next, attachmentGroupAssign);
      return next;
    });
    setNewGroupName("");
    setShowNewGroupInput(false);
    setExpandedCustomGroupIds((prev) => new Set([...prev, newGroup.id]));
    toast.success('Grupo "' + name + '" criado.');
  };

  const assignAttachmentToGroup = (attachmentId, groupId) => {
    const next = groupId ? { ...attachmentGroupAssign, [attachmentId]: groupId } : (() => { const o = { ...attachmentGroupAssign }; delete o[attachmentId]; return o; })();
    setAttachmentGroupAssign(next);
    saveAttachmentGroupsToStorage(attachmentGroups, next);
  };

  const toggleTypeCategory = (cat) => {
    setExpandedTypeCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleCustomGroup = (groupId) => {
    setExpandedCustomGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const reloadKanbanLembretes = useCallback(async () => {
    if (!hasRealTicketId || !ticket?.id) return;
    try {
      const { data } = await api.get(`/tickets/${ticket.id}/lembretes`);
      setKanbanLembretes(data.lembretes || []);
    } catch {
      /* noop */
    }
  }, [hasRealTicketId, ticket?.id]);

  useEffect(() => {
    if (!open || !hasRealTicketId || !ticket?.id || !user?.companyId || !isSocketClientReady(socket)) {
      return undefined;
    }
    const ev = `company-${user.companyId}-kanban-lembrete`;
    const onLembreteSocket = (payload) => {
      if (Number(payload?.ticketId) === Number(ticket.id)) {
        reloadKanbanLembretes();
      }
    };
    socket.on(ev, onLembreteSocket);
    return () => {
      if (isSocketClientReady(socket)) socket.off(ev, onLembreteSocket);
    };
  }, [open, hasRealTicketId, ticket?.id, user?.companyId, socket, reloadKanbanLembretes]);

  const openNewKanbanLembrete = () => {
    setLembreteForm({
      id: null,
      nome: "",
      descricao: "",
      tipoGatilho: "prazo_proximo",
      data: "",
      hora: "",
      mensagemTemplate: "",
      destinoTipo: "interno",
      destinoId: "",
      diasAntecedencia: 1,
      antecedenciaMinutos: "",
      ativo: true,
    });
    setLembreteEditorPanels({ info: true, gatilho: false, mensagem: true, destino: false });
    setLembreteEditorOpen(true);
  };

  const openEditKanbanLembrete = (row) => {
    const horaRaw = row.hora != null ? String(row.hora) : "";
    const horaInput = horaRaw.length >= 5 ? horaRaw.slice(0, 5) : horaRaw;
    const queues = user?.queues || [];
    let destinoTipo = normalizeKanbanLembreteDestinoTipo(row.destinoTipo);
    let destinoId = row.destinoId != null ? String(row.destinoId) : "";
    if (destinoTipo === "fila") {
      destinoId = pickValidDestinoFilaId(destinoId, queues);
      if (!destinoId || !queues.length) {
        destinoTipo = "interno";
        destinoId = "";
      }
    }
    // destinoTipo "usuario" mantém destinoId como veio (id do user)
    const diasRaw = row.diasAntecedencia != null ? Number(row.diasAntecedencia) : 1;
    const diasAntecedencia = Number.isFinite(diasRaw) && diasRaw >= 0 ? diasRaw : 1;
    setLembreteForm({
      id: row.id,
      nome: row.nome || "",
      descricao: row.descricao || "",
      tipoGatilho: normalizeKanbanLembreteTipoGatilho(row.tipoGatilho),
      data: row.data ? String(row.data).slice(0, 10) : "",
      hora: horaInput,
      mensagemTemplate: row.mensagemTemplate || "",
      destinoTipo,
      destinoId,
      diasAntecedencia,
      antecedenciaMinutos:
        row.antecedenciaMinutos != null && row.antecedenciaMinutos !== ""
          ? String(row.antecedenciaMinutos)
          : "",
      ativo: row.ativo !== false,
    });
    setLembreteEditorPanels({ info: true, gatilho: false, mensagem: true, destino: false });
    setLembreteEditorOpen(true);
  };

  const saveKanbanLembreteForm = async () => {
    if (!hasRealTicketId || !ticket?.id) return;
    const nome = (lembreteForm.nome || "").trim();
    if (!nome) {
      toast.error("Informe o nome do lembrete.");
      return;
    }
    const horaNorm = normalizeLembreteHora(lembreteForm.hora);
    const dataTrim = (lembreteForm.data || "").trim();
    const tipoGatilhoNorm = normalizeKanbanLembreteTipoGatilho(lembreteForm.tipoGatilho);
    if (tipoGatilhoNorm === "agendado") {
      if (!dataTrim || !horaNorm) {
        toast.error("Para lembrete agendado, informe data e hora.");
        return;
      }
    }
    const destinoTipoNorm = normalizeKanbanLembreteDestinoTipo(lembreteForm.destinoTipo);
    const destinoFilaId =
      destinoTipoNorm === "fila"
        ? pickValidDestinoFilaId(lembreteForm.destinoId, user?.queues)
        : "";
    if (destinoTipoNorm === "fila" && !destinoFilaId) {
      toast.error("Selecione uma fila válida ou altere o destino do lembrete.");
      return;
    }
    const destinoUsuarioId =
      destinoTipoNorm === "usuario" && lembreteForm.destinoId
        ? parseInt(String(lembreteForm.destinoId), 10)
        : null;
    if (destinoTipoNorm === "usuario" && !destinoUsuarioId) {
      toast.error("Selecione um usuário válido ou altere o destino do lembrete.");
      return;
    }
    const body = {
      nome,
      descricao: (lembreteForm.descricao || "").trim() || null,
      tipoGatilho: tipoGatilhoNorm,
      mensagemTemplate: (lembreteForm.mensagemTemplate || "").trim() || null,
      destinoTipo: destinoTipoNorm,
      destinoId:
        destinoTipoNorm === "fila" && destinoFilaId
          ? parseInt(String(destinoFilaId), 10)
          : destinoTipoNorm === "usuario" && destinoUsuarioId
            ? destinoUsuarioId
            : null,
      diasAntecedencia:
        tipoGatilhoNorm === "prazo_proximo" && lembreteForm.diasAntecedencia != null
          ? Number(lembreteForm.diasAntecedencia)
          : null,
      antecedenciaMinutos:
        tipoGatilhoNorm === "prazo_proximo" && lembreteForm.antecedenciaMinutos !== ""
          ? parseInt(String(lembreteForm.antecedenciaMinutos), 10)
          : null,
      ativo: !!lembreteForm.ativo,
      data: tipoGatilhoNorm === "agendado" ? dataTrim : null,
      hora: tipoGatilhoNorm === "agendado" ? horaNorm : null,
    };
    try {
      if (lembreteForm.id) {
        await api.put(`/tickets/${ticket.id}/lembretes/${lembreteForm.id}`, body);
        toast.success("Lembrete atualizado.");
      } else {
        await api.post(`/tickets/${ticket.id}/lembretes`, {
          ...body,
          addGoogle: false,
        });
        toast.success("Lembrete criado.");
      }
      setLembreteEditorOpen(false);
      await reloadKanbanLembretes();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Erro ao salvar lembrete.");
    }
  };

  const setCardLembretesEnabled = async (enabled) => {
    if (!hasRealTicketId || !ticket?.id || (kanbanLembretes || []).length === 0) return;
    try {
      const toUpdate = (kanbanLembretes || []).filter((l) => (l.ativo !== false) !== enabled);
      if (toUpdate.length === 0) return;
      await Promise.all(
        toUpdate.map((l) => api.put(`/tickets/${ticket.id}/lembretes/${l.id}`, { ativo: enabled }))
      );
      await reloadKanbanLembretes();
      toast.success(enabled ? "Lembretes ativados para este card." : "Lembretes desativados para este card.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao alterar lembretes do card.");
    }
  };

  const toggleAutoMoveWhatsapp = async (enabled) => {
    if (!hasRealTicketId || !ticket?.id) return;
    if (enabled && !hasRealLinkedContact) {
      toast.warn("Este card não tem contato com número válido para WhatsApp.");
      return;
    }
    try {
      if (autoMoveWhatsappLembrete?.id) {
        await api.put(`/tickets/${ticket.id}/lembretes/${autoMoveWhatsappLembrete.id}`, {
          ativo: enabled,
        });
      } else if (enabled) {
        await api.post(`/tickets/${ticket.id}/lembretes`, {
          nome: "Notificar contato na movimentação",
          descricao: AUTO_MOVE_WHATSAPP_MARKER,
          tipoGatilho: "movimentacao",
          destinoTipo: "contato_whatsapp",
          mensagemTemplate:
            "Olá, {nome_contato}! Seu processo {nome_card} foi atualizado e agora está na etapa {nome_coluna}. Qualquer dúvida, estamos à disposição.",
          data: null,
          hora: null,
          addGoogle: false,
          ativo: true,
        });
      }
      await reloadKanbanLembretes();
      toast.success(
        enabled
          ? "Notificação automática ao contato ativada."
          : "Notificação automática ao contato desativada."
      );
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Erro ao atualizar automação.");
    }
  };

  const deleteKanbanLembreteRow = async (id) => {
    if (!hasRealTicketId || !ticket?.id || !id) return;
    if (!window.confirm("Remover este lembrete?")) return;
    try {
      await api.delete(`/tickets/${ticket.id}/lembretes/${id}`);
      toast.success("Lembrete removido.");
      await reloadKanbanLembretes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao remover.");
    }
  };

  const toggleKanbanLembreteAtivo = async (row) => {
    if (!hasRealTicketId || !ticket?.id || !row?.id) return;
    try {
      await api.put(`/tickets/${ticket.id}/lembretes/${row.id}`, { ativo: !row.ativo });
      await reloadKanbanLembretes();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao alterar.");
    }
  };

  const testKanbanLembreteRow = async (id) => {
    if (!hasRealTicketId || !ticket?.id || !id) return;
    try {
      await api.post(`/tickets/${ticket.id}/lembretes/${id}/test`);
      toast.success("Teste disparado (notificação e WhatsApp, se configurado).");
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || "Erro no teste.");
    }
  };

  const openKanbanLembreteHistorico = async (row) => {
    if (!hasRealTicketId || !ticket?.id || !row?.id) return;
    setLembreteHistoricoTitulo(row.nome || "Histórico");
    setLembreteHistoricoId(row.id);
    setLembreteHistoricoOpen(true);
    setLembreteDisparosLoading(true);
    try {
      const { data } = await api.get(`/tickets/${ticket.id}/lembretes/${row.id}/disparos`);
      setLembreteDisparos(data.disparos || []);
    } catch {
      setLembreteDisparos([]);
    } finally {
      setLembreteDisparosLoading(false);
    }
  };

  const handleSaveValores = async () => {
    if (!quadroApiUuid) {
      toast.error("Não foi possível identificar o quadro para salvar.");
      return;
    }
    try {
      const itensPayload = processoDetalhesItens
        .filter((x) => (x.titulo || "").trim() || (x.descricao || "").trim())
        .map((x) => ({
          id: x.id,
          titulo: (x.titulo || "").trim(),
          descricao: x.descricao || "",
        }));
      const payload = {
        valorServico,
        valorEntrada,
        nomeProjeto: nomeProjeto || undefined,
        dataPrazo: (dataPrazo || "").trim() || null,
        detalhesProcessoItens: itensPayload,
        customFields: filterQuadroCustomFieldsForUi(customFields)
          .filter((f) => (f.name || "").trim())
          .map((f) => ({ name: (f.name || "").trim(), value: (f.value || "").trim(), type: f.type || "text" })),
        ...quadroViewContext(),
      };
      await api.put("/tickets/" + quadroApiUuid + "/quadro", payload);
      toast.success("Cartão, detalhes do processo e campos salvos.");
      savedValuesRef.current = {
        ...savedValuesRef.current,
        valorServico,
        valorEntrada,
        nomeProjeto: nomeProjeto || "",
        dataPrazo: (dataPrazo || "").trim() || "",
        processoDetalhesItens: itensPayload,
        customFields: filterQuadroCustomFieldsForUi(customFields).filter((f) => (f.name || "").trim()).map((f) => ({ name: (f.name || "").trim(), value: (f.value || "").trim(), type: f.type || "text" })),
      };
      if (typeof onQuadroUpdated === "function") onQuadroUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar.");
      throw err;
    }
  };
  handleSaveValoresRef.current = handleSaveValores;

  const addProcessoDetalheItem = () => {
    const item = newProcessoDetalheItem();
    setProcessoDetalhesItens((prev) => [...prev, item]);
    setProcessoRowExpanded((prev) => ({ ...prev, [String(item.id)]: true }));
  };
  const updateProcessoDetalheItem = (index, field, value) =>
    setProcessoDetalhesItens((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  const removeProcessoDetalheItem = (index) =>
    setProcessoDetalhesItens((prev) => prev.filter((_, i) => i !== index));
  const moveProcessoDetalheItem = (index, delta) =>
    setProcessoDetalhesItens((prev) => {
      const j = index + delta;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  const addCustomField = () => setCustomFields((prev) => [...prev, { name: "", value: "", type: "text" }]);
  const updateCustomField = (index, field, key, value) => {
    setCustomFields((prev) => prev.map((f, i) => (i === index ? { ...f, [key]: value } : f)));
  };
  const removeCustomField = (index) => setCustomFields((prev) => prev.filter((_, i) => i !== index));

  const openChangeClientPanel = () => {
    const c = ticket?.contact;
    const hint =
      (c?.name || "").trim() ||
      (nomeProjeto || "").trim() ||
      String(manualWaPhone || "").replace(/\D/g, "");
    setContactSearch(hint.length >= 2 ? hint.slice(0, 120) : hint);
    setSelectedNewContact(null);
    setChangeClientOpen(true);
  };

  const closeChangeClientPanel = () => {
    setChangeClientOpen(false);
    setContactSearch("");
    setSelectedNewContact(null);
    setContactOptions([]);
  };

  const toggleChangeClientPanel = () => {
    if (changeClientOpen) closeChangeClientPanel();
    else openChangeClientPanel();
  };

  useEffect(() => {
    if (!readOnly && changeClientOpen && contactSearch.length >= 2) {
      const t = setTimeout(async () => {
        setLoadingContact(true);
        try {
          const { data } = await api.get("contacts", { params: { searchParam: contactSearch } });
          setContactOptions(data.contacts || []);
        } catch (err) {
          setContactOptions([]);
        } finally {
          setLoadingContact(false);
        }
      }, 400);
      return () => clearTimeout(t);
    } else {
      setContactOptions([]);
    }
  }, [readOnly, changeClientOpen, contactSearch]);

  const handleTrocarCliente = async () => {
    if (!selectedNewContact?.id || !quadroApiUuid) return;
    try {
      // Buscar dados completos do contato (incluindo extraInfo)
      let fullContact = selectedNewContact;
      try {
        const { data } = await api.get(`/contacts/${selectedNewContact.id}`);
        fullContact = data || selectedNewContact;
      } catch (fetchErr) {
        // Usa os dados do autocomplete se falhar
      }

        if (hasRealTicketId) {
          await api.put(`/tickets/${ticket.id}/contact`, { contactId: fullContact.id });
        } else if (isStandaloneQuadro) {
          await api.put(`/standalone-ticket-quadros/${quadroApiUuid}/linked-contact`, { linkedContactId: fullContact.id });
        } else {
          throw new Error("NO_CONTACT_ROUTE");
        }

      const extra = fullContact.extraInfo || [];
      const contactCompany = getExtraInfoValue(extra, "empresa") || getExtraInfoValue(extra, "nome_empresa") || getExtraInfoValue(extra, "company") || "";

      // Preencher nome do projeto com a empresa se vazio
      if (!nomeProjeto && contactCompany) {
        setNomeProjeto(contactCompany);
      }

      toast.success("Cliente vinculado. Dados do contato ficam em «Dados do contato»; use «Campos personalizados» só para extras.");
      setTicket((prev) => (prev ? { ...prev, contact: fullContact } : null));
      closeChangeClientPanel();

      // Gravar quadro sem duplicar CPF/nome/e-mail em customFields (só extras + Telefone manual)
      try {
        const finalFields = filterQuadroCustomFieldsForUi(customFields).filter((f) => (f.name || "").trim());
        await api.put("/tickets/" + quadroApiUuid + "/quadro", {
          valorServico,
          valorEntrada,
          nomeProjeto: (!nomeProjeto && contactCompany) ? contactCompany : (nomeProjeto || undefined),
          customFields: finalFields.map((f) => ({ name: (f.name || "").trim(), value: (f.value || "").trim(), type: f.type || "text" })),
          ...quadroViewContext(),
        });
      } catch (saveErr) {
        toast.warn(
          saveErr?.response?.data?.message ||
            "Contato vinculado, mas não foi possível gravar todos os campos no servidor. Use «Salvar valores» na secção do projeto."
        );
      }
    } catch (err) {
      if (err?.message === "NO_CONTACT_ROUTE") {
        toast.error("Não foi possível vincular o contato a este cartão.");
      } else {
        toast.error(err?.response?.data?.message || "Erro ao trocar cliente.");
      }
    }
  };

  const handleRemoverVinculoContato = async () => {
    if (!quadroApiUuid) return;
    if (!isStandaloneQuadro) {
      toast.info(
        "Em tickets ligados a um atendimento, o contato vem da conversa. Cartões de quadro livre permitem remover o vínculo."
      );
      return;
    }
    try {
      await api.put(`/standalone-ticket-quadros/${quadroApiUuid}/linked-contact`, { linkedContactId: null });
      toast.success("Contato desvinculado do cartão.");
      await loadAll();
      if (typeof onQuadroUpdated === "function") onQuadroUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Não foi possível remover o vínculo.");
    }
  };

  const handleSaveTituloCard = async () => {
    if (!quadroApiUuid || readOnly) return;
    const trimmed = (nomeProjetoDraft || "").trim();
    try {
      await api.put(`/tickets/${quadroApiUuid}/quadro`, {
        nomeProjeto: trimmed || undefined,
        ...quadroViewContext(),
      });
      setNomeProjeto(trimmed);
      setEditingTituloCard(false);
      savedValuesRef.current = { ...savedValuesRef.current, nomeProjeto: trimmed };
      toast.success("Nome do cartão atualizado.");
      if (typeof onQuadroUpdated === "function") onQuadroUpdated();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar o nome do cartão.");
      throw err;
    }
  };
  handleSaveTituloRef.current = handleSaveTituloCard;

  const persistManualPhoneToQuadro = async () => {
    if (!quadroApiUuid || readOnly || !isStandaloneQuadro) return;
    const v = (manualWaPhone || "").trim();
    const filtered = customFields.filter((f) => (f.name || "").trim() !== "Telefone (manual)");
    const merged = v
      ? [...filtered, { name: "Telefone (manual)", value: v, type: "text" }]
      : filtered;
    try {
      await api.put(`/tickets/${quadroApiUuid}/quadro`, {
        nomeProjeto: nomeProjeto || undefined,
        valorServico,
        valorEntrada,
        customFields: merged
          .filter((f) => (f.name || "").trim())
          .map((f) => ({ name: (f.name || "").trim(), value: (f.value || "").trim(), type: f.type || "text" })),
        ...quadroViewContext(),
      });
      setCustomFields(merged);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar o telefone manual.");
    }
  };

  const contactName = ticket?.contact?.name || "";
  /** Contato de CRM vinculado — não confundir com placeholder nem com só nome preenchido sem id/número. */
  const hasRealLinkedContact = hasRealLinkedContactFromTicket(ticket);

  const handleOpenConversaQuadro = () => {
    if (!ticket?.uuid) return;
    /**
     * Com contato vinculado ou ticket de atendimento: abrir conversa NO APP primeiro (não wa.me).
     * wa.me só quando não há chat interno disponível (sem onOpenChat) ou quadro livre sem vínculo útil.
     */
    const preferAppChat =
      typeof onOpenChat === "function" &&
      (hasRealLinkedContact || !isStandaloneQuadro);
    if (preferAppChat) {
      onOpenChat(ticket.uuid);
      return;
    }
    if (whatsappDialDigits.length >= 10) {
      openWhatsAppWebFromContact(
        { number: whatsappDialDigits },
        () =>
          toast.info("Informe um telefone com DDD (mín. 10 dígitos) no contato ou no campo «Telefone (WhatsApp)».")
      );
      return;
    }
    if (typeof onOpenChat === "function") {
      onOpenChat(ticket.uuid);
      return;
    }
    if (isStandaloneQuadro) {
      openWhatsAppWebFromContact(
        { number: (manualWaPhone || ticket?.contact?.number || "").trim() },
        () => toast.info("Informe um telefone válido no campo acima ou vincule um contato com número (mín. 10 dígitos).")
      );
    }
  };

  const canOpenConversa =
    !!ticket?.uuid &&
    (whatsappDialDigits.length >= 10 ||
      typeof onOpenChat === "function" ||
      (isStandaloneQuadro &&
        String(manualWaPhone || ticket?.contact?.number || "")
          .replace(/\D/g, "")
          .length >= 10));

  const queueName = ticket?.queue?.name || "";
  const whatsappName = ticket?.whatsapp?.name || "";
  const assignedUser = ticket?.user?.name || "";
  const quadroStatusMeta = getQuadroStatusMeta(status, statusOptions);

  return (
    <Dialog
      open={open}
      onClose={handleRequestClose}
      className={classes.dialog}
      maxWidth={false}
      fullScreen={fullScreen}
      scroll="paper"
    >
      <DialogContent className={classes.dialogContent} dividers>
        {loading ? (
          <div className={classes.loadingBox}>
            <CircularProgress size={40} thickness={4} />
            <Typography color="textSecondary" variant="body2">
              Carregando quadro…
            </Typography>
          </div>
        ) : (
          <>
            <Paper className={classes.headerSurface} elevation={0}>
              <Box className={classes.headerTitleRow}>
                <Box flex={1} minWidth={0}>
                  <Typography variant="caption" color="textSecondary" style={{ display: "block", letterSpacing: "0.04em", textTransform: "uppercase", fontSize: "0.68rem" }}>
                    Área (Kanban){displayQuadroGroupName ? `: ${displayQuadroGroupName}` : ""}
                  </Typography>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {editingTituloCard && !readOnly ? (
                      <>
                        <TextField
                          size="small"
                          variant="outlined"
                          placeholder="Nome do cartão"
                          value={nomeProjetoDraft}
                          onChange={(e) => setNomeProjetoDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTituloCard();
                            if (e.key === "Escape") {
                              setEditingTituloCard(false);
                              setNomeProjetoDraft(nomeProjeto || "");
                            }
                          }}
                          style={{ minWidth: 200, maxWidth: 360 }}
                          autoFocus
                        />
                        <Button size="small" color="primary" variant="contained" onClick={handleSaveTituloCard}>
                          Salvar
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingTituloCard(false);
                            setNomeProjetoDraft(nomeProjeto || "");
                          }}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Typography variant="subtitle1" style={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.35 }}>
                          Cartão: {nomeProjeto?.trim() || "Sem título"}
                        </Typography>
                        {!readOnly && (
                          <Tooltip title="Editar nome do cartão">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setNomeProjetoDraft(nomeProjeto || "");
                                setEditingTituloCard(true);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </>
                    )}
                  </div>
                  {isStandaloneQuadro && (
                    <TextField
                      size="small"
                      variant="outlined"
                      label="Telefone (WhatsApp)"
                      placeholder="DDD + número"
                      value={manualWaPhone}
                      onChange={(e) => setManualWaPhone(e.target.value)}
                      onBlur={persistManualPhoneToQuadro}
                      disabled={readOnly}
                      style={{ marginTop: 8, maxWidth: 360 }}
                      fullWidth
                      helperText="Quadro livre: use para abrir o WhatsApp ou se o contato não tiver número. Salva ao sair do campo."
                    />
                  )}
                </Box>
                <Box
                  display="flex"
                  flexWrap="wrap"
                  alignItems="center"
                  justifyContent="flex-end"
                  flexShrink={0}
                  style={{ gap: 8 }}
                >
                  {readOnly && (
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={handleAtualizar}
                      disabled={loading || refreshing}
                    >
                      {refreshing ? "Atualizando…" : "Atualizar"}
                    </Button>
                  )}
                  {onOpenMove && ticket && (
                    <Tooltip title="Mover para outra área, etapa ou atendente (sai do quadro atual)">
                      <Button size="small" startIcon={<SwapHoriz />} onClick={() => onOpenMove(ticket)}>
                        Mover
                      </Button>
                    </Tooltip>
                  )}
                  {onOpenShare && ticket && (
                    <Tooltip title="Compartilhar com outras áreas (vinculado ou desvinculado)">
                      <Button size="small" startIcon={<Share />} onClick={() => onOpenShare(ticket)}>
                        Compartilhar
                      </Button>
                    </Tooltip>
                  )}
                  <IconButton onClick={handleRequestClose} size="small" aria-label="Fechar">
                    <Close />
                  </IconButton>
                </Box>
              </Box>
              <Box className={classes.headerMetaRow}>
                  {hasRealLinkedContact && (
                    <Typography variant="body2" style={{ fontWeight: 600, maxWidth: "100%" }}>
                      Contato: {contactName}
                    </Typography>
                  )}
                  {!readOnly && (
                    <Tooltip title={isStandaloneQuadro ? "Vincular contato (opcional)" : "Trocar cliente vinculado"}>
                      <IconButton size="small" onClick={toggleChangeClientPanel}>
                        <PersonAdd fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {!readOnly && isStandaloneQuadro && hasRealLinkedContact && (
                    <Button size="small" color="secondary" onClick={handleRemoverVinculoContato}>
                      Remover vínculo
                    </Button>
                  )}
                  <Tooltip
                    title={
                      hasRealLinkedContact && typeof onOpenChat === "function"
                        ? "Abrir conversa no sistema (atendimento)"
                        : whatsappDialDigits.length >= 10
                          ? "Abrir conversa no WhatsApp (wa.me)"
                          : typeof onOpenChat === "function"
                            ? "Abrir conversa no sistema"
                            : isStandaloneQuadro
                              ? "Informe telefone ou vincule contato"
                              : "Indisponível neste contexto"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        disabled={!canOpenConversa}
                        onClick={handleOpenConversaQuadro}
                      >
                        <WhatsApp fontSize="small" style={{ color: "#25d366" }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {queueName && (
                    <Typography variant="caption" color="textSecondary">
                      {queueName}
                      {whatsappName ? ` · ${whatsappName}` : ""}
                      {assignedUser ? ` · ${assignedUser}` : ""}
                    </Typography>
                  )}
                  {readOnly ? (
                    <Chip
                      size="small"
                      label={quadroStatusMeta.label}
                      className={classes.statusChip}
                      style={{
                        backgroundColor: quadroStatusMeta.color,
                        color: "#fff",
                      }}
                    />
                  ) : (
                    <>
                      <FormControl variant="outlined" size="small" className={classes.statusSelect}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={status}
                          onChange={async (e) => {
                            const v = e.target.value;
                            const previous = status;
                            setStatus(v);
                            if (!quadroApiUuid) return;
                            try {
                              const { data: body } = await api.put("/tickets/" + quadroApiUuid + "/quadro/status", {
                                status: v,
                                ...quadroViewContext(),
                              });
                              const saved = body?.quadro?.status != null ? String(body.quadro.status).trim() : v;
                              setStatus(saved);
                              ensureStatusInOptions(saved, setStatusOptions);
                              toast.success("Status do quadro atualizado.");
                              if (typeof onQuadroUpdated === "function") onQuadroUpdated();
                            } catch (err) {
                              setStatus(previous);
                              toast.error(err?.response?.data?.message || "Erro ao atualizar status.");
                            }
                          }}
                          label="Status"
                          renderValue={(val) => {
                            const meta = getQuadroStatusMeta(val, statusOptions);
                            return (
                              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    backgroundColor: meta.color,
                                    flexShrink: 0,
                                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                                  }}
                                />
                                {meta.label}
                              </span>
                            );
                          }}
                        >
                          {statusOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              <FiberManualRecord style={{ fontSize: 12, color: opt.color, marginRight: 8 }} />
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Tooltip title="Gerenciar status personalizados">
                        <IconButton size="small" onClick={() => setStatusManagerOpen(true)} style={{ marginLeft: 4 }}>
                          <Settings fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
              </Box>
                {!readOnly && (
                  <Typography variant="caption" color="textSecondary" component="p" style={{ margin: "10px 0 0", maxWidth: 720 }}>
                    Status do quadro (ex.: concluído, pendente) não altera a coluna do Kanban. Para mudar de coluna, arraste o card no quadro.
                  </Typography>
                )}
            </Paper>
            {!readOnly && changeClientOpen && (
              <Paper variant="outlined" className={classes.changeClientRow} style={{ padding: 16 }}>
                <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
                  Vincular contato
                </Typography>
                <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                  Ao vincular um contato, os dados (CPF/CNPJ, nome, empresa, e-mail, telefone, endereço) serão preenchidos automaticamente.
                </Typography>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Autocomplete
                    className={classes.changeClientAutocomplete}
                    options={contactOptions}
                    getOptionLabel={(opt) => (opt.name ? `${opt.name} - ${opt.number || ""}` : "")}
                    loading={loadingContact}
                    value={selectedNewContact}
                    onChange={(_, v) => setSelectedNewContact(v)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        placeholder="Buscar contato (mín. 2 letras)"
                        variant="outlined"
                        onChange={(e) => setContactSearch(e.target.value)}
                      />
                    )}
                  />
                  <Button variant="contained" color="primary" size="small" disabled={!selectedNewContact} onClick={handleTrocarCliente}>
                    Vincular e preencher
                  </Button>
                  {isStandaloneQuadro && hasRealLinkedContact && (
                    <Button size="small" color="secondary" onClick={handleRemoverVinculoContato}>
                      Remover vínculo
                    </Button>
                  )}
                  <Button size="small" onClick={closeChangeClientPanel}>Cancelar</Button>
                </div>
                {selectedNewContact && (
                  <Paper
                    variant="outlined"
                    style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: "#f0f7ff",
                      borderColor: "#90caf9",
                      borderRadius: 8,
                    }}
                  >
                    <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                      Dados que serão preenchidos:
                    </Typography>
                    <Box display="flex" flexWrap="wrap" style={{ gap: 8 }}>
                      {selectedNewContact.name && (
                        <Typography variant="caption" style={{ backgroundColor: "#e3f2fd", padding: "2px 8px", borderRadius: 4 }}>
                          Nome: {selectedNewContact.name}
                        </Typography>
                      )}
                      {selectedNewContact.number && (
                        <Typography variant="caption" style={{ backgroundColor: "#e3f2fd", padding: "2px 8px", borderRadius: 4 }}>
                          Tel: {selectedNewContact.number}
                        </Typography>
                      )}
                      {selectedNewContact.email && (
                        <Typography variant="caption" style={{ backgroundColor: "#e3f2fd", padding: "2px 8px", borderRadius: 4 }}>
                          E-mail: {selectedNewContact.email}
                        </Typography>
                      )}
                    </Box>
                  </Paper>
                )}
              </Paper>
            )}

            <Accordion
              expanded={modalSectionOpen.capa}
              onChange={setModalAcc("capa")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>📌 Informações do card · capa</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                {coverImage ? (
                  <div className={classes.coverWrapper}>
                    <img src={coverImage} alt="Capa do projeto" className={classes.coverImage} />
                  </div>
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    Nenhuma capa. Envie imagens em «Anexos gerais» e defina uma como capa do Kanban.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={modalSectionOpen.contact}
              onChange={setModalAcc("contact")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>👤 Dados do contato</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                <Paper
                  elevation={0}
                  className={classes.contactSection}
                  style={{
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    backgroundColor: "transparent",
                  }}
                >
                  <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                    Cadastro do cliente vinculado ao cartão. Alterações aqui atualizam o contato no sistema.
                  </Typography>

              {!readOnly && !hasRealLinkedContact && (
                <Alert severity="info" style={{ marginBottom: 16 }}>
                  {isStandaloneQuadro ? (
                    <>
                      Sem contato vinculado. Pode preencher os dados abaixo e usar «Salvar Dados do Contato» para guardar só neste
                      cartão, ou vincular um contato para atualizar o cadastro no sistema.
                    </>
                  ) : (
                    <>Sem contato vinculado a este cartão. Associe um contato para gravar os dados abaixo no cadastro.</>
                  )}
                  <Button color="primary" size="small" style={{ marginLeft: 8 }} onClick={openChangeClientPanel}>
                    Vincular contato
                  </Button>
                </Alert>
              )}

              <div className={classes.contactHeader}>
                {hasRealLinkedContact ? (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" style={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
                      {contactFormData.name || ticket?.contact?.name || "—"}
                    </Typography>
                    <div className={classes.contactPhoneRow}>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        style={
                          contactPhoneResolved.isInternalId && !contactPhoneResolved.copyText
                            ? { fontSize: 11, lineHeight: 1.4 }
                            : undefined
                        }
                      >
                        {contactPhoneResolved.displayLine}
                      </Typography>
                      {contactPhoneResolved.copyText && (
                        <CopyToClipboard
                          text={contactPhoneResolved.copyText}
                          onCopy={() => toast.success("Número copiado!")}
                        >
                          <Tooltip
                            title={
                              contactPhoneResolved.isInternalId
                                ? "Copia o identificador interno (LID). Cadastre o telefone em TELEFONE 1 nos campos customizados do contato."
                                : "Copiar número"
                            }
                          >
                            <IconButton size="small" style={{ padding: 2 }}>
                              <FileCopy style={{ fontSize: 14 }} />
                            </IconButton>
                          </Tooltip>
                        </CopyToClipboard>
                      )}
                    </div>
                  </div>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Sem contato vinculado (opcional). Use o botão «Vincular contato» no topo do quadro.
                  </Typography>
                )}
              </div>

              <div className={classes.contactFieldsGrid}>
                {/* Nome */}
                <TextField
                  label="Nome"
                  value={contactFormData.name}
                  onChange={(e) => handleContactFieldChange("name", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  InputProps={!readOnly ? {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Create className={classes.smallMutedIcon} />
                      </InputAdornment>
                    ),
                  } : undefined}
                />

                {/* Email */}
                <TextField
                  label="Email"
                  value={contactFormData.email}
                  onChange={(e) => handleContactFieldChange("email", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="Digite o email"
                />

                <TextField
                  label="CPF"
                  value={contactFormData.cpf}
                  onChange={(e) => handleContactFieldChange("cpf", formatCpfInput(e.target.value))}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="000.000.000-00"
                  inputProps={{ maxLength: 14 }}
                />

                <TextField
                  label="CNPJ"
                  value={contactFormData.cnpj}
                  onChange={(e) => handleContactFieldChange("cnpj", formatCnpjInput(e.target.value))}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="00.000.000/0000-00"
                  inputProps={{ maxLength: 18 }}
                />

                {/* País */}
                <TextField
                  label="País"
                  value={contactFormData.country}
                  onChange={(e) => handleContactFieldChange("country", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="País"
                />

                {/* Cidade */}
                <TextField
                  label="Cidade"
                  value={contactFormData.city}
                  onChange={(e) => handleContactFieldChange("city", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="Cidade"
                />

                {/* Estado */}
                <TextField
                  label="Estado"
                  value={contactFormData.state}
                  onChange={(e) => handleContactFieldChange("state", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="Estado"
                />

                {/* Origem do Lead */}
                <FormControl variant="outlined" size="small" fullWidth disabled={readOnly}>
                  <InputLabel>Origem do lead</InputLabel>
                  <Select
                    value={contactFormData.leadOrigin}
                    onChange={(e) => handleContactFieldChange("leadOrigin", e.target.value)}
                    label="Origem do lead"
                  >
                    <MenuItem value=""><em>Selecione</em></MenuItem>
                    <MenuItem value="whatsapp">WhatsApp</MenuItem>
                    <MenuItem value="facebook">Facebook</MenuItem>
                    <MenuItem value="instagram">Instagram</MenuItem>
                    <MenuItem value="site">Site</MenuItem>
                    <MenuItem value="indicacao">Indicação</MenuItem>
                    <MenuItem value="google">Google</MenuItem>
                    <MenuItem value="outro">Outro</MenuItem>
                  </Select>
                </FormControl>

                <Typography className={classes.contactSectionTitle}>
                  Entrega
                </Typography>

                <TextField
                  label="Data de entrega"
                  type="date"
                  value={contactFormData.deliveryDate}
                  onChange={(e) => handleContactFieldChange("deliveryDate", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  InputLabelProps={{ shrink: true }}
                  className={classes.contactFieldFull}
                />

                <Typography className={classes.contactSectionTitle}>
                  Negócio
                </Typography>

                {/* Valor do Negócio */}
                <TextField
                  label="Valor do Negócio"
                  value={contactFormData.dealValue}
                  onChange={(e) => handleContactFieldChange("dealValue", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                />

                {/* Empresa */}
                <TextField
                  label="Empresa"
                  value={contactFormData.company}
                  onChange={(e) => handleContactFieldChange("company", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="Empresa"
                />

                {/* Cargo */}
                <TextField
                  label="Cargo"
                  value={contactFormData.position}
                  onChange={(e) => handleContactFieldChange("position", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  disabled={readOnly}
                  placeholder="Cargo"
                />

                {dealNegocioExtraFields.map((row) => (
                  <Box
                    key={row.id}
                    display="flex"
                    alignItems="flex-start"
                    gap={1}
                    flexWrap="wrap"
                    className={classes.contactFieldFull}
                  >
                    <TextField
                      label="Nome do campo"
                      value={row.label}
                      onChange={(e) => handleDealNegocioFieldChange(row.id, "label", e.target.value)}
                      variant="outlined"
                      size="small"
                      style={{ flex: 1, minWidth: 140 }}
                      disabled={readOnly}
                      placeholder="Ex.: Prazo, Forma pagamento"
                    />
                    <TextField
                      label="Valor"
                      value={row.value}
                      onChange={(e) => handleDealNegocioFieldChange(row.id, "value", e.target.value)}
                      variant="outlined"
                      size="small"
                      style={{ flex: 1, minWidth: 160 }}
                      disabled={readOnly}
                    />
                    {!readOnly && (
                      <IconButton size="small" onClick={() => handleRemoveDealNegocioField(row.id)} color="secondary" title="Remover campo">
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                ))}

                {!readOnly && (
                  <div className={classes.contactFieldFull}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<Add />}
                      onClick={handleAddDealNegocioField}
                    >
                      Adicionar campo ao negócio
                    </Button>
                  </div>
                )}

                <Typography className={classes.contactSectionTitle}>
                  Produtos de Interesse
                </Typography>

                {/* Produtos - input só no modo edição */}
                {!readOnly && (
                  <div className={classes.contactFieldFull} style={{ display: "flex", gap: 8 }}>
                    <TextField
                      label="Produto"
                      value={contactFormData.productInput}
                      onChange={(e) => handleContactFieldChange("productInput", e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); handleContactAddProduct(); }
                      }}
                      variant="outlined"
                      size="small"
                      fullWidth
                      placeholder="Digite um produto"
                    />
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={handleContactAddProduct}
                      style={{ whiteSpace: "nowrap", minWidth: "auto" }}
                    >
                      +
                    </Button>
                  </div>
                )}

                {contactFormData.products.length > 0 && (
                  <div className={classes.contactChipContainer}>
                    {contactFormData.products.map((product, pIdx) => (
                      <span key={pIdx} className={classes.contactProductChip}>
                        {product}
                        {!readOnly && (
                          <Close
                            style={{ fontSize: 14, cursor: "pointer" }}
                            onClick={() => handleContactRemoveProduct(pIdx)}
                          />
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {contactFormData.products.length === 0 && readOnly && (
                  <Typography variant="body2" color="textSecondary" className={classes.contactFieldFull}>
                    Nenhum produto cadastrado.
                  </Typography>
                )}

                <Typography className={classes.contactSectionTitle}>
                  Observações
                </Typography>

                {/* Observações */}
                <TextField
                  className={classes.contactFieldFull}
                  value={contactFormData.observation}
                  onChange={(e) => handleContactFieldChange("observation", e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                  multiline
                  rows={3}
                  disabled={readOnly}
                  placeholder="Digite uma observação"
                />

                {/* BOTÃO SALVAR TUDO */}
                {!readOnly && (
                  <Button
                    className={classes.contactFieldFull}
                    variant="contained"
                    color="primary"
                    size="small"
                    fullWidth
                    onClick={handleSaveAllContactFields}
                    disabled={contactFormSaving}
                    style={{ marginTop: 4, fontWeight: 600 }}
                  >
                    {contactFormSaving ? "Salvando..." : "Salvar Dados do Contato"}
                  </Button>
                )}
              </div>
            </Paper>
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={modalSectionOpen.descricao}
              onChange={setModalAcc("descricao")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>📝 Descrição do projeto</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                <Paper
                  elevation={0}
                  className={classes.editorCard}
                  style={{
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    backgroundColor: "transparent",
                  }}
                >
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 10 }}>
                Texto com formatação (negrito, listas, imagens). Ideal para briefing ou comunicação com o cliente.
              </Typography>
              {readOnly ? (
                <div
                  className={classes.readOnlyHtmlBox}
                  dangerouslySetInnerHTML={{ __html: description || "" }}
                />
              ) : !editMode ? (
                <>
                  <div className={classes.actionsRow}>
                    <Tooltip title="Editar descrição">
                      <IconButton size="small" onClick={handleEditClick}><Edit /></IconButton>
                    </Tooltip>
                    <Tooltip title="Ajuda">
                      <IconButton size="small"><HelpOutline /></IconButton>
                    </Tooltip>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={handleEditClick}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleEditClick();
                    }}
                    className={classes.readOnlyHtmlBox}
                    style={{ cursor: "pointer", minHeight: 56 }}
                    dangerouslySetInnerHTML={{
                      __html:
                        description ||
                        "<p style='margin:0;opacity:0.72'>Clique para editar a descrição.</p>",
                    }}
                  />
                </>
              ) : (
                <>
                  <div className={classes.toolbar}>
                    <Select size="small" value="" displayEmpty style={{ minWidth: 48, height: 32 }} onMouseDown={(e) => e.preventDefault()} onChange={(e) => execCmd("fontSize", e.target.value)}>
                      <MenuItem value="1">P</MenuItem>
                      <MenuItem value="3">Tt</MenuItem>
                      <MenuItem value="5">H</MenuItem>
                    </Select>
                    <IconButton size="small" onClick={() => execCmd("bold")} title="Negrito"><Typography style={{ fontWeight: 700 }}>B</Typography></IconButton>
                    <IconButton size="small" onClick={() => execCmd("italic")} title="Itálico"><Typography style={{ fontStyle: "italic" }}>I</Typography></IconButton>
                    <IconButton size="small" onClick={() => execCmd("insertUnorderedList")} title="Lista"><FormatListBulleted fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={handleInsertLink} title="Link"><Link fontSize="small" /></IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const el = imageInputRef.current;
                        if (el) el.click();
                      }}
                      title="Inserir imagem"
                    >
                      <Image fontSize="small" />
                    </IconButton>
                    <input type="file" ref={imageInputRef} accept="image/*" className={classes.inputFile} onChange={handleInsertImage} />
                  </div>
                  <div ref={editorRef} className={classes.editorArea} contentEditable suppressContentEditableWarning />
                  <div className={classes.editorButtons}>
                    <Button variant="contained" color="primary" size="small" startIcon={<Save />} onClick={handleSave}>Salvar</Button>
                    <Button variant="outlined" size="small" startIcon={<DeleteOutline />} onClick={handleDiscard}>Descartar alterações</Button>
                    <Button size="small" startIcon={<HelpOutline />}>Ajuda para formatação</Button>
                  </div>
                </>
              )}
            </Paper>
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={modalSectionOpen.finance}
              onChange={setModalAcc("finance")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>💰 Informações financeiras · cartão e prazo</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                <Paper
                  elevation={0}
                  style={{
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    backgroundColor: "transparent",
                  }}
                >
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                Título do cartão (projeto ou empresa) — distinto da área do Kanban e do contato.
              </Typography>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                label="Nome no cartão"
                placeholder="Ex.: Placa RF Personalizados"
                value={nomeProjeto || ""}
                onChange={(e) => setNomeProjeto(e.target.value)}
                disabled={readOnly}
                style={{ marginBottom: 16 }}
              />
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                type="date"
                label="Prazo do card (lembretes de prazo)"
                value={dataPrazo || ""}
                onChange={(e) => setDataPrazo(e.target.value)}
                disabled={readOnly}
                InputLabelProps={{ shrink: true }}
                style={{ marginBottom: 16 }}
                helperText="Usado pelos lembretes inteligentes «próximo do prazo» e «vencido». Deixe em branco se não houver data limite."
              />
              <Typography variant="subtitle2" className={classes.financeBlockTitle}>
                Valores (R$)
              </Typography>
              <div className={classes.valuesGrid}>
                <TextField
                  type="number"
                  label="Valor do serviço"
                  value={valorServico || ""}
                  onChange={(e) => setValorServico(parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                  size="small"
                  variant="outlined"
                  fullWidth
                  disabled={readOnly}
                />
                <TextField
                  type="number"
                  label="Valor de entrada"
                  value={valorEntrada || ""}
                  onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                  size="small"
                  variant="outlined"
                  fullWidth
                  disabled={readOnly}
                />
                <Typography variant="body2" component="div" className={classes.saldoHighlight}>
                  Falta pagar: R$ {(Number(valorServico) - Number(valorEntrada)).toFixed(2)}
                </Typography>
                {!readOnly && (
                  <div className={classes.valuesSaveRow}>
                    <Button variant="contained" color="primary" size="small" startIcon={<Save />} onClick={handleSaveValores}>
                      Salvar cartão e processo
                    </Button>
                  </div>
                )}
              </div>
            </Paper>
              </AccordionDetails>
            </Accordion>

            {hasRealTicketId && (
              <Accordion
                expanded={modalSectionOpen.lembretes}
                onChange={setModalAcc("lembretes")}
                className={classes.modalAccordion}
              >
                <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                  <Typography className={classes.modalAccordionTitle}>
                    {`⏰ Lembretes inteligentes (Kanban) · ${lembretesAtivosCount}/${kanbanLembretes.length} ativos`}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails className={classes.modalAccordionDetails}>
                  <Paper
                    elevation={0}
                    style={{
                      boxShadow: "none",
                      border: "none",
                      padding: 0,
                      margin: 0,
                      backgroundColor: "transparent",
                    }}
                  >
                <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                  Variáveis no texto da notificação (também com chaves duplas):{" "}
                  <strong>
                    {"{{nome_card}}"}, {"{{coluna}}"}, {"{{status}}"}, {"{{data}}"}, {"{{nome_contato}}"},{" "}
                    {"{{responsavel}}"}, {"{{arquivo}}"}
                  </strong>
                  . Prazos: o servidor verifica periodicamente a data limite do cartão (campo «Prazo do card» na secção
                  valores).
                </Typography>
                {kanbanLembretes.length > 0 && (
                  <FormControlLabel
                    style={{ marginBottom: 8 }}
                    control={
                      <Switch
                        checked={!lembretesTodosInativos}
                        onChange={(e) => setCardLembretesEnabled(e.target.checked)}
                        color="primary"
                        disabled={readOnly}
                      />
                    }
                    label="Ativar lembretes para este card"
                  />
                )}
                <FormControlLabel
                  style={{ marginBottom: 8 }}
                  control={
                    <Switch
                      checked={autoMoveWhatsappLembrete ? autoMoveWhatsappLembrete.ativo !== false : false}
                      onChange={(e) => toggleAutoMoveWhatsapp(e.target.checked)}
                      color="primary"
                      disabled={readOnly}
                    />
                  }
                  label="Enviar WhatsApp ao contato ao mover card"
                />
                {kanbanLembretesLoading ? (
                  <Typography variant="body2">A carregar…</Typography>
                ) : kanbanLembretes.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum lembrete configurado para este cartão.
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {kanbanLembretes.map((l) => (
                      <ListItem key={l.id} divider>
                        <ListItemText
                          primary={l.nome}
                          secondary={
                            LEMBRETE_GATILHO_OPTIONS.find((o) => o.value === l.tipoGatilho)?.label ??
                            l.tipoGatilho
                          }
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title={l.ativo !== false ? "Ativo" : "Inativo"}>
                            <Switch
                              edge="end"
                              checked={l.ativo !== false}
                              onChange={() => toggleKanbanLembreteAtivo(l)}
                              disabled={readOnly}
                              size="small"
                              style={{ marginRight: 4 }}
                            />
                          </Tooltip>
                          {!readOnly && (
                            <>
                              <Tooltip title="Editar">
                                <IconButton size="small" onClick={() => openEditKanbanLembrete(l)}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Testar envio">
                                <IconButton size="small" onClick={() => testKanbanLembreteRow(l.id)}>
                                  <Send />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Histórico de disparos">
                                <IconButton size="small" onClick={() => openKanbanLembreteHistorico(l)}>
                                  <History />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <IconButton size="small" onClick={() => deleteKanbanLembreteRow(l.id)}>
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                {!readOnly && (
                  <Button
                    size="small"
                    color="primary"
                    variant="outlined"
                    startIcon={<NotificationsActive />}
                    onClick={openNewKanbanLembrete}
                    style={{ marginTop: 12 }}
                  >
                    Novo lembrete
                  </Button>
                )}
                  </Paper>
                </AccordionDetails>
              </Accordion>
            )}

            <Dialog open={lembreteEditorOpen} onClose={() => setLembreteEditorOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>{lembreteForm.id ? "Editar lembrete" : "Novo lembrete inteligente"}</DialogTitle>
              <DialogContent style={{ paddingTop: 8 }}>
                <Accordion
                  expanded={lembreteEditorPanels.info}
                  onChange={setLembreteEditorPanel("info")}
                  className={classes.modalAccordion}
                >
                  <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                    <Typography className={classes.modalAccordionTitle}>Identificação</Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.modalAccordionDetails}>
                    <TextField
                      fullWidth
                      margin="dense"
                      variant="outlined"
                      size="small"
                      label="Nome do lembrete"
                      value={lembreteForm.nome}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLembreteForm((f) => ({ ...f, nome: v }));
                      }}
                    />
                    <TextField
                      fullWidth
                      margin="dense"
                      variant="outlined"
                      size="small"
                      multiline
                      minRows={2}
                      label="Descrição (interna, opcional)"
                      value={lembreteForm.descricao || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLembreteForm((f) => ({ ...f, descricao: v }));
                      }}
                      helperText="Só para organização na lista; não é enviada ao cliente."
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={lembreteEditorPanels.gatilho}
                  onChange={setLembreteEditorPanel("gatilho")}
                  className={classes.modalAccordion}
                >
                  <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                    <Typography className={classes.modalAccordionTitle}>Tipo de gatilho e prazo</Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.modalAccordionDetails}>
                    <FormControl fullWidth margin="dense" variant="outlined" size="small">
                      <InputLabel>Gatilho</InputLabel>
                      <Select
                        label="Gatilho"
                        value={normalizeKanbanLembreteTipoGatilho(lembreteForm.tipoGatilho)}
                        onChange={(e) => {
                          const v = normalizeKanbanLembreteTipoGatilho(e.target.value);
                          setLembreteForm((f) => ({
                            ...f,
                            tipoGatilho: v,
                            ...(v === "agendado" && !f.data
                              ? {
                                  data: new Date().toISOString().slice(0, 10),
                                  hora: f.hora || "09:00",
                                }
                              : {}),
                          }));
                        }}
                      >
                        {LEMBRETE_GATILHO_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Typography variant="caption" color="textSecondary">
                      «Agendado» usa a data/hora abaixo. Prazo próximo / vencido usam «Prazo do card» na secção valores.
                      Movimentação e status disparam ao mudar coluna ou estado do quadro.
                    </Typography>
                    {lembreteForm.tipoGatilho === "agendado" && (
                      <Box display="flex" flexWrap="wrap" alignItems="flex-end" style={{ gap: 12 }}>
                        <TextField
                          label="Data do lembrete"
                          type="date"
                          variant="outlined"
                          size="small"
                          value={lembreteForm.data || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLembreteForm((f) => ({ ...f, data: v }));
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          label="Hora"
                          type="time"
                          variant="outlined"
                          size="small"
                          value={lembreteForm.hora || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLembreteForm((f) => ({ ...f, hora: v }));
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    )}
                    {lembreteForm.tipoGatilho === "prazo_proximo" && (
                      <>
                        <TextField
                          fullWidth
                          margin="dense"
                          variant="outlined"
                          size="small"
                          type="number"
                          label="Dias antes do prazo"
                          value={lembreteForm.diasAntecedencia}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const n = parseInt(raw, 10) || 0;
                            setLembreteForm((f) => ({ ...f, diasAntecedencia: n }));
                          }}
                          helperText="Usado se o campo minutos estiver vazio."
                        />
                        <TextField
                          fullWidth
                          margin="dense"
                          variant="outlined"
                          size="small"
                          type="number"
                          label="Minutos antes do fim do dia do prazo"
                          value={lembreteForm.antecedenciaMinutos}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLembreteForm((f) => ({ ...f, antecedenciaMinutos: v }));
                          }}
                          helperText="Se preenchido, dispara no dia do prazo (X min antes de 23:59) e ignora dias."
                        />
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={lembreteEditorPanels.mensagem}
                  onChange={setLembreteEditorPanel("mensagem")}
                  className={classes.modalAccordion}
                >
                  <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                    <Typography className={classes.modalAccordionTitle}>Mensagem da notificação</Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.modalAccordionDetails}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      Variáveis:{" "}
                      <code>
                        {"{{nome_card}} {{coluna}} {{status}} {{data}} {{nome_contato}} {{responsavel}} {{arquivo}}"}
                      </code>{" "}
                      (também em forma curta, ex.: {"{nome_card}"}).
                    </Typography>
                    <TextField
                      fullWidth
                      margin="dense"
                      variant="outlined"
                      size="small"
                      multiline
                      minRows={4}
                      label="Texto enviado (modelo)"
                      value={lembreteForm.mensagemTemplate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLembreteForm((f) => ({ ...f, mensagemTemplate: v }));
                      }}
                      helperText={"Prévia: " + previewKanbanLembreteTemplate(lembreteForm.mensagemTemplate)}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={lembreteEditorPanels.destino}
                  onChange={setLembreteEditorPanel("destino")}
                  className={classes.modalAccordion}
                >
                  <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                    <Typography className={classes.modalAccordionTitle}>Destino e ativação</Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.modalAccordionDetails}>
                    <FormControl fullWidth margin="dense" variant="outlined" size="small">
                      <InputLabel>Destino</InputLabel>
                      <Select
                        label="Destino"
                        value={normalizeKanbanLembreteDestinoTipo(lembreteForm.destinoTipo)}
                        onChange={(e) => {
                          const next = normalizeKanbanLembreteDestinoTipo(e.target.value);
                          const queues = user?.queues || [];
                          setLembreteForm((f) => ({
                            ...f,
                            destinoTipo: next,
                            destinoId:
                              next === "fila"
                                ? pickValidDestinoFilaId(f.destinoId, queues)
                                : next === "usuario"
                                  ? f.destinoId
                                  : "",
                          }));
                        }}
                      >
                        {LEMBRETE_DESTINO_OPTIONS.map((o) => (
                          <MenuItem key={o.value} value={o.value}>
                            {o.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    {lembreteForm.destinoTipo === "fila" && (
                      <FormControl fullWidth margin="dense" variant="outlined" size="small">
                        <InputLabel shrink style={{ background: theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50], padding: "0 4px" }}>Grupo/Fila</InputLabel>
                        <Select
                          label="Grupo/Fila"
                          displayEmpty
                          value={pickValidDestinoFilaId(lembreteForm.destinoId, user?.queues)}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLembreteForm((f) => ({ ...f, destinoId: v }));
                          }}
                        >
                          <MenuItem value="">
                            <em>
                              {(user?.queues || []).length ? "Selecione a fila" : "Nenhuma fila disponível"}
                            </em>
                          </MenuItem>
                          {(user?.queues || []).map((queue) => (
                            <MenuItem key={queue.id} value={String(queue.id)}>
                              {queue.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                    {lembreteForm.destinoTipo === "usuario" && (
                      <>
                        <FormControl fullWidth margin="dense" variant="outlined" size="small">
                          <InputLabel shrink style={{ background: theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50], padding: "0 4px" }}>Filtrar por grupo/fila</InputLabel>
                          <Select
                            label="Filtrar por grupo/fila"
                            displayEmpty
                            value={lembreteUsuarioQueueFilter}
                            onChange={(e) => setLembreteUsuarioQueueFilter(e.target.value)}
                          >
                            <MenuItem value=""><em>Todos os grupos</em></MenuItem>
                            {(user?.queues || []).map((queue) => (
                              <MenuItem key={queue.id} value={String(queue.id)}>
                                {queue.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth margin="dense" variant="outlined" size="small">
                          <InputLabel shrink style={{ background: theme.palette.type === "dark" ? theme.palette.background.default : theme.palette.grey[50], padding: "0 4px" }}>Usuário</InputLabel>
                          <Select
                            label="Usuário"
                            displayEmpty
                            value={lembreteForm.destinoId ? String(lembreteForm.destinoId) : ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setLembreteForm((f) => ({ ...f, destinoId: v }));
                            }}
                          >
                            <MenuItem value="">
                              <em>
                                {companyUsersList.length ? "Selecione o usuário" : "Carregando usuários..."}
                              </em>
                            </MenuItem>
                            {companyUsersList
                              .filter((u) => {
                                if (!lembreteUsuarioQueueFilter) return true;
                                const qs = Array.isArray(u.queues) ? u.queues : [];
                                return qs.some((q) => String(q.id) === String(lembreteUsuarioQueueFilter));
                              })
                              .map((u) => (
                                <MenuItem key={u.id} value={String(u.id)}>
                                  {u.name}{u.email ? ` (${u.email})` : ""}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                      </>
                    )}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={lembreteForm.ativo}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setLembreteForm((f) => ({ ...f, ativo: checked }));
                          }}
                          color="primary"
                        />
                      }
                      label="Lembrete ativo"
                    />
                  </AccordionDetails>
                </Accordion>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setLembreteEditorOpen(false)}>Cancelar</Button>
                <Button color="primary" variant="contained" onClick={saveKanbanLembreteForm}>
                  Guardar
                </Button>
              </DialogActions>
            </Dialog>

            <Dialog open={lembreteHistoricoOpen} onClose={() => setLembreteHistoricoOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle>Disparos — {lembreteHistoricoTitulo}</DialogTitle>
              <DialogContent>
                {lembreteDisparosLoading ? (
                  <CircularProgress size={28} />
                ) : lembreteDisparos.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum registo.
                  </Typography>
                ) : (
                  <List dense>
                    {lembreteDisparos.map((d) => (
                      <ListItem key={d.id}>
                        <ListItemText
                          primary={d.corpo || "—"}
                          secondary={`${d.status || ""} · ${
                            d.createdAt
                              ? format(parseISO(d.createdAt), "dd/MM/yyyy HH:mm")
                              : ""
                          }${d.erroWhatsapp ? " · WhatsApp: " + d.erroWhatsapp : ""}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setLembreteHistoricoOpen(false)}>Fechar</Button>
              </DialogActions>
            </Dialog>

            <Accordion
              expanded={modalSectionOpen.processo}
              onChange={setModalAcc("processo")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>📋 Detalhes do processo</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                <Paper
                  elevation={0}
                  style={{
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    backgroundColor: "transparent",
                  }}
                >
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                Monte quantos campos precisar: título e descrição por etapa.{" "}
                <strong>Clique no nome da etapa</strong> para expandir e ver texto e anexos (fica mais limpo no cartão). Em
                edição, use as setas para reordenar.
              </Typography>
              {readOnly ? (
                processoDetalhesItens.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum detalhe do processo cadastrado.
                  </Typography>
                ) : (
                  processoDetalhesItens.map((row, idx) => {
                    const pAtts = attachmentsDoProcesso(row.id);
                    const expanded = !!processoRowExpanded[String(row.id)];
                    const tituloLinha = (row.titulo || "").trim() || `Etapa ${idx + 1}`;
                    const temTexto = !!(row.descricao || "").trim();
                    return (
                      <div key={row.id} className={classes.processoReadRow}>
                        <div
                          className={classes.processoAccordionHeader}
                          onClick={() => toggleProcessoRowExpanded(row.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleProcessoRowExpanded(row.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-expanded={expanded}
                        >
                          <ExpandMore
                            fontSize="small"
                            className={`${classes.processoAccordionChevron} ${
                              expanded ? classes.processoAccordionChevronOpen : ""
                            }`}
                          />
                          <Typography variant="subtitle2" style={{ fontWeight: 700, flex: 1, minWidth: 0 }}>
                            {tituloLinha}
                          </Typography>
                          <div className={classes.processoAccordionMeta} onClick={(e) => e.stopPropagation()}>
                            {temTexto && <Chip size="small" label="Texto" variant="outlined" />}
                            {pAtts.length > 0 && (
                              <Chip size="small" label={pAtts.length === 1 ? "1 anexo" : `${pAtts.length} anexos`} />
                            )}
                          </div>
                        </div>
                        <Collapse in={expanded} timeout="auto" unmountOnExit={false}>
                          <Typography
                            variant="body2"
                            color="textSecondary"
                            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8, marginBottom: pAtts.length ? 8 : 0 }}
                          >
                            {(row.descricao || "").trim() || "—"}
                          </Typography>
                          {pAtts.length > 0 && (
                            <div className={classes.processoMediaRow}>
                              {pAtts.map((att) =>
                                isAttachmentImageFilename(att.name) ? (
                                  <div key={att.id} className={classes.processoThumbWrap}>
                                    <img
                                      className={classes.processoThumb}
                                      src={resolveImageUrl(att.url)}
                                      alt={att.name}
                                      onClick={() =>
                                        openLightbox(pAtts, pAtts.findIndex((x) => x.id === att.id))
                                      }
                                    />
                                  </div>
                                ) : (
                                  <div
                                    key={att.id}
                                    className={classes.processoDocTile}
                                    onClick={() =>
                                      openLightbox(pAtts, pAtts.findIndex((x) => x.id === att.id))
                                    }
                                    role="presentation"
                                  >
                                    <AttachFile fontSize="small" />
                                    <Typography noWrap variant="caption">
                                      {att.name}
                                    </Typography>
                                  </div>
                                )
                              )}
                            </div>
                          )}
                        </Collapse>
                      </div>
                    );
                  })
                )
              ) : (
                <>
                  <input
                    type="file"
                    ref={processoFileInputRef}
                    multiple
                    className={classes.inputFile}
                    onChange={handleProcessoAttachmentInput}
                    accept="image/*,.pdf,.doc,.docx,.cdr,.eps,audio/*,video/*"
                  />
                  {processoDetalhesItens.map((row, index) => {
                    const expanded = !!processoRowExpanded[String(row.id)];
                    const tituloPreview = (row.titulo || "").trim() || "Sem título — clique para expandir e editar";
                    return (
                      <Paper key={row.id} variant="outlined" className={classes.processoItemPaper} elevation={0}>
                        <div className={classes.processoItemHeader} style={{ alignItems: "center", marginBottom: 0 }}>
                          <div
                            className={classes.processoAccordionHeader}
                            onClick={() => toggleProcessoRowExpanded(row.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleProcessoRowExpanded(row.id);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            aria-expanded={expanded}
                            style={{ marginBottom: 0 }}
                          >
                            <ExpandMore
                              fontSize="small"
                              className={`${classes.processoAccordionChevron} ${
                                expanded ? classes.processoAccordionChevronOpen : ""
                              }`}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" color="textSecondary" style={{ fontWeight: 600, display: "block" }}>
                                Campo {index + 1}
                              </Typography>
                              <Typography variant="body2" style={{ fontWeight: 600, lineHeight: 1.35 }}>
                                {tituloPreview}
                              </Typography>
                            </div>
                          </div>
                          <div className={classes.processoItemActions} onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Mover para cima">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={index === 0}
                                  onClick={() => moveProcessoDetalheItem(index, -1)}
                                >
                                  <ArrowUpward fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Mover para baixo">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={index >= processoDetalhesItens.length - 1}
                                  onClick={() => moveProcessoDetalheItem(index, 1)}
                                >
                                  <ArrowDownward fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Remover campo">
                              <IconButton size="small" color="secondary" onClick={() => removeProcessoDetalheItem(index)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </div>
                        <Collapse in={expanded} timeout="auto" unmountOnExit={false}>
                          <Box display="flex" flexDirection="column" style={{ gap: 12, paddingTop: 8 }}>
                            <TextField
                              fullWidth
                              size="small"
                              variant="outlined"
                              label="Título do campo"
                              placeholder='Ex.: "Tipo de serviço", "Prazo", "Fornecedor"'
                              value={row.titulo}
                              onChange={(e) => updateProcessoDetalheItem(index, "titulo", e.target.value)}
                              inputProps={{ maxLength: 240 }}
                            />
                            <TextField
                              fullWidth
                              multiline
                              minRows={3}
                              maxRows={16}
                              variant="outlined"
                              label="Descrição / valor"
                              placeholder="Ex.: Criação de identidade visual, 10 dias, contato do fornecedor…"
                              value={row.descricao}
                              onChange={(e) => updateProcessoDetalheItem(index, "descricao", e.target.value)}
                              inputProps={{ spellCheck: true, style: { fontSize: 14, lineHeight: 1.5 } }}
                            />
                            {(() => {
                              const pAtts = attachmentsDoProcesso(row.id);
                              return (
                                <>
                                  {pAtts.length > 0 && (
                                    <div className={classes.processoMediaRow}>
                                      {pAtts.map((att) =>
                                        isAttachmentImageFilename(att.name) ? (
                                          <div key={att.id} className={classes.processoThumbWrap}>
                                            <img
                                              className={classes.processoThumb}
                                              src={resolveImageUrl(att.url)}
                                              alt={att.name}
                                              onClick={() =>
                                                openLightbox(pAtts, pAtts.findIndex((x) => x.id === att.id))
                                              }
                                            />
                                            <div
                                              style={{
                                                position: "absolute",
                                                top: 2,
                                                right: 2,
                                                display: "flex",
                                                gap: 2,
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              onKeyDown={(e) => e.stopPropagation()}
                                            >
                                              <Tooltip title="Renomear">
                                                <IconButton
                                                  size="small"
                                                  style={{
                                                    padding: 4,
                                                    backgroundColor: "rgba(0,0,0,0.55)",
                                                    color: "#fff",
                                                  }}
                                                  onClick={() => {
                                                    setRenameAttId(att.id);
                                                    setRenameAttValue(att.name);
                                                  }}
                                                >
                                                  <Create style={{ fontSize: 16 }} />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Excluir">
                                                <IconButton
                                                  size="small"
                                                  style={{
                                                    padding: 4,
                                                    backgroundColor: "rgba(0,0,0,0.55)",
                                                    color: "#fff",
                                                  }}
                                                  onClick={() => handleDeleteAttachment(att.id)}
                                                >
                                                  <Delete style={{ fontSize: 16 }} />
                                                </IconButton>
                                              </Tooltip>
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            key={att.id}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 4,
                                              flexShrink: 0,
                                            }}
                                          >
                                            <div
                                              className={classes.processoDocTile}
                                              onClick={() =>
                                                openLightbox(pAtts, pAtts.findIndex((x) => x.id === att.id))
                                              }
                                              role="presentation"
                                            >
                                              <AttachFile fontSize="small" />
                                              <Typography noWrap variant="caption">
                                                {att.name}
                                              </Typography>
                                            </div>
                                            <Tooltip title="Renomear">
                                              <IconButton
                                                size="small"
                                                onClick={() => {
                                                  setRenameAttId(att.id);
                                                  setRenameAttValue(att.name);
                                                }}
                                              >
                                                <Create fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Excluir">
                                              <IconButton
                                                size="small"
                                                color="secondary"
                                                onClick={() => handleDeleteAttachment(att.id)}
                                              >
                                                <Delete fontSize="small" />
                                              </IconButton>
                                            </Tooltip>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  )}
                                  <div className={classes.processoAnexoActions}>
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                      startIcon={<AttachFile />}
                                      onClick={() => {
                                        uploadProcessoBlocoIdRef.current = row.id;
                                        const el = processoFileInputRef.current;
                                        if (el) el.click();
                                      }}
                                    >
                                      Imagem ou documento nesta etapa
                                    </Button>
                                  </div>
                                </>
                              );
                            })()}
                          </Box>
                        </Collapse>
                      </Paper>
                    );
                  })}
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<Add />}
                    onClick={addProcessoDetalheItem}
                    style={{ marginBottom: 12 }}
                  >
                    Adicionar campo
                  </Button>
                  <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 8 }}>
                    <Button variant="contained" color="primary" size="small" startIcon={<Save />} onClick={handleSaveValores}>
                      Salvar detalhes do processo
                    </Button>
                    <Typography variant="caption" color="textSecondary">
                      Os itens vazios (sem título nem descrição) são ignorados ao salvar.
                    </Typography>
                  </Box>
                </>
              )}
            </Paper>
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={modalSectionOpen.custom}
              onChange={setModalAcc("custom")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>⚙️ Campos personalizados</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                <Paper
                  elevation={0}
                  style={{
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    backgroundColor: "transparent",
                  }}
                >
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                Extras do projeto (fonte, lente, medidas). Dados do cliente ficam em «Dados do contato» acima.
              </Typography>
              {customFields.map((field, index) => {
                if (
                  isInternalQuadroContactSnapshotField(field.name) ||
                  isRedundantQuadroCustomFieldName(field.name)
                ) {
                  return null;
                }
                return (
                <Box key={index} display="flex" alignItems="center" gap={1} flexWrap="wrap" style={{ marginBottom: 8 }}>
                  <TextField
                    size="small"
                    placeholder="Nome do campo (ex: Nome da fonte)"
                    value={field.name}
                    onChange={(e) => updateCustomField(index, field, "name", e.target.value)}
                    disabled={readOnly}
                    style={{ minWidth: 160 }}
                  />
                  <TextField
                    size="small"
                    placeholder={field.type === "link" ? "URL (https://...)" : "Valor"}
                    value={field.value}
                    onChange={(e) => updateCustomField(index, field, "value", e.target.value)}
                    disabled={readOnly}
                    style={{ flex: 1, minWidth: 120 }}
                  />
                  {!readOnly && (
                    <>
                      <FormControl size="small" style={{ minWidth: 90 }}>
                        <Select
                          value={field.type || "text"}
                          onChange={(e) => updateCustomField(index, field, "type", e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="text">Texto</MenuItem>
                          <MenuItem value="link">Link</MenuItem>
                        </Select>
                      </FormControl>
                      <IconButton size="small" onClick={() => removeCustomField(index)} color="secondary" title="Remover campo">
                        <Delete fontSize="small" />
                      </IconButton>
                    </>
                  )}
                </Box>
                );
              })}
              {!readOnly && (
                <Button variant="outlined" size="small" startIcon={<Add />} onClick={addCustomField} style={{ marginTop: 8 }}>
                  Adicionar campo
                </Button>
              )}
              {visibleQuadroCustomFieldsForEditor(customFields).length > 0 && !readOnly && (
                <Button variant="outlined" size="small" startIcon={<Save />} onClick={handleSaveValores} style={{ marginLeft: 8, marginTop: 8 }}>
                  Salvar campos extras
                </Button>
              )}
            </Paper>
              </AccordionDetails>
            </Accordion>

            <Accordion
              expanded={modalSectionOpen.anexos}
              onChange={setModalAcc("anexos")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle}>📎 Anexos gerais do cartão</Typography>
              </AccordionSummary>
              <AccordionDetails className={classes.modalAccordionDetails}>
                <Paper
                  elevation={0}
                  className={classes.attachmentsSection}
                  style={{
                    boxShadow: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    backgroundColor: "transparent",
                  }}
                >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                <Typography variant="subtitle2" style={{ fontWeight: 700, marginBottom: 0 }}>
                  Organização dos ficheiros
                </Typography>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Tooltip title="Agrupar por tipo (JPG, PNG, PDF, etc.)">
                    <Button size="small" variant={attachmentsViewMode === "byType" ? "contained" : "outlined"} color="primary" startIcon={<ViewModule />} onClick={() => setAttachmentsViewMode("byType")}>
                      Por tipo
                    </Button>
                  </Tooltip>
                  <Tooltip title="Agrupar por grupos personalizados">
                    <Button size="small" variant={attachmentsViewMode === "byGroup" ? "contained" : "outlined"} color="primary" startIcon={<Folder />} onClick={() => setAttachmentsViewMode("byGroup")}>
                      Por grupos
                    </Button>
                  </Tooltip>
                </div>
              </div>
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 10 }}>
                Arquivos da capa do Kanban e anexos globais. Por etapa, use «Detalhes do processo» acima.
              </Typography>

              {globalAttachments.length === 0 ? (
                <Typography variant="body2" color="textSecondary">Nenhum anexo geral.</Typography>
              ) : attachmentsViewMode === "byType" ? (
                groupAttachmentsByType(globalAttachments).map(({ category, items }) => (
                  <div key={category}>
                    <div className={classes.attachmentCategoryHeader} onClick={() => toggleTypeCategory(category)}>
                      <Typography variant="subtitle2" style={{ fontWeight: 600 }}>{ATTACHMENT_TYPE_LABELS[category] || category} ({items.length})</Typography>
                      {expandedTypeCategories.has(category) ? <ExpandLess /> : <ExpandMore />}
                    </div>
                    {expandedTypeCategories.has(category) && (
                      <div style={{ paddingLeft: 8 }}>
                        {items.map((att) => {
                          const idx = globalAttachments.findIndex((a) => a.id === att.id);
                          return (
                            <div key={att.id} className={`${classes.attachmentItem} ${classes.attachmentItemClickable}`} onClick={() => openLightbox(globalAttachments, idx)}>
                              <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                <AttachFile fontSize="small" className={classes.attachIconInline} />
                                <Typography noWrap style={{ flex: 1 }}>{att.name}</Typography>
                                {att.isCapa && <span className={classes.attachmentCapa}>Capa</span>}
                              </div>
                              <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>{att.date}</Typography>
                              {!readOnly && (
                                <>
                                  {!att.isCapa && <Button size="small" onClick={(e) => { e.stopPropagation(); setAsCapa(att.id); }}>Capa</Button>}
                                  <Tooltip title="Renomear"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setRenameAttId(att.id); setRenameAttValue(att.name); }}><Create fontSize="small" /></IconButton></Tooltip>
                                  <Tooltip title="Excluir"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }} color="secondary"><Delete fontSize="small" /></IconButton></Tooltip>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <>
                  {attachmentGroups.map((grp) => {
                    const groupAtts = globalAttachments.filter((a) => attachmentGroupAssign[a.id] === grp.id);
                    const expanded = expandedCustomGroupIds.has(grp.id);
                    return (
                      <div key={grp.id}>
                        <div className={classes.attachmentGroupHeader} onClick={() => toggleCustomGroup(grp.id)}>
                          <Typography variant="subtitle2" style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                            <Folder fontSize="small" /> {grp.name} ({groupAtts.length})
                          </Typography>
                          {expanded ? <ExpandLess /> : <ExpandMore />}
                        </div>
                        {expanded && (
                          <div style={{ paddingLeft: 8 }}>
                            {groupAtts.length === 0 ? (
                              <Typography variant="caption" color="textSecondary" style={{ display: "block", padding: 8 }}>Nenhum anexo neste grupo. Atribua na lista &quot;Sem grupo&quot;.</Typography>
                            ) : groupAtts.map((att) => {
                              const idx = globalAttachments.findIndex((a) => a.id === att.id);
                              return (
                                <div key={att.id} className={`${classes.attachmentItem} ${classes.attachmentItemClickable}`} onClick={() => openLightbox(globalAttachments, idx)}>
                                  <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                                    <AttachFile fontSize="small" className={classes.attachIconInline} />
                                    <Typography noWrap style={{ flex: 1 }}>{att.name}</Typography>
                                    {att.isCapa && <span className={classes.attachmentCapa}>Capa</span>}
                                  </div>
                                  <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>{att.date}</Typography>
                                  {!readOnly && (
                                    <>
                                      {!att.isCapa && <Button size="small" onClick={(e) => { e.stopPropagation(); setAsCapa(att.id); }}>Capa</Button>}
                                      <Tooltip title="Remover do grupo"><Button size="small" onClick={(e) => { e.stopPropagation(); assignAttachmentToGroup(att.id, null); }}>Sair do grupo</Button></Tooltip>
                                      <Tooltip title="Renomear"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setRenameAttId(att.id); setRenameAttValue(att.name); }}><Create fontSize="small" /></IconButton></Tooltip>
                                      <Tooltip title="Excluir"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }} color="secondary"><Delete fontSize="small" /></IconButton></Tooltip>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Typography variant="subtitle2" color="textSecondary" style={{ marginTop: 12 }}>Sem grupo</Typography>
                  {globalAttachments.filter((a) => !attachmentGroupAssign[a.id]).map((att) => {
                    const idx = globalAttachments.findIndex((x) => x.id === att.id);
                    return (
                      <div key={att.id} className={`${classes.attachmentItem} ${classes.attachmentItemClickable}`} onClick={() => openLightbox(globalAttachments, idx)}>
                        <div style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }} onClick={(e) => e.stopPropagation()}>
                          <AttachFile fontSize="small" className={classes.attachIconInline} />
                          <Typography noWrap style={{ flex: 1 }}>{att.name}</Typography>
                          {att.isCapa && <span className={classes.attachmentCapa}>Capa</span>}
                        </div>
                        <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>{att.date}</Typography>
                        {!readOnly && (
                          <>
                            <FormControl size="small" style={{ minWidth: 160 }} onClick={(e) => e.stopPropagation()}>
                              <InputLabel>Mover para grupo</InputLabel>
                              <Select value={attachmentGroupAssign[att.id] || ""} onChange={(e) => assignAttachmentToGroup(att.id, e.target.value || null)} label="Mover para grupo">
                                <MenuItem value="">—</MenuItem>
                                {attachmentGroups.map((g) => (
                                  <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                            {!att.isCapa && <Button size="small" onClick={(e) => { e.stopPropagation(); setAsCapa(att.id); }}>Capa</Button>}
                            <Tooltip title="Renomear"><IconButton size="small" onClick={(e) => { e.stopPropagation(); setRenameAttId(att.id); setRenameAttValue(att.name); }}><Create fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Excluir"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }} color="secondary"><Delete fontSize="small" /></IconButton></Tooltip>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {!readOnly && (
                    <div style={{ marginTop: 12 }}>
                      {showNewGroupInput ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <TextField size="small" label="Nome do grupo" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAttachmentGroup()} style={{ minWidth: 220 }} />
                          <Button size="small" variant="contained" color="primary" startIcon={<CreateNewFolder />} onClick={createAttachmentGroup} disabled={!newGroupName.trim()}>Criar</Button>
                          <Button size="small" onClick={() => { setShowNewGroupInput(false); setNewGroupName(""); }}>Cancelar</Button>
                        </div>
                      ) : (
                        <Button size="small" variant="outlined" startIcon={<CreateNewFolder />} onClick={() => setShowNewGroupInput(true)}>Criar grupo com nome personalizado</Button>
                      )}
                    </div>
                  )}
                </>
              )}

              {!readOnly && (
                <>
                  <input type="file" ref={fileInputRef} multiple className={classes.inputFile} onChange={handleAddAttachment} accept="image/*,.pdf,.doc,.docx,.cdr,.eps,audio/*,video/*" />
                  <Button variant="outlined" size="small" startIcon={<Add />} className={classes.addAttachmentBtn} onClick={() => {
                    const el = fileInputRef.current;
                    if (el) el.click();
                  }}>
                    Adicionar (imagens, documentos, áudio, vídeo)
                  </Button>
                  <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
                    Selecione várias imagens de uma vez: ao enviar, você pode escolher qual será a capa do cartão no Kanban.
                  </Typography>
                </>
              )}
            </Paper>
              </AccordionDetails>
            </Accordion>

            {/* Lightbox: visualização ampliada com navegação */}
            {lightboxOpen && lightboxList[lightboxIndex] && (
              <div className={classes.lightboxBackdrop} onClick={closeLightbox} role="presentation">
                <IconButton className={classes.lightboxCloseBtn} onClick={closeLightbox} size="medium" aria-label="Fechar">
                  <Close style={{ fontSize: 32 }} />
                </IconButton>
                <IconButton className={classes.lightboxNav} style={{ left: 16 }} onClick={(e) => { e.stopPropagation(); lightboxPrev(); }} size="medium" aria-label="Anterior">
                  <ArrowBack style={{ fontSize: 40 }} />
                </IconButton>
                <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {(() => {
                    const att = lightboxList[lightboxIndex];
                    const url = resolveImageUrl(att.url);
                    const ext = (att.name || "").split(".").pop()?.toLowerCase();
                    const isImage = /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext || "");
                    const isVideo = /^(mp4|webm|mov|avi|mkv|m4v)$/.test(ext || "");
                    if (isImage) return <img src={url} alt={att.name} className={classes.lightboxContent} onClick={(e) => e.stopPropagation()} />;
                    if (isVideo) return <video src={url} controls className={classes.lightboxContent} onClick={(e) => e.stopPropagation()} />;
                    return (
                      <Typography className={classes.lightboxCaption}>
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#90caf9", textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
                          Abrir arquivo: {att.name}
                        </a>
                      </Typography>
                    );
                  })()}
                </div>
                <IconButton className={classes.lightboxNav} style={{ right: 16 }} onClick={(e) => { e.stopPropagation(); lightboxNext(); }} size="medium" aria-label="Próximo">
                  <ArrowForward style={{ fontSize: 40 }} />
                </IconButton>
                <Typography className={classes.lightboxCaption}>
                  {lightboxList[lightboxIndex].name} ({lightboxIndex + 1} / {lightboxList.length})
                </Typography>
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12 }}>
                  {!readOnly &&
                    (() => {
                      const att = lightboxList[lightboxIndex];
                      const ext = (att.name || "").split(".").pop()?.toLowerCase();
                      const isLbImage = /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext || "");
                      if (!isLbImage || att.isCapa || att.processoBlocoId) return null;
                      return (
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<Image />}
                          onClick={() => {
                            setAsCapa(att.id);
                            closeLightbox();
                          }}
                        >
                          Usar como capa do cartão
                        </Button>
                      );
                    })()}
                </div>
              </div>
            )}

            {/* Escolher capa após enviar várias imagens */}
            <Dialog open={capaPickerOpen} onClose={handleCapaPickerDismiss} maxWidth="sm" fullWidth>
              <DialogTitle>Escolher imagem de capa</DialogTitle>
              <DialogContent>
                <Typography variant="body2" color="textSecondary" paragraph style={{ marginBottom: 8 }}>
                  Você enviou várias imagens neste lote. Toque na imagem que deve aparecer como capa do cartão no Kanban e confirme.
                </Typography>
                <div className={classes.capaPickerGrid}>
                  {capaPickerCandidates.map((c) => (
                    <Paper
                      key={c.id}
                      elevation={capaPickerSelectedId === c.id ? 4 : 1}
                      className={`${classes.capaPickerTile} ${capaPickerSelectedId === c.id ? classes.capaPickerTileActive : ""}`}
                      onClick={() => setCapaPickerSelectedId(c.id)}
                    >
                      <img src={resolveImageUrl(c.url)} alt="" className={classes.capaPickerImg} />
                      <div className={classes.capaPickerTileLabel} title={c.name}>
                        {c.name}
                      </div>
                    </Paper>
                  ))}
                </div>
              </DialogContent>
              <DialogActions>
                <Button onClick={handleCapaPickerDismiss}>Depois</Button>
                <Button onClick={handleCapaPickerConfirm} color="primary" variant="contained">
                  Usar como capa
                </Button>
              </DialogActions>
            </Dialog>

            {/* Dialog Renomear anexo */}
            <Dialog open={renameAttId != null} onClose={() => { setRenameAttId(null); setRenameAttValue(""); }} maxWidth="xs" fullWidth>
              <DialogTitle>Renomear anexo</DialogTitle>
              <DialogContent>
                <TextField fullWidth label="Nome do arquivo" value={renameAttValue} onChange={(e) => setRenameAttValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRenameAttachment()} />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => { setRenameAttId(null); setRenameAttValue(""); }}>Cancelar</Button>
                <Button onClick={handleRenameAttachment} color="primary" variant="contained">Salvar</Button>
              </DialogActions>
            </Dialog>

            <Accordion
              expanded={modalSectionOpen.historico}
              onChange={setModalAcc("historico")}
              className={classes.modalAccordion}
            >
              <AccordionSummary expandIcon={<ExpandMore />} className={classes.modalAccordionSummary}>
                <Typography className={classes.modalAccordionTitle} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <History fontSize="small" />
                  Histórico de status ({statusLogs.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails className={`${classes.modalAccordionDetails} ${classes.logsSection}`}>
                {statusLogs.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhuma alteração de coluna registrada.
                  </Typography>
                ) : (
                  <div className={classes.logsList}>
                    {statusLogs.map((log) => {
                      const fromMeta = getQuadroStatusMeta(log.fromLabel, statusOptions);
                      const toMeta = getQuadroStatusMeta(log.toLabel, statusOptions);
                      return (
                        <div key={log.id} className={classes.logRow}>
                          <div
                            className={classes.logDot}
                            style={{ backgroundColor: toMeta.color }}
                          />
                          <span className={classes.logTime}>
                            {log.createdAt
                              ? format(parseISO(log.createdAt), "dd/MM/yy HH:mm")
                              : "—"}
                          </span>
                          <span className={classes.logLabel}>
                            <span>{fromMeta.label}</span>
                            {" → "}
                            <strong style={{ color: toMeta.color }}>{toMeta.label}</strong>
                          </span>
                          {log.userName && (
                            <span className={classes.logUser}>
                              {log.userName}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </DialogContent>

      {/* Gerenciador de Status Personalizados */}
      <StatusDialog
        open={statusManagerOpen}
        onClose={() => { setStatusManagerOpen(false); handleCancelEditStatus(); }}
        maxWidth="sm"
        fullWidth
      >
        <StatusDialogTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings fontSize="small" />
            Gerenciar Status Personalizados
          </div>
        </StatusDialogTitle>
        <StatusDialogContent dividers>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Crie, edite ou remova status para adaptar o quadro ao seu processo de trabalho.
          </Typography>

          {/* Lista de status existentes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {statusOptions.map((s, idx) => (
              <Paper
                key={s.value + idx}
                variant="outlined"
                style={{
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  borderLeftWidth: 4,
                  borderLeftColor: s.color,
                }}
              >
                <FiberManualRecord style={{ fontSize: 16, color: s.color }} />
                <Typography variant="body2" style={{ flex: 1, fontWeight: 500 }}>
                  {s.label}
                </Typography>
                <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>
                  {s.value}
                </Typography>
                <Tooltip title="Editar">
                  <IconButton size="small" onClick={() => handleEditStatusStart(idx)}>
                    <Edit style={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Excluir">
                  <IconButton size="small" onClick={() => handleDeleteStatus(idx)} style={{ color: "#d32f2f" }}>
                    <Delete style={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Paper>
            ))}
          </div>

          {/* Formulário de adicionar/editar */}
          <Paper
            variant="outlined"
            style={{
              padding: 16,
              backgroundColor: editingStatusIdx !== null ? "#fff3e0" : "#f5f5f5",
              borderRadius: 8,
            }}
          >
            <Typography variant="subtitle2" style={{ marginBottom: 10 }}>
              {editingStatusIdx !== null ? "Editar status" : "Adicionar novo status"}
            </Typography>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <TextField
                size="small"
                variant="outlined"
                label="Nome do status"
                placeholder="Ex.: Em revisão"
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                style={{ flex: 1, minWidth: 180 }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    editingStatusIdx !== null
                      ? handleUpdateStatus(editingStatusIdx)
                      : handleAddStatus();
                  }
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Typography variant="caption" color="textSecondary">Cor:</Typography>
                <input
                  type="color"
                  value={newStatusColor}
                  onChange={(e) => setNewStatusColor(e.target.value)}
                  style={{
                    width: 36,
                    height: 36,
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: 2,
                  }}
                />
              </div>
              {/* Cores rápidas */}
              <div style={{ display: "flex", gap: 4 }}>
                {["#2e7d32", "#ed6c02", "#1976d2", "#757575", "#d32f2f", "#9c27b0", "#00838f", "#e91e63"].map((c) => (
                  <div
                    key={c}
                    onClick={() => setNewStatusColor(c)}
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      backgroundColor: c,
                      cursor: "pointer",
                      border: newStatusColor === c ? "2px solid #000" : "2px solid transparent",
                      transition: "border 0.15s",
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {editingStatusIdx !== null ? (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleUpdateStatus(editingStatusIdx)}
                    disabled={!newStatusLabel.trim()}
                  >
                    Salvar alteração
                  </Button>
                  <Button size="small" onClick={handleCancelEditStatus}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddStatus}
                  disabled={!newStatusLabel.trim()}
                >
                  Adicionar status
                </Button>
              )}
            </div>
          </Paper>
        </StatusDialogContent>
        <StatusDialogActions>
          <Button onClick={() => { setStatusManagerOpen(false); handleCancelEditStatus(); }}>
            Fechar
          </Button>
        </StatusDialogActions>
      </StatusDialog>

      <Dialog open={confirmCloseOpen} onClose={() => !savingAll && setConfirmCloseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Alterações não salvas</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Existem alterações não salvas:
          </Typography>
          <ul style={{ marginTop: 4, marginBottom: 8 }}>
            {dirtyTitulo && <li><Typography variant="body2">Título do cartão</Typography></li>}
            {dirtyDescription && <li><Typography variant="body2">Descrição</Typography></li>}
            {dirtyValores && <li><Typography variant="body2">Valores / detalhes do processo / campos extras</Typography></li>}
            {dirtyContact && <li><Typography variant="body2">Dados do contato</Typography></li>}
          </ul>
          <Typography variant="body2" color="textSecondary">
            Deseja salvar antes de fechar?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={savingAll} onClick={() => setConfirmCloseOpen(false)}>Continuar editando</Button>
          <Button disabled={savingAll} color="secondary" onClick={() => { setConfirmCloseOpen(false); onClose(); }}>
            Descartar e fechar
          </Button>
          <Button disabled={savingAll} variant="contained" color="primary" onClick={handleSaveDirtyAndClose}>
            {savingAll ? "Salvando..." : "Salvar e fechar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
