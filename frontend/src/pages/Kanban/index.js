import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from "react-router-dom";
import {
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  TextField,
  Paper,
  Typography,
  InputAdornment,
  Avatar,
} from "@material-ui/core";
import WhatsApp from "@material-ui/icons/WhatsApp";
import Edit from "@material-ui/icons/Edit";
import Delete from "@material-ui/icons/Delete";
import Visibility from "@material-ui/icons/Visibility";
import Share from "@material-ui/icons/Share";
import SwapHoriz from "@material-ui/icons/SwapHoriz";
import { format } from "date-fns";
import { Can } from "../../components/Can";
import KanbanChatModal from "./KanbanChatModal";
import QuadroModal from "./QuadroModal";
import NewTicketModal from "../../components/NewTicketModal";
import TagModal from "../../components/TagModal";
import Add from "@material-ui/icons/Add";
import DragIndicator from "@material-ui/icons/DragIndicator";
import Settings from "@material-ui/icons/Settings";
import Tooltip from "@material-ui/core/Tooltip";
import Divider from "@material-ui/core/Divider";
import Dashboard from "@material-ui/icons/Dashboard";
import CreateNewFolder from "@material-ui/icons/CreateNewFolder";
import ArrowBack from "@material-ui/icons/ArrowBack";
import Search from "@material-ui/icons/Search";
import Close from "@material-ui/icons/Close";
import DeleteForever from "@material-ui/icons/DeleteForever";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import Description from "@material-ui/icons/Description";
import resolveContactWhatsAppPhone from "../../utils/resolveContactWhatsAppPhone";
import { openWhatsAppWebFromContact } from "../../utils/kanbanWhatsApp";
import HelpHint from "../../components/HelpHint";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(2),
    width: "100%",
    maxWidth: "1400px",
    margin: "0 auto",
    boxSizing: "border-box",
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(1),
    },
  },
  // ===== LANDING PAGE: Seleção de Áreas =====
  landingPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(4, 2),
    minHeight: "70vh",
  },
  landingTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontWeight: 700,
    fontSize: "1.6rem",
    marginBottom: 4,
    color: theme.palette.text.primary,
  },
  landingSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.95rem",
    marginBottom: theme.spacing(2),
  },
  landingSearchWrap: {
    width: "100%",
    maxWidth: 440,
    marginBottom: theme.spacing(3),
  },
  landingSearchField: {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      borderRadius: 10,
      backgroundColor: theme.palette.background.paper,
    },
  },
  landingNoResults: {
    textAlign: "center",
    color: theme.palette.text.secondary,
    padding: theme.spacing(3, 2),
    fontSize: "0.95rem",
  },
  landingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: theme.spacing(2.5),
    width: "100%",
    maxWidth: 960,
  },
  landingCard: {
    borderRadius: 12,
    overflow: "hidden",
    cursor: "grab",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  landingCardDragging: {
    opacity: 0.7,
    cursor: "grabbing",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  landingCardDropTarget: {
    boxShadow: `inset 0 0 0 3px ${theme.palette.primary.main}`,
    borderRadius: 12,
  },
  landingCardHeader: {
    height: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  landingCardHeaderIcon: {
    fontSize: 36,
    color: "rgba(255,255,255,0.85)",
  },
  landingCardName: {
    fontWeight: 700,
    fontSize: "1rem",
    marginBottom: 4,
    color: theme.palette.text.primary,
  },
  landingCardMeta: {
    fontSize: "0.78rem",
    color: theme.palette.text.secondary,
  },
  landingCardDefault: {
    fontSize: "0.65rem",
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    padding: "1px 8px",
    borderRadius: 10,
    fontWeight: 600,
    marginLeft: 8,
    verticalAlign: "middle",
  },
  landingCardBody: {
    padding: theme.spacing(2, 2.5),
    paddingTop: theme.spacing(3.5),
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    position: "relative",
  },
  landingCardActions: {
    position: "absolute",
    top: theme.spacing(0.75),
    right: theme.spacing(0.5),
    display: "flex",
    alignItems: "center",
    zIndex: 2,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(30,30,30,0.92)"
        : "rgba(255,255,255,0.92)",
    borderRadius: 8,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  landingAddCard: {
    borderRadius: 12,
    border: "2px dashed",
    borderColor: theme.palette.grey[300],
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "transparent",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      backgroundColor: theme.palette.primary.main + "08",
    },
  },
  landingAddIcon: {
    fontSize: 40,
    color: theme.palette.grey[400],
    marginBottom: 8,
  },
  landingAddText: {
    fontWeight: 600,
    color: theme.palette.text.secondary,
    fontSize: "0.9rem",
  },
  // ===== Barra no quadro para voltar =====
  boardTopBar: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1, 1.5),
    backgroundColor: theme.palette.background.paper,
    borderRadius: 10,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    flexWrap: "wrap",
  },
  boardBackBtn: {
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.85rem",
  },
  boardCurrentName: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    fontWeight: 700,
    fontSize: "1rem",
    flex: 1,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
    flexWrap: "wrap",
    gap: theme.spacing(2),
  },
  filters: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap",
  },
  dateInput: {
    width: 160,
    "& .MuiInputBase-input": {
      fontSize: "0.875rem",
    },
  },
  btnBuscar: {
    textTransform: "uppercase",
    fontWeight: 600,
  },
  btnAdicionar: {
    textTransform: "uppercase",
    fontWeight: 600,
  },
  columnsWrapper: {
    display: "flex",
    gap: theme.spacing(2),
    overflowX: "auto",
    paddingBottom: theme.spacing(1),
    minHeight: 520,
    WebkitOverflowScrolling: "touch",
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      overflowX: "visible",
      minHeight: 0,
    },
  },
  column: {
    flex: "0 0 260px",
    minWidth: 260,
    display: "flex",
    flexDirection: "column",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: theme.palette.background.default,
    transition: "box-shadow 0.2s, opacity 0.2s",
    [theme.breakpoints.down("md")]: {
      flex: "0 0 min(240px, 88vw)",
      minWidth: "min(240px, 88vw)",
    },
    [theme.breakpoints.down("sm")]: {
      flex: "1 1 auto",
      minWidth: 0,
      width: "100%",
    },
  },
  columnDragging: {
    opacity: 0.7,
    boxShadow: theme.shadows[8],
  },
  columnDropTarget: {
    boxShadow: `inset 0 0 0 3px ${theme.palette.primary.main}`,
    borderRadius: 8,
  },
  columnHeader: {
    padding: theme.spacing(1, 1.25),
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.8125rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: theme.spacing(0.5),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.75, 1),
      fontSize: "0.75rem",
    },
  },
  columnHeaderTitleRow: {
    display: "flex",
    alignItems: "flex-start",
    width: "100%",
    minWidth: 0,
    gap: theme.spacing(0.75),
  },
  columnHeaderTitleText: {
    flex: "1 1 auto",
    minWidth: 0,
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    lineHeight: 1.28,
    fontWeight: 600,
    fontSize: "0.8125rem",
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.75rem",
      lineHeight: 1.25,
    },
  },
  columnHeaderRightActions: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    marginLeft: "auto",
    paddingLeft: theme.spacing(1),
    gap: theme.spacing(0.5),
    [theme.breakpoints.down("sm")]: {
      paddingLeft: theme.spacing(0.75),
    },
  },
  columnHeaderMetaRow: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.6875rem",
    fontWeight: 500,
    opacity: 0.9,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.625rem",
    },
  },
  columnDragHandleIcon: {
    fontSize: 18,
    [theme.breakpoints.down("sm")]: {
      fontSize: 16,
    },
  },
  columnAddCardIcon: {
    color: "#fff",
    padding: 4,
    border: "1px solid rgba(255,255,255,0.45)",
    borderRadius: 6,
    "& svg": {
      fontSize: 18,
    },
    [theme.breakpoints.down("sm")]: {
      padding: 3,
      "& svg": {
        fontSize: 16,
      },
    },
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.12)",
      borderColor: "rgba(255,255,255,0.85)",
    },
  },
  columnEditIcon: {
    color: "rgba(255,255,255,0.9)",
    padding: 4,
    "& svg": {
      fontSize: 16,
    },
    [theme.breakpoints.down("sm")]: {
      padding: 2,
      "& svg": {
        fontSize: 15,
      },
    },
  },
  columnHeaderEmAberto: {
    backgroundColor: "#6c757d",
  },
  deleteCardDialogIconWrap: {
    display: "flex",
    justifyContent: "center",
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(1),
  },
  deleteCardDialogIconCircle: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    backgroundColor: "rgba(211, 47, 47, 0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.error.main,
  },
  deleteCardDialogPaper: {
    borderRadius: 12,
    overflow: "hidden",
  },
  columnCards: {
    flex: 1,
    padding: theme.spacing(1.5),
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[900]
        : "#f5f5f5",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.5),
    minHeight: 120,
  },
  columnCardsDragOver: {
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(25, 118, 210, 0.18)"
        : "#e3f2fd",
  },
  columnSearchRow: {
    padding: theme.spacing(0.75, 1.25),
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[900]
        : "#f5f5f5",
    borderBottom: `1px solid ${theme.palette.divider}`,
    flexShrink: 0,
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.palette.background.paper,
      fontSize: "0.8125rem",
    },
    "& .MuiOutlinedInput-input": {
      padding: "6px 8px",
    },
  },
  card: {
    padding: 0,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    cursor: "grab",
    transition: "box-shadow 0.2s ease",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
    },
    "&:active": {
      cursor: "grabbing",
    },
  },
  cardDragging: {
    opacity: 0.85,
    cursor: "grabbing",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  cardHeader: {
    padding: theme.spacing(1, 1.25),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    minHeight: 0,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.75, 1),
    },
  },
  cardClientName: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    lineHeight: 1.28,
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: theme.palette.text.primary,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.75rem",
    },
  },
  cardConnection: {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardBadgeWrap: {
    flexShrink: 0,
    marginLeft: "auto",
  },
  cardStatus: {
    "& .MuiChip-root": {
      height: 24,
      fontSize: "0.7rem",
      fontWeight: 600,
      color: "#fff",
    },
  },
  cardCapa: {
    width: "100%",
    height: 72,
    objectFit: "cover",
    display: "block",
    backgroundColor: theme.palette.grey[200],
    borderTop: "1px solid",
    borderColor: theme.palette.divider,
  },
  cardProcessoSection: {
    padding: "6px 10px 8px",
    borderTop: "1px solid",
    borderColor: theme.palette.divider,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[50],
  },
  cardProcessoLabel: {
    fontSize: "0.6rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: theme.palette.text.secondary,
    fontWeight: 600,
    display: "block",
    marginBottom: 6,
  },
  cardProcessoRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  cardProcessoThumb: {
    width: 44,
    height: 44,
    objectFit: "cover",
    borderRadius: 4,
    cursor: "pointer",
    border: "1px solid rgba(0,0,0,0.12)",
    flexShrink: 0,
    "&:hover": {
      opacity: 0.92,
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    },
  },
  cardProcessoDoc: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    maxWidth: 120,
    padding: "4px 6px",
    borderRadius: 4,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    cursor: "pointer",
    fontSize: "0.65rem",
    color: theme.palette.primary.main,
    flexShrink: 0,
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.04)",
    },
  },
  cardProcessoDocIcon: {
    fontSize: 16,
    flexShrink: 0,
  },
  cardProcessoDocName: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardSharedMeta: {
    padding: "4px 10px",
    fontSize: "0.65rem",
    color: theme.palette.text.secondary,
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  columnsEmptyPlaceholder: {
    flex: 1,
    minHeight: 280,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
    border: `1px dashed ${theme.palette.divider}`,
    borderRadius: 8,
    backgroundColor: theme.palette.action.hover,
  },
  cardProcLightboxNav: {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.45)",
    "&:hover": {
      backgroundColor: "rgba(0,0,0,0.65)",
    },
  },
  cardBody: {
    padding: theme.spacing(0.75, 1.25),
    borderTop: "1px solid",
    borderColor: theme.palette.divider,
    "& > div": { marginBottom: 4 },
    "& > div:last-child": { marginBottom: 0 },
  },
  cardBodyLine: {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardBodyLabel: {
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  cardActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(0.75, 1),
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[800]
        : theme.palette.grey[50],
    borderTop: "1px solid",
    borderColor: theme.palette.divider,
  },
  cardIconBtn: {
    padding: 8,
    color: theme.palette.text.secondary,
    "&:hover": {
      color: theme.palette.primary.main,
      backgroundColor: "rgba(0,0,0,0.06)",
    },
  },
  cardEditNameBtn: {
    padding: 2,
    marginLeft: 4,
    color: theme.palette.text.secondary,
    opacity: 0,
    transition: "opacity 0.15s",
  },
  cardHeaderText: {
    flex: 1,
    minWidth: 0,
    "&:hover $cardEditNameBtn": {
      opacity: 1,
    },
  },
  cardFieldLabel: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: theme.palette.text.secondary,
    fontWeight: 600,
    lineHeight: 1.2,
    display: "block",
    marginBottom: 2,
  },
  cardContactBlock: {
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(1),
    borderTop: "1px solid",
    borderColor: theme.palette.divider,
  },
  cardContactRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25),
    minWidth: 0,
  },
  cardContactAvatar: {
    width: 40,
    height: 40,
    fontSize: "1rem",
    flexShrink: 0,
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  },
  cardContactName: {
    fontSize: "0.875rem",
    fontWeight: 600,
    lineHeight: 1.35,
    color: theme.palette.text.primary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
    minWidth: 0,
  },
  inlineNameInput: {
    fontSize: "0.875rem",
    fontWeight: 600,
    padding: "2px 4px",
    border: "1px solid",
    borderColor: theme.palette.primary.main,
    borderRadius: 4,
    outline: "none",
    width: "100%",
    fontFamily: "inherit",
  },
}));

const LANE_EM_ABERTO = "lane0";

const getContactImageUrl = (contact) => {
  const url = contact?.urlPicture || contact?.profilePicUrl;
  if (!url || typeof url !== "string") return null;
  let resolved = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    resolved = base + (url.startsWith("/") ? url : "/" + url);
  }
  return resolved.replace(/:443(?=\/)/, "");
};

// Thumbnail do card: capa do quadro se existir, senão foto do contato
const getCardImageUrl = (ticket) => {
  const capa = ticket?.quadroCapaUrl || ticket?.capaUrl;
  if (capa && typeof capa === "string") {
    let resolved = capa;
    if (!capa.startsWith("http://") && !capa.startsWith("https://")) {
      const base = process.env.REACT_APP_BACKEND_URL || "";
      resolved = base + (capa.startsWith("/") ? capa : "/" + capa);
    }
    return resolved.replace(/:443(?=\/)/, "");
  }
  return getContactImageUrl(ticket?.contact);
};

function resolveBackendPublicUrl(url) {
  if (!url || typeof url !== "string") return "";
  let resolved = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const base = process.env.REACT_APP_BACKEND_URL || "";
    resolved = base + (url.startsWith("/") ? url : "/" + url);
  }
  return resolved.replace(/:443(?=\/)/, "");
}

function isQuadroProcessoImageFilename(name) {
  const ext = (name || "").split(".").pop()?.toLowerCase();
  return /^(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(ext || "");
}

const LS_QUADRO_GROUPS_ORDER = "kanban_quadro_groups_order";
const LS_KANBAN_TICKET_ORDER = "kanban_ticket_order";

/** Normaliza chaves/ids de etapas por área vindos da API (compartilhamento). */
function normalizeSharedStagesByGroup(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  Object.keys(raw).forEach((k) => {
    const v = raw[k];
    out[String(k)] = Array.isArray(v) ? v.map((x) => String(x)) : [];
  });
  return out;
}

/** Cartão exibido como espelho nesta área: coluna vem de sharedStagesByGroup, não de TicketTag. */
function kanbanIsMirrorMove(ticket, selectedQuadroGroupId) {
  if (!ticket || selectedQuadroGroupId == null || selectedQuadroGroupId === "") return false;
  const gid = String(selectedQuadroGroupId);
  const homeRaw =
    ticket.quadroHomeGroupId != null && ticket.quadroHomeGroupId !== ""
      ? ticket.quadroHomeGroupId
      : ticket.quadroGroupId != null && ticket.quadroGroupId !== ""
        ? ticket.quadroGroupId
        : null;
  const homeStr = homeRaw != null ? String(homeRaw) : null;
  const shared = ticket.quadroSharedGroupIds;
  const sharedHere =
    Array.isArray(shared) && shared.some((x) => String(x) === gid);
  const isNativeHome = homeStr != null && homeStr === gid;
  return sharedHere && !isNativeHome;
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

/** Fallback local (igual ao quadro) quando o GET /quadro-statuses ainda não retornou. */
const DEFAULT_QUADRO_STATUSES_KANBAN = [
  { value: "aguardando", label: "Aguardando", color: "#fbc02d" },
  { value: "em_andamento", label: "Em andamento", color: "#1976d2" },
  { value: "concluido", label: "Concluído", color: "#388e3c" },
  { value: "cancelado", label: "Cancelado", color: "#d32f2f" },
];

function humanizeStatusToken(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw)
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normKanbanStatus(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Rótulo e cor do status interno do quadro (TicketQuadro.status), para o chip no card. */
function getQuadroEtapaDisplay(raw, customStatuses) {
  if (raw == null || String(raw).trim() === "") return null;
  const s = String(raw).trim();
  const list =
    Array.isArray(customStatuses) && customStatuses.length > 0
      ? customStatuses
      : DEFAULT_QUADRO_STATUSES_KANBAN;
  const rNorm = normKanbanStatus(s);
  const match = list.find((st) => {
    const v = normKanbanStatus(st.value || "");
    const lbl = normKanbanStatus(st.label || "");
    return (st.value && st.value === s) || v === rNorm || lbl === rNorm;
  });
  const label = (match?.label || "").trim() || humanizeStatusToken(s);
  return {
    label,
    color: match?.color || "#9e9e9e",
  };
}

function normalizeKanbanColumnSearch(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Nome do projeto/quadro (sem fallback para contato). */
function getKanbanCardProjectTitleTrimmed(ticket) {
  return (
    ticket.nomeProjeto ||
    ticket.quadroNomeProjeto ||
    ticket.nomeEmpresa ||
    ""
  )
    .trim();
}

function getKanbanTicketContact(ticket) {
  const c = ticket?.contact;
  return c && typeof c === "object" ? c : null;
}

/** Contato vinculado ao card (não placeholder «Quadro livre»). Inclui fallback por `contactId` quando o include falhar. */
function hasRealKanbanContact(ticket) {
  const c = getKanbanTicketContact(ticket);
  if (ticket?.contactId != null && Number(ticket.contactId) > 0 && !c) return true;
  if (!c) return false;
  const name = (c.name || "").trim();
  if (/^quadro livre$/i.test(name)) return false;
  if (c.id != null && Number(c.id) > 0) return true;
  if (String(c.number || "").replace(/\D/g, "").length >= 8) return true;
  return false;
}

function getKanbanContactDisplayLine(ticket) {
  const c = getKanbanTicketContact(ticket);
  if (c) {
    const name = (c.name || "").trim();
    if (name && !/^quadro livre$/i.test(name)) return name;
    const num = String(c.number || "").replace(/\s/g, "").trim();
    if (num) return num;
    if (c.id != null && Number(c.id) > 0) return `Contato #${c.id}`;
  }
  if (ticket?.contactId != null && Number(ticket.contactId) > 0) {
    return `Contato #${ticket.contactId}`;
  }
  return "";
}

/** Nome exibido como título do cartão (projeto); sem misturar com o nome do contato. */
function getKanbanCardNomeCartao(ticket) {
  return getKanbanCardProjectTitleTrimmed(ticket);
}

function ticketMatchesKanbanColumnSearch(ticket, queryNorm) {
  if (!queryNorm) return true;
  const parts = [
    ticket.contact?.name,
    ticket.contact?.number,
    String(ticket.id ?? ""),
    ticket.uuid,
    ticket.nomeProjeto,
    ticket.nomeEmpresa,
    ticket.quadroNomeProjeto,
    ticket.quadroEtapaStatus,
    ticket.user?.name,
    ticket.whatsapp?.name,
    typeof ticket.lastMessage === "string" ? ticket.lastMessage : "",
  ];
  const haystack = normalizeKanbanColumnSearch(parts.join(" "));
  return haystack.includes(queryNorm);
}

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);
  const [tags, setTags] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dragOverLaneId, setDragOverLaneId] = useState(null);
  const [draggingTicketId, setDraggingTicketId] = useState(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatModalTicketUuid, setChatModalTicketUuid] = useState(null);
  const [quadroModalOpen, setQuadroModalOpen] = useState(false);
  const [quadroModalTicketUuid, setQuadroModalTicketUuid] = useState(null);
  const [quadroModalReadOnly, setQuadroModalReadOnly] = useState(true);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [newTicketModalLaneId, setNewTicketModalLaneId] = useState(null);
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [editColumnTag, setEditColumnTag] = useState(null);
  const [quadroGroups, setQuadroGroups] = useState([]);
  const [selectedQuadroGroupId, setSelectedQuadroGroupId] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalTicket, setShareModalTicket] = useState(null);
  const [shareModalSelectedIds, setShareModalSelectedIds] = useState([]);
  const [shareModalLinkType, setShareModalLinkType] = useState("linked");
  const [shareModalStagesByGroup, setShareModalStagesByGroup] = useState({});
  const [shareModalSaving, setShareModalSaving] = useState(false);
  /** Colunas (tags Kanban) por área — cada quadro tem suas próprias etapas */
  const [shareModalTagsByGroup, setShareModalTagsByGroup] = useState({});
  const shareModalTagsRequestedRef = useRef(new Set());
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveModalTicket, setMoveModalTicket] = useState(null);
  const [moveModalTargetGroupId, setMoveModalTargetGroupId] = useState("");
  const [moveModalTargetTagId, setMoveModalTargetTagId] = useState("");
  const [moveModalTargetUserId, setMoveModalTargetUserId] = useState("");
  const [moveModalSaving, setMoveModalSaving] = useState(false);
  /** Etapas (tags) da área de destino no modal Mover */
  const [moveModalTargetTags, setMoveModalTargetTags] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [editingNameTicketId, setEditingNameTicketId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [customStatuses, setCustomStatuses] = useState([]);
  const [statusManagerOpen, setStatusManagerOpen] = useState(false);
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#1976d2");
  const [editingStatusIdx, setEditingStatusIdx] = useState(null);
  const [wsManagerOpen, setWsManagerOpen] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [editingWsId, setEditingWsId] = useState(null);
  const [editingWsName, setEditingWsName] = useState("");
  /** { id, name } quando o modal de confirmação de exclusão está aberto */
  const [workspaceDeleteTarget, setWorkspaceDeleteTarget] = useState(null);
  /** Lightbox só com imagens de anexos do processo (detalhes do processo), a partir do card */
  const [cardProcLightbox, setCardProcLightbox] = useState(null);
  const [workspaceDeleteLoading, setWorkspaceDeleteLoading] = useState(false);
  /** Cartão do Kanban a excluir (modal de confirmação) */
  const [cardDeleteTicket, setCardDeleteTicket] = useState(null);
  const [cardDeleteLoading, setCardDeleteLoading] = useState(false);
  const [draggingBoardId, setDraggingBoardId] = useState(null);
  const [dragOverBoardId, setDragOverBoardId] = useState(null);
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  /** Busca por coluna do Kanban: laneId -> texto */
  const [columnSearchByLaneId, setColumnSearchByLaneId] = useState({});
  const lastActionWasBoardDrag = useRef(false);
  const kanbanUseDateFilterRef = useRef(false);
  // Ordem dos tickets por coluna (laneId -> [ticketId]) para prioridade dentro da coluna
  const [ticketOrderByLane, setTicketOrderByLane] = useState({});

  const queueIds = user.queues.map((q) => q.UserQueue.queueId);

  const normalizeBoardSearch = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const filteredQuadroGroups = useMemo(() => {
    const q = normalizeBoardSearch(boardSearchQuery);
    if (!q) return quadroGroups;
    return quadroGroups.filter((g) =>
      normalizeBoardSearch(g.name || "").includes(q)
    );
  }, [quadroGroups, boardSearchQuery]);

  // Status internos do quadro por área (GET /quadro-statuses?quadroGroupId=)
  useEffect(() => {
    let cancelled = false;
    const loadStatuses = async () => {
      if (selectedQuadroGroupId == null || selectedQuadroGroupId === "") {
        setCustomStatuses([]);
        return;
      }
      try {
        const { data } = await api.get("/quadro-statuses", {
          params: { quadroGroupId: selectedQuadroGroupId },
        });
        const parsed = mapStatusesFromApi(data.statuses || data || []);
        if (!cancelled) {
          setCustomStatuses(parsed);
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.message || "Não foi possível carregar os status do servidor.");
        }
      }
    };
    loadStatuses();
    return () => {
      cancelled = true;
    };
  }, [selectedQuadroGroupId]);

  useEffect(() => {
    if (!cardProcLightbox) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setCardProcLightbox(null);
        return;
      }
      const imgs = cardProcLightbox.images;
      if (!imgs || imgs.length < 2) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCardProcLightbox((lb) => {
          if (!lb?.images?.length) return lb;
          const n = lb.images.length;
          return { ...lb, index: (lb.index - 1 + n) % n };
        });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCardProcLightbox((lb) => {
          if (!lb?.images?.length) return lb;
          const n = lb.images.length;
          return { ...lb, index: (lb.index + 1) % n };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cardProcLightbox]);

  const loadQuadroGroups = async () => {
    try {
      const { data } = await api.get("/quadro-groups");
      const list = data.groups || data.lista || data || [];
      let groups = Array.isArray(list) && list.length > 0
        ? list
        : [{ id: 1, name: "Kanban", isDefault: true }];
      console.log("[Kanban loadQuadroGroups] API retornou ordem:", groups.map((g) => ({ id: g.id, name: g.name })));
      try {
        const savedOrder = localStorage.getItem(LS_QUADRO_GROUPS_ORDER);
        console.log("[Kanban loadQuadroGroups] localStorage ordem salva:", savedOrder ? JSON.parse(savedOrder) : null);
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          if (Array.isArray(orderIds) && orderIds.length > 0) {
            const byId = new Map(groups.map((g) => [String(g.id), g]));
            const ordered = orderIds
              .map((id) => byId.get(String(id)))
              .filter(Boolean);
            const remaining = groups.filter((g) => !orderIds.includes(String(g.id)));
            groups = [...ordered, ...remaining];
            console.log("[Kanban loadQuadroGroups] após aplicar ordem salva:", groups.map((g) => ({ id: g.id, name: g.name })));
          }
        }
      } catch (e) {
        console.warn("[Kanban loadQuadroGroups] erro ao aplicar ordem:", e);
      }
      setQuadroGroups(groups);
    } catch (err) {
      const fallback = [{ id: 1, name: "Kanban", isDefault: true }];
      setQuadroGroups(fallback);
    }
  };

  useEffect(() => {
    loadQuadroGroups();
  }, []);

  // Carregar ordem dos tickets por coluna (para a área selecionada)
  useEffect(() => {
    if (selectedQuadroGroupId == null || selectedQuadroGroupId === "") return;
    try {
      const raw = localStorage.getItem(LS_KANBAN_TICKET_ORDER);
      if (!raw) return;
      const all = JSON.parse(raw);
      const groupKey = String(selectedQuadroGroupId);
      const order = all[groupKey];
      if (order && typeof order === "object") {
        setTicketOrderByLane(order);
      } else {
        setTicketOrderByLane({});
      }
    } catch (e) {
      setTicketOrderByLane({});
    }
  }, [selectedQuadroGroupId]);

  useEffect(() => {
    setColumnSearchByLaneId({});
    setBoardSearchQuery("");
  }, [selectedQuadroGroupId]);

  /** Ao trocar de área, zera a lista para não exibir cards da área anterior até o GET atualizar. */
  useEffect(() => {
    if (selectedQuadroGroupId == null || selectedQuadroGroupId === "") return;
    setTickets([]);
  }, [selectedQuadroGroupId]);

  // Não auto-selecionar: landing page mostra todas as áreas

  const fetchTags = async () => {
    try {
      if (selectedQuadroGroupId == null || selectedQuadroGroupId === "") {
        setTags([]);
        return;
      }
      const response = await api.get("/tag/kanban/", {
        params: { quadroGroupId: selectedQuadroGroupId },
      });
      setTags(response.data.lista || []);
      fetchTickets();
    } catch (error) {
      console.log(error);
      setTags([]);
    }
  };

  const fetchTickets = async () => {
    try {
      const params = {
        queueIds: JSON.stringify(queueIds),
      };
      if (kanbanUseDateFilterRef.current) {
        params.dateStart = startDate;
        params.dateEnd = endDate;
      }
      if (selectedQuadroGroupId != null && selectedQuadroGroupId !== "") {
        params.quadroGroupId = selectedQuadroGroupId;
      }
      console.log("[Kanban fetchTickets] request", {
        params,
        selectedQuadroGroupId,
        queueIdsLen: queueIds?.length,
        dateFilter: kanbanUseDateFilterRef.current,
      });
      const { data } = await api.get("/ticket/kanban", { params });
      const list = data.tickets || [];
      console.log("[Kanban fetchTickets] response", {
        count: data.count,
        hasMore: data.hasMore,
        listLen: list.length,
        sample: list.slice(0, 15).map((t) => ({
          id: t.id,
          uuid: t.uuid,
          isStandaloneQuadro: t.isStandaloneQuadro,
          contact: t.contact?.name,
        })),
      });
      const seen = new Set();
      const duplicados = [];
      const unicos = list.filter((t) => {
        const key =
          t.uuid != null && t.uuid !== ""
            ? `u:${String(t.uuid)}`
            : `i:${String(t.id)}`;
        if (seen.has(key)) {
          duplicados.push(key);
          return false;
        }
        seen.add(key);
        return true;
      });
      if (duplicados.length) console.warn("[Kanban fetchTickets] duplicados removidos (chave):", duplicados);
      console.log("[Kanban fetchTickets] após dedup", {
        unicosLen: unicos.length,
        ids: unicos.map((t) => ({ id: t.id, uuid: t.uuid, standalone: t.isStandaloneQuadro })),
      });
      setTickets(unicos);
    } catch (err) {
      console.error("[Kanban fetchTickets] ERRO", {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        stack: err?.stack,
      });
      setTickets([]);
    }
  };

  /** Sempre aponta para o fetchTickets mais recente (evita closure velha nos listeners do socket). */
  const fetchTicketsRef = useRef(fetchTickets);
  fetchTicketsRef.current = fetchTickets;

  const kanbanFetchDebounceRef = useRef(null);
  const scheduleKanbanFetchTickets = useCallback(() => {
    if (kanbanFetchDebounceRef.current) {
      clearTimeout(kanbanFetchDebounceRef.current);
    }
    kanbanFetchDebounceRef.current = setTimeout(() => {
      kanbanFetchDebounceRef.current = null;
      fetchTicketsRef.current();
    }, 450);
  }, []);

  useEffect(() => {
    const companyId = user.companyId;
    const onAppMessage = (data) => {
      if (data.action === "create" || data.action === "update" || data.action === "delete") {
        scheduleKanbanFetchTickets();
      }
    };
    /** Contato atualizado (nome, extraInfo, etc.) — antes o Kanban não recarregava os cards. */
    const onContactUpdated = (data) => {
      if (data.action === "update" || data.action === "create") {
        scheduleKanbanFetchTickets();
      }
    };
    socket.on(`company-${companyId}-ticket`, onAppMessage);
    socket.on(`company-${companyId}-appMessage`, onAppMessage);
    socket.on(`company-${companyId}-contact`, onContactUpdated);
    return () => {
      if (kanbanFetchDebounceRef.current) {
        clearTimeout(kanbanFetchDebounceRef.current);
        kanbanFetchDebounceRef.current = null;
      }
      socket.off(`company-${companyId}-ticket`, onAppMessage);
      socket.off(`company-${companyId}-appMessage`, onAppMessage);
      socket.off(`company-${companyId}-contact`, onContactUpdated);
    };
  }, [socket, user.companyId, scheduleKanbanFetchTickets]);

  useEffect(() => {
    fetchTags();
  }, [user, selectedQuadroGroupId]);

  useEffect(() => {
    if (!moveModalOpen || !moveModalTargetGroupId) {
      setMoveModalTargetTags([]);
      return;
    }
    let cancelled = false;
    api
      .get("/tag/kanban/", { params: { quadroGroupId: moveModalTargetGroupId } })
      .then(({ data }) => {
        if (!cancelled) setMoveModalTargetTags(data.lista || []);
      })
      .catch(() => {
        if (!cancelled) setMoveModalTargetTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, [moveModalOpen, moveModalTargetGroupId]);

  useEffect(() => {
    if (!moveModalOpen) return;
    let isMounted = true;
    api.get("/users/").then(({ data }) => {
      const list = data.users || data || [];
      if (isMounted && Array.isArray(list)) setUsersList(list);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [moveModalOpen]);

  const handleStartEditName = (e, ticket) => {
    e.stopPropagation();
    setEditingNameTicketId(ticket.id);
    setEditingNameValue(getKanbanCardProjectTitleTrimmed(ticket) || "");
  };

  const handleSaveEditName = async (ticketId) => {
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      setEditingNameTicketId(null);
      return;
    }
    try {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket?.uuid) {
        toast.error("Cartão sem identificador para atualizar o título.");
        setEditingNameTicketId(null);
        return;
      }
      await api.put(`/tickets/${ticket.uuid}/quadro`, { nomeProjeto: trimmed });
      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                nomeProjeto: trimmed,
                quadroNomeProjeto: trimmed
              }
            : t
        )
      );
      toast.success("Título do cartão atualizado.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar título.");
    }
    setEditingNameTicketId(null);
  };

  const handleCancelEditName = () => {
    setEditingNameTicketId(null);
    setEditingNameValue("");
  };

  // ===== CRUD de Áreas de Trabalho =====
  const handleCreateWorkspace = async () => {
    const name = newWsName.trim();
    if (!name) return;
    if (quadroGroups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      toast.warn("Já existe uma área com esse nome.");
      return;
    }
    try {
      const { data } = await api.post("/quadro-groups", { name });
      const newGroup = data.group || data;
      toast.success(`Área "${name}" criada.`);
      setNewWsName("");
      await loadQuadroGroups();
      if (newGroup?.id) setSelectedQuadroGroupId(String(newGroup.id));
    } catch (err) {
      // Fallback: adicionar localmente com ID gerado
      const newId = Math.max(0, ...quadroGroups.map((g) => Number(g.id) || 0)) + 1;
      const newGroup = { id: newId, name };
      setQuadroGroups((prev) => [...prev, newGroup]);
      setSelectedQuadroGroupId(String(newId));
      toast.success(`Área "${name}" criada (local).`);
      setNewWsName("");
    }
  };

  const handleRenameWorkspace = async () => {
    const name = editingWsName.trim();
    if (!name || !editingWsId) return;
    try {
      await api.put(`/quadro-groups/${editingWsId}`, { name });
      toast.success("Área renomeada.");
      await loadQuadroGroups();
    } catch (err) {
      // Fallback local
      setQuadroGroups((prev) =>
        prev.map((g) => (String(g.id) === String(editingWsId) ? { ...g, name } : g))
      );
      toast.success("Área renomeada (local).");
    }
    setEditingWsId(null);
    setEditingWsName("");
  };

  /** Abre o gerenciador com o nome da área pronto para editar. */
  const openWorkspaceEditor = (g) => {
    setEditingWsId(String(g.id));
    setEditingWsName(g.name || "");
    setWsManagerOpen(true);
  };

  const openDeleteWorkspaceModal = (groupId) => {
    const group = quadroGroups.find((g) => String(g.id) === String(groupId));
    if (!group) return;
    if (group.isDefault) {
      toast.warn("Não é possível excluir a área padrão.");
      return;
    }
    if (quadroGroups.length <= 1) {
      toast.warn("É necessário ter pelo menos uma área.");
      return;
    }
    setWorkspaceDeleteTarget({ id: group.id, name: group.name });
  };

  const executeDeleteWorkspace = async () => {
    if (!workspaceDeleteTarget) return;
    const groupId = workspaceDeleteTarget.id;
    setWorkspaceDeleteLoading(true);
    try {
      try {
        await api.delete(`/quadro-groups/${groupId}`);
        toast.success("Área excluída.");
        await loadQuadroGroups();
      } catch (err) {
        setQuadroGroups((prev) => prev.filter((g) => String(g.id) !== String(groupId)));
        toast.success("Área excluída (local).");
      }
      if (String(selectedQuadroGroupId) === String(groupId)) {
        const remaining = quadroGroups.filter((g) => String(g.id) !== String(groupId));
        if (remaining.length > 0) setSelectedQuadroGroupId(String(remaining[0].id));
      }
    } finally {
      setWorkspaceDeleteLoading(false);
      setWorkspaceDeleteTarget(null);
    }
  };

  const saveQuadroGroupsOrder = (orderedGroups) => {
    const ids = orderedGroups.map((g) => String(g.id));
    console.log("[Kanban saveQuadroGroupsOrder] salvando ordem (prioridade = primeiro é maior):", ids, "nomes:", orderedGroups.map((g) => g.name));
    try {
      localStorage.setItem(LS_QUADRO_GROUPS_ORDER, JSON.stringify(ids));
    } catch (e) {}
    try {
      api.put("/quadro-groups/reorder", { groupIds: orderedGroups.map((g) => g.id) }).catch(() => {});
    } catch (e) {}
  };

  const handleBoardDragStart = (e, groupId) => {
    e.stopPropagation();
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "board", groupId: String(groupId) }));
    e.dataTransfer.effectAllowed = "move";
    setDraggingBoardId(String(groupId));
  };

  const handleBoardDragOver = (e, groupId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverBoardId(String(groupId));
  };

  const handleBoardDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverBoardId(null);
  };

  const handleBoardDrop = (e, targetGroupId) => {
    e.preventDefault();
    e.stopPropagation();
    lastActionWasBoardDrag.current = true;
    setDragOverBoardId(null);
    setDraggingBoardId(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.type !== "board" || !data.groupId) return;
      const sourceId = data.groupId;
      const targetId = String(targetGroupId);
      console.log("[Kanban handleBoardDrop] arrastou área", sourceId, "→ soltou em", targetId);
      if (sourceId === targetId) return;
      const fromIdx = quadroGroups.findIndex((g) => String(g.id) === sourceId);
      const toIdx = quadroGroups.findIndex((g) => String(g.id) === targetId);
      console.log("[Kanban handleBoardDrop] índices fromIdx:", fromIdx, "toIdx:", toIdx, "ordem atual:", quadroGroups.map((g) => ({ id: g.id, name: g.name })));
      if (fromIdx === -1 || toIdx === -1) return;
      const newGroups = [...quadroGroups];
      const [removed] = newGroups.splice(fromIdx, 1);
      newGroups.splice(toIdx, 0, removed);
      console.log("[Kanban handleBoardDrop] nova ordem após drop:", newGroups.map((g) => ({ id: g.id, name: g.name })));
      setQuadroGroups(newGroups);
      saveQuadroGroupsOrder(newGroups);
      toast.success("Ordem das áreas atualizada. A primeira posição indica maior prioridade.");
    } catch (err) {
      console.warn("[Kanban handleBoardDrop] erro:", err);
    }
  };

  const handleBoardDragEnd = () => {
    lastActionWasBoardDrag.current = true;
    setDraggingBoardId(null);
    setDragOverBoardId(null);
  };

  const saveTicketOrderByLane = (newOrderByLane) => {
    if (selectedQuadroGroupId == null) return;
    setTicketOrderByLane(newOrderByLane);
    try {
      const raw = localStorage.getItem(LS_KANBAN_TICKET_ORDER);
      const all = raw ? JSON.parse(raw) : {};
      all[String(selectedQuadroGroupId)] = newOrderByLane;
      localStorage.setItem(LS_KANBAN_TICKET_ORDER, JSON.stringify(all));
    } catch (e) {}
    try {
      api.put("/tickets/kanban/reorder", { quadroGroupId: selectedQuadroGroupId, orderByLane: newOrderByLane }).catch(() => {});
    } catch (e) {}
  };

  const handleBoardCardClick = (groupId) => {
    if (lastActionWasBoardDrag.current) {
      lastActionWasBoardDrag.current = false;
      return;
    }
    setSelectedQuadroGroupId(String(groupId));
  };

  const saveStatuses = async (newList) => {
    if (selectedQuadroGroupId == null || selectedQuadroGroupId === "") return;
    await api.put("/quadro-statuses", {
      statuses: newList,
      quadroGroupId: selectedQuadroGroupId,
    });
    const { data } = await api.get("/quadro-statuses", {
      params: { quadroGroupId: selectedQuadroGroupId },
    });
    setCustomStatuses(mapStatusesFromApi(data.statuses || data || []));
  };

  const handleAddStatus = async () => {
    const label = newStatusLabel.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (customStatuses.some((s) => s.value === value)) {
      toast.warn("Já existe um status com esse nome.");
      return;
    }
    try {
      await saveStatuses([...customStatuses, { value, label, color: newStatusColor }]);
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
    try {
      await saveStatuses(
        customStatuses.map((s, i) => (i === index ? { value, label, color: newStatusColor } : s))
      );
      setEditingStatusIdx(null);
      setNewStatusLabel("");
      setNewStatusColor("#1976d2");
      toast.success("Status atualizado.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao salvar status no servidor.");
    }
  };

  const handleDeleteStatus = async (index) => {
    const s = customStatuses[index];
    if (!window.confirm(`Excluir o status "${s.label}"?`)) return;
    const updated = customStatuses.filter((_, i) => i !== index);
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
    setNewStatusLabel(customStatuses[index].label);
    setNewStatusColor(customStatuses[index].color);
  };

  const handleCancelEditStatus = () => {
    setEditingStatusIdx(null);
    setNewStatusLabel("");
    setNewStatusColor("#1976d2");
  };

  const handleSearchClick = () => {
    kanbanUseDateFilterRef.current = true;
    fetchTickets();
  };

  const handleOpenShare = (e, ticket) => {
    e.stopPropagation();
    setShareModalTicket(ticket);
    const shared = ticket.quadroSharedGroupIds || ticket.sharedQuadroGroupIds || [];
    const otherIds = quadroGroups.map((g) => String(g.id)).filter((id) => id !== String(selectedQuadroGroupId));
    setShareModalSelectedIds(shared.map(String).filter((id) => otherIds.includes(id)));
    setShareModalLinkType(ticket.quadroLinkType === "unlinked" ? "unlinked" : "linked");
    setShareModalStagesByGroup(normalizeSharedStagesByGroup(ticket.quadroSharedStagesByGroup));
    shareModalTagsRequestedRef.current = new Set();
    setShareModalTagsByGroup({});
    setShareModalOpen(true);
  };

  const handleCloseShareModal = () => {
    setShareModalOpen(false);
    setShareModalTicket(null);
    setShareModalSelectedIds([]);
    setShareModalLinkType("linked");
    setShareModalStagesByGroup({});
    shareModalTagsRequestedRef.current = new Set();
    setShareModalTagsByGroup({});
  };

  const handleShareSave = async () => {
    if (!shareModalTicket?.id) return;
    setShareModalSaving(true);
    try {
      const payload = {
        groupIds: shareModalSelectedIds.map(Number).filter((n) => !Number.isNaN(n)),
        linkType: shareModalLinkType,
      };
      const stagesPayload = {};
      shareModalSelectedIds.forEach((gId) => {
        const arr = shareModalStagesByGroup[gId];
        if (Array.isArray(arr) && arr.length > 0) stagesPayload[String(gId)] = arr.map(Number).filter((n) => !Number.isNaN(n));
      });
      if (Object.keys(stagesPayload).length > 0) payload.sharedStagesByGroup = stagesPayload;
      await api.post("/tickets/" + shareModalTicket.id + "/quadro/share", payload);
      const msg = shareModalLinkType === "linked"
        ? "Compartilhamento atualizado. Alterações no quadro base refletem nos cards vinculados (com histórico)."
        : "Compartilhamento atualizado. Os cards nas outras áreas são cópias independentes.";
      toast.success(msg);
      handleCloseShareModal();
      fetchTickets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao compartilhar.");
    } finally {
      setShareModalSaving(false);
    }
  };

  /** Carrega colunas do Kanban de cada área marcada (não usar tags do quadro atual). */
  useEffect(() => {
    if (!shareModalOpen) return;
    shareModalSelectedIds.forEach((gIdStr) => {
      const key = String(gIdStr);
      if (shareModalTagsRequestedRef.current.has(key)) return;
      shareModalTagsRequestedRef.current.add(key);
      api
        .get("/tag/kanban/", { params: { quadroGroupId: key } })
        .then(({ data }) => {
          const list = data.lista || [];
          setShareModalTagsByGroup((prev) => ({
            ...prev,
            [key]: Array.isArray(list) ? list : [],
          }));
        })
        .catch(() => {
          setShareModalTagsByGroup((prev) => ({ ...prev, [key]: [] }));
        });
    });
  }, [shareModalOpen, shareModalSelectedIds]);

  const handleOpenMove = (e, ticket) => {
    e.stopPropagation();
    setMoveModalTicket(ticket);
    setMoveModalTargetGroupId("");
    setMoveModalTargetTagId("");
    setMoveModalTargetUserId("");
    setMoveModalOpen(true);
  };

  const handleCloseMoveModal = () => {
    setMoveModalOpen(false);
    setMoveModalTicket(null);
    setMoveModalTargetGroupId("");
    setMoveModalTargetTagId("");
    setMoveModalTargetUserId("");
  };

  const handleMoveSave = async () => {
    if (!moveModalTicket?.id) return;
    const targetGroupId = moveModalTargetGroupId ? String(moveModalTargetGroupId) : null;
    if (!targetGroupId) {
      toast.warn("Selecione a área de destino.");
      return;
    }
    setMoveModalSaving(true);
    try {
      await api.post("/tickets/" + moveModalTicket.id + "/quadro/move", {
        targetGroupId: Number(targetGroupId),
        targetTagId: moveModalTargetTagId ? Number(moveModalTargetTagId) : undefined,
        userId: moveModalTargetUserId ? Number(moveModalTargetUserId) : undefined,
      });
      toast.success("Ticket movido. Ele saiu desta área e aparece apenas no destino.");
      handleCloseMoveModal();
      fetchTickets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao mover.");
    } finally {
      setMoveModalSaving(false);
    }
  };
  const handleStartDateChange = (e) => setStartDate(e.target.value);
  const handleEndDateChange = (e) => setEndDate(e.target.value);
  const handleAddColunas = () => history.push("/tagsKanban");

  const handleColumnDragStart = (e, laneId) => {
    if (laneId === LANE_EM_ABERTO) return;
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "column", laneId }));
    e.dataTransfer.effectAllowed = "move";
    setDraggingColumnId(laneId);
  };

  const handleColumnDragOver = (e, laneId) => {
    if (laneId === LANE_EM_ABERTO) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumnId(laneId);
  };

  const handleColumnDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumnId(null);
  };

  const handleColumnDrop = (e, targetLaneId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumnId(null);
    setDraggingColumnId(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const { type, laneId: sourceLaneId, ticketId } = data;
      // Se for arrasto de card, mover o card (getData só pode ser lido uma vez, então usamos os dados já parseados)
      if (type !== "column") {
        const cardSourceLaneId = data.sourceLaneId;
        if (ticketId && cardSourceLaneId !== undefined) {
          handleCardMove(ticketId, cardSourceLaneId, targetLaneId);
        }
        setDraggingTicketId(null);
        setDragOverLaneId(null);
        return;
      }
      if (sourceLaneId === LANE_EM_ABERTO || targetLaneId === LANE_EM_ABERTO || sourceLaneId === targetLaneId) return;
      const fromIdx = tags.findIndex((t) => String(t.id) === sourceLaneId);
      const toIdx = tags.findIndex((t) => String(t.id) === targetLaneId);
      if (fromIdx === -1 || toIdx === -1) return;
      const newTags = [...tags];
      const [removed] = newTags.splice(fromIdx, 1);
      newTags.splice(toIdx, 0, removed);
      setTags(newTags);
      toast.success("Ordem das colunas atualizada.");
      try {
        api
          .put("/tag/kanban/reorder", {
            tagIds: newTags.map((t) => t.id),
            quadroGroupId: selectedQuadroGroupId,
          })
          .catch(() => {});
      } catch (err) {}
    } catch (err) {}
  };

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null);
    setDragOverColumnId(null);
  };

  const handleEditColumn = (e, tag) => {
    e.stopPropagation();
    setEditColumnTag(tag);
  };

  const handleCloseTagModal = () => {
    setEditColumnTag(null);
    fetchTags();
  };

  const handleVerQuadro = (uuid) => {
    setQuadroModalTicketUuid(uuid);
    setQuadroModalReadOnly(true);
    setQuadroModalOpen(true);
  };
  /** Com contato vinculado ou ticket normal: chat no app primeiro; wa.me só se não der para abrir atendimento. */
  const handleWhatsApp = (ticket) => {
    const r = resolveContactWhatsAppPhone(ticket?.contact);
    const d = String(r.copyText || "").replace(/\D/g, "");
    const preferApp =
      ticket?.uuid &&
      (hasRealKanbanContact(ticket) || !ticket?.isStandaloneQuadro);
    if (preferApp) {
      setChatModalTicketUuid(ticket.uuid);
      setChatModalOpen(true);
      return;
    }
    if (d.length >= 10) {
      openWhatsAppWebFromContact(
        { number: d },
        () => toast.info("Número insuficiente para abrir o WhatsApp.")
      );
      return;
    }
    if (ticket?.uuid) {
      setChatModalTicketUuid(ticket.uuid);
      setChatModalOpen(true);
      return;
    }
    toast.info("Não foi possível abrir a conversa deste cartão.");
  };

  const handleOpenNewTicketModal = (laneId) => {
    setNewTicketModalLaneId(laneId);
    setNewTicketModalOpen(true);
  };

  const afterKanbanTicketCreated = (payload) => {
    if (payload?.standalone) {
      fetchTickets();
      return;
    }
    const ticket = payload;
    if (ticket?.id && newTicketModalLaneId && newTicketModalLaneId !== LANE_EM_ABERTO) {
      api
        .put(`/ticket-tags/${ticket.id}/${newTicketModalLaneId}`)
        .then(() => fetchTickets())
        .catch((err) => {
          console.error(err);
          fetchTickets();
        });
    } else if (ticket?.id) {
      fetchTickets();
    }
  };

  const handleCloseNewTicketModal = (payload) => {
    afterKanbanTicketCreated(payload);
    setNewTicketModalOpen(false);
    setNewTicketModalLaneId(null);
  };
  const handleEdit = (e, uuid) => {
    e.stopPropagation();
    setQuadroModalTicketUuid(uuid);
    setQuadroModalReadOnly(false);
    setQuadroModalOpen(true);
  };
  const getKanbanCardDeleteLabel = (ticket) => {
    if (!ticket) return "";
    const proj =
      ticket.nomeProjeto || ticket.quadroNomeProjeto || ticket.nomeEmpresa;
    if (proj) return proj;
    const cn = ticket.contact?.name;
    if (cn && !/^quadro livre$/i.test(String(cn).trim())) return cn;
    if (ticket.isStandaloneQuadro) return "Quadro livre";
    return cn || `Cartão #${ticket.id}`;
  };

  const handleDeleteClick = (e, ticket) => {
    e.stopPropagation();
    setCardDeleteTicket(ticket);
  };

  const handleCloseDeleteCardModal = () => {
    if (cardDeleteLoading) return;
    setCardDeleteTicket(null);
  };

  const handleConfirmDeleteCard = async () => {
    if (!cardDeleteTicket) return;
    setCardDeleteLoading(true);
    try {
      const ticket = cardDeleteTicket;
      if (ticket.isStandaloneQuadro && ticket.uuid) {
        await api.delete(`/standalone-ticket-quadros/${ticket.uuid}`);
      } else {
        await api.delete(`/tickets/${ticket.id}`);
      }
      toast.success("Cartão removido.");
      setCardDeleteTicket(null);
      fetchTickets();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao excluir.");
    } finally {
      setCardDeleteLoading(false);
    }
  };

  const handleCardMove = async (ticketId, sourceLaneId, targetLaneId) => {
    if (sourceLaneId === targetLaneId) return;
    const laneDefaultLabel = i18n.t("tagsKanban.laneDefault") || "Sem etapa";
    const fromLabel =
      sourceLaneId === LANE_EM_ABERTO
        ? laneDefaultLabel
        : tags.find((x) => String(x.id) === String(sourceLaneId))?.name || sourceLaneId;
    const toLabel =
      targetLaneId === LANE_EM_ABERTO
        ? laneDefaultLabel
        : tags.find((x) => String(x.id) === String(targetLaneId))?.name || targetLaneId;

    const previousTickets = tickets;
    const movedTicket = previousTickets.find((t) => String(t.id) === String(ticketId));
    const isMirror =
      movedTicket && kanbanIsMirrorMove(movedTicket, selectedQuadroGroupId);

    setTickets((prev) =>
      prev.map((t) => {
        if (String(t.id) !== String(ticketId)) return t;
        if (isMirror) {
          const stages = { ...normalizeSharedStagesByGroup(t.quadroSharedStagesByGroup) };
          const gk = String(selectedQuadroGroupId);
          if (targetLaneId === LANE_EM_ABERTO) {
            stages[gk] = [];
          } else {
            stages[gk] = [String(targetLaneId)];
          }
          return { ...t, quadroSharedStagesByGroup: stages };
        }
        const kanbanTagIds = new Set(tags.map((x) => String(x.id)));
        const baseTags = (t.tags || []).filter((tt) => !kanbanTagIds.has(String(tt.id)));
        if (targetLaneId === LANE_EM_ABERTO) {
          return { ...t, tags: baseTags };
        }
        const tagObj = tags.find((x) => String(x.id) === String(targetLaneId));
        if (!tagObj) return { ...t, tags: baseTags };
        return {
          ...t,
          tags: [...baseTags, { id: tagObj.id, name: tagObj.name, color: tagObj.color || "" }],
        };
      })
    );

    try {
      if (isMirror) {
        await api.patch(`/tickets/${ticketId}/quadro/kanban-mirror-lane`, {
          quadroGroupId: selectedQuadroGroupId,
          tagId: targetLaneId === LANE_EM_ABERTO ? null : targetLaneId,
        });
        toast.success("Cartão movido.");
      } else if (targetLaneId === LANE_EM_ABERTO) {
        await api.delete(`/ticket-tags/${ticketId}`);
        toast.success("Tag removida do ticket.");
      } else {
        await api.delete(`/ticket-tags/${ticketId}`);
        await api.put(`/ticket-tags/${ticketId}/${targetLaneId}`);
        toast.success("Ticket movido com sucesso.");
      }
      if (Number(ticketId) > 0) {
        try {
          await api.post(`/tickets/${ticketId}/quadro/log`, {
            fromLaneId: sourceLaneId,
            toLaneId: targetLaneId,
            fromLabel,
            toLabel,
          });
        } catch (logErr) {
          console.error("Erro ao registrar log de status:", logErr);
          toast.warn("Ticket movido, mas o log de status não foi registrado.");
        }
      }
    } catch (err) {
      setTickets(previousTickets);
      console.error(err);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Erro ao mover ticket."
      );
    } finally {
      setDragOverLaneId(null);
      setDraggingTicketId(null);
    }
  };

  const handleDragStart = (e, ticketId, sourceLaneId) => {
    if (e.target.closest("button") || e.target.closest("[data-no-drag]")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ ticketId, sourceLaneId })
    );
    e.dataTransfer.effectAllowed = "move";
    setDraggingTicketId(ticketId);
  };

  const handleDragEnd = () => {
    setDraggingTicketId(null);
    setDragOverLaneId(null);
  };

  const handleDragOver = (e, laneId) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverLaneId(laneId);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverLaneId(null);
    }
  };

  const handleDrop = (e, targetLaneId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverLaneId(null);
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    let targetTicketId = null;
    try {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const card = el && el.closest("[data-ticket-id]");
      if (card) targetTicketId = card.getAttribute("data-ticket-id");
    } catch (err) {}
    try {
      const data = JSON.parse(raw);
      if (data.type === "column") {
        handleColumnDrop(e, targetLaneId);
        setDraggingTicketId(null);
        return;
      }
      const { ticketId, sourceLaneId } = data;
      if (!ticketId) return;
      const sourceId = String(sourceLaneId);
      const targetId = String(targetLaneId);
      if (sourceId === targetId) {
        // Reordenar dentro da mesma coluna (prioridade)
        const ticketsInLane = targetId === LANE_EM_ABERTO
          ? tickets.filter((t) => getTicketLaneId(t) === null)
          : tickets.filter((t) => getTicketLaneId(t) === targetId);
        const currentOrder = (ticketOrderByLane[targetId] && ticketOrderByLane[targetId].length > 0)
          ? [...ticketOrderByLane[targetId]]
          : ticketsInLane.map((t) => String(t.id));
        const ticketIdStr = String(ticketId);
        const newOrder = currentOrder.filter((id) => id !== ticketIdStr);
        const insertIdx = targetTicketId != null
          ? Math.max(0, newOrder.indexOf(String(targetTicketId)))
          : newOrder.length;
        newOrder.splice(insertIdx, 0, ticketIdStr);
        const newOrderByLane = { ...ticketOrderByLane, [targetId]: newOrder };
        saveTicketOrderByLane(newOrderByLane);
        toast.success("Ordem do ticket atualizada (prioridade na coluna).");
      } else {
        handleCardMove(ticketId, sourceLaneId, targetLaneId);
        // Atualizar ordem: remover da coluna de origem e acrescentar na de destino
        const newOrderByLane = { ...ticketOrderByLane };
        if (newOrderByLane[sourceId]) {
          newOrderByLane[sourceId] = newOrderByLane[sourceId].filter((id) => id !== String(ticketId));
        }
        const targetOrder = newOrderByLane[targetId] || [];
        const idxOfTarget = targetTicketId != null ? targetOrder.indexOf(String(targetTicketId)) : -1;
        const insertIdx = idxOfTarget >= 0 ? idxOfTarget : targetOrder.length;
        const newTargetOrder = targetOrder.filter((id) => id !== String(ticketId));
        newTargetOrder.splice(insertIdx, 0, String(ticketId));
        newOrderByLane[targetId] = newTargetOrder;
        saveTicketOrderByLane(newOrderByLane);
      }
    } catch (err) {
      console.error(err);
    }
    setDraggingTicketId(null);
  };

  // Ordem fixa das colunas (tags) para decidir onde o ticket aparece
  const tagIdsOrder = tags.map((t) => String(t.id));
  // Cada ticket em UMA coluna: sem tag = Em aberto; com tag = coluna da última tag (na ordem das colunas), assim o movimento para 3ª/4ª coluna aparece certo.
  // Card compartilhado neste quadro (espelho): a tag Kanban costuma ser da área de origem — usa etapas escolhidas no share (quadroSharedStagesByGroup).
  const getTicketLaneId = (t) => {
    const gid =
      selectedQuadroGroupId != null && selectedQuadroGroupId !== ""
        ? String(selectedQuadroGroupId)
        : "";

    const homeRaw =
      t.quadroHomeGroupId != null && t.quadroHomeGroupId !== ""
        ? t.quadroHomeGroupId
        : t.quadroGroupId != null && t.quadroGroupId !== ""
          ? t.quadroGroupId
          : null;
    const homeStr = homeRaw != null ? String(homeRaw) : null;

    const tagBasedLane = () => {
      if (!t.tags || t.tags.length === 0 || tagIdsOrder.length === 0) return null;
      let lastIdx = -1;
      let lastId = null;
      for (const tt of t.tags) {
        const id = String(tt.id);
        const idx = tagIdsOrder.indexOf(id);
        if (idx >= 0 && idx > lastIdx) {
          lastIdx = idx;
          lastId = id;
        }
      }
      return lastId;
    };

    if (gid && tagIdsOrder.length > 0) {
      const shared = t.quadroSharedGroupIds;
      const sharedHere =
        Array.isArray(shared) && shared.some((x) => String(x) === gid);
      const isNativeHome = homeStr != null && homeStr === gid;
      if (sharedHere && !isNativeHome) {
        const stagesBy = normalizeSharedStagesByGroup(t.quadroSharedStagesByGroup);
        const stageIds = stagesBy[gid] || [];
        for (const sid of stageIds) {
          const s = String(sid);
          if (tagIdsOrder.includes(s)) return s;
        }
      }
    }

    return tagBasedLane();
  };

  const ticketsEmAberto = tickets.filter((t) => getTicketLaneId(t) === null);

  const sortTicketsByOrder = (ticketList, laneId) => {
    const order = ticketOrderByLane[laneId];
    if (!order || !Array.isArray(order) || order.length === 0) return ticketList;
    const byId = new Map(ticketList.map((t) => [String(t.id), t]));
    const ordered = order.map((id) => byId.get(String(id))).filter(Boolean);
    const remaining = ticketList.filter((t) => !order.includes(String(t.id)));
    return [...ordered, ...remaining];
  };

  /** Só mostra coluna "sem etapa" quando há cards sem tag Kanban (área nova fica sem coluna até criar etapas). */
  const lanes = [
    ...(ticketsEmAberto.length > 0
      ? [
          {
            id: LANE_EM_ABERTO,
            title: i18n.t("tagsKanban.laneDefault") || "Sem etapa",
            headerColor: null,
            tickets: sortTicketsByOrder(ticketsEmAberto, LANE_EM_ABERTO),
            statusLabel: i18n.t("tagsKanban.laneDefault") || "Sem etapa",
          },
        ]
      : []),
    ...tags.map((tag) => {
      const laneId = String(tag.id);
      const laneTickets = tickets.filter((t) => getTicketLaneId(t) === laneId);
      return {
        id: laneId,
        title: tag.name,
        headerColor: tag.color || "#1976d2",
        tickets: sortTicketsByOrder(laneTickets, laneId),
        statusLabel: tag.name,
      };
    }),
  ];

  const otherGroups = quadroGroups.filter((g) => String(g.id) !== String(selectedQuadroGroupId));

  const BOARD_COLORS = ["#1976d2", "#2e7d32", "#ed6c02", "#9c27b0", "#d32f2f", "#00838f", "#e91e63", "#ff6f00", "#5c6bc0", "#00897b"];

  /** Com filtro ativo, desativa arrastar para não reordenar índices errados. */
  const boardDragLockedBySearch = boardSearchQuery.trim() !== "";

  const closeWorkspaceManager = () => {
    setWsManagerOpen(false);
    setEditingWsId(null);
    setEditingWsName("");
    setNewWsName("");
  };

  const renderWorkspaceManagerDialog = () => (
    <Dialog
      open={wsManagerOpen}
      onClose={closeWorkspaceManager}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Dashboard fontSize="small" />
          Áreas de Trabalho
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
          Cada área de trabalho funciona como um espaço isolado com colunas e cards independentes. Crie áreas para organizar projetos, processos ou equipes separadamente.
        </Typography>

        <Typography variant="caption" color="textSecondary" style={{ marginBottom: 4, display: "block" }}>
          Arraste um item para cima ou para baixo para definir a prioridade (primeiro = maior prioridade).
        </Typography>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {quadroGroups.map((g) => {
            const isDragging = draggingBoardId === String(g.id);
            const isDropTarget = dragOverBoardId === String(g.id);
            return (
              <Paper
                key={g.id}
                variant="outlined"
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderLeftWidth: 4,
                  borderLeftColor: String(g.id) === String(selectedQuadroGroupId) ? "#1976d2" : "#e0e0e0",
                  backgroundColor: String(g.id) === String(selectedQuadroGroupId) ? "#f0f7ff" : undefined,
                  opacity: isDragging ? 0.7 : 1,
                  boxShadow: isDropTarget ? "inset 0 0 0 2px #1976d2" : undefined,
                }}
                draggable
                onDragStart={(e) => {
                  if (e.target.closest("[data-no-drag]")) {
                    e.preventDefault();
                    return;
                  }
                  handleBoardDragStart(e, g.id);
                }}
                onDragOver={(e) => handleBoardDragOver(e, g.id)}
                onDragLeave={handleBoardDragLeave}
                onDrop={(e) => handleBoardDrop(e, g.id)}
                onDragEnd={handleBoardDragEnd}
              >
                <span style={{ cursor: "grab", display: "flex", color: "#999" }} title="Arrastar para reordenar">
                  <DragIndicator style={{ fontSize: 20 }} />
                </span>
                <Dashboard style={{ fontSize: 20, color: String(g.id) === String(selectedQuadroGroupId) ? "#1976d2" : "#999" }} />
                {editingWsId === String(g.id) ? (
                  <TextField
                    size="small"
                    variant="outlined"
                    value={editingWsName}
                    onChange={(e) => setEditingWsName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameWorkspace();
                      if (e.key === "Escape") {
                        setEditingWsId(null);
                        setEditingWsName("");
                      }
                    }}
                    autoFocus
                    style={{ flex: 1 }}
                    data-no-drag
                  />
                ) : (
                  <Typography variant="body1" style={{ flex: 1, fontWeight: 500 }}>
                    {g.name}
                    {g.isDefault && (
                      <Typography variant="caption" color="textSecondary" component="span" style={{ marginLeft: 8 }}>
                        (padrão)
                      </Typography>
                    )}
                  </Typography>
                )}
                {editingWsId === String(g.id) ? (
                  <>
                    <Button size="small" variant="contained" color="primary" onClick={handleRenameWorkspace} data-no-drag>
                      Salvar
                    </Button>
                    <Button size="small" onClick={() => { setEditingWsId(null); setEditingWsName(""); }} data-no-drag>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Tooltip title="Renomear">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingWsId(String(g.id));
                          setEditingWsName(g.name);
                        }}
                        data-no-drag
                      >
                        <Edit style={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    {!g.isDefault && (
                      <Tooltip title="Excluir área">
                        <IconButton
                          size="small"
                          onClick={() => openDeleteWorkspaceModal(g.id)}
                          style={{ color: "#d32f2f" }}
                          data-no-drag
                        >
                          <Delete style={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Button
                      size="small"
                      variant={String(g.id) === String(selectedQuadroGroupId) ? "contained" : "outlined"}
                      color="primary"
                      onClick={() => {
                        setSelectedQuadroGroupId(String(g.id));
                        setWsManagerOpen(false);
                      }}
                      data-no-drag
                    >
                      {String(g.id) === String(selectedQuadroGroupId) ? "Ativa" : "Acessar"}
                    </Button>
                  </>
                )}
              </Paper>
            );
          })}
        </div>

        <Divider style={{ marginBottom: 16 }} />

        <Typography variant="subtitle2" style={{ marginBottom: 8 }}>
          Criar nova área de trabalho
        </Typography>
        <div style={{ display: "flex", gap: 8 }}>
          <TextField
            size="small"
            variant="outlined"
            label="Nome da área"
            placeholder="Ex.: Ordem de Serviço, Orçamento..."
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateWorkspace();
            }}
            style={{ flex: 1 }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<CreateNewFolder />}
            onClick={handleCreateWorkspace}
            disabled={!newWsName.trim()}
          >
            Criar
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeWorkspaceManager}>
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDeleteWorkspaceDialog = () => (
    <Dialog
      open={Boolean(workspaceDeleteTarget)}
      onClose={() => !workspaceDeleteLoading && setWorkspaceDeleteTarget(null)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ style: { borderRadius: 12 } }}
    >
      <DialogTitle style={{ paddingBottom: 8 }}>
        Excluir área de trabalho?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" component="p" style={{ marginBottom: 12 }}>
          Tem certeza que deseja excluir a área{" "}
          <strong>{workspaceDeleteTarget?.name}</strong>?
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p">
          Os atendimentos não são apagados; podem aparecer em outras áreas conforme as regras do sistema. Esta ação não pode ser desfeita.
        </Typography>
      </DialogContent>
      <DialogActions style={{ padding: "8px 16px 16px", gap: 8 }}>
        <Button onClick={() => setWorkspaceDeleteTarget(null)} disabled={workspaceDeleteLoading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          style={{ backgroundColor: "#d32f2f", color: "#fff" }}
          disabled={workspaceDeleteLoading}
          onClick={executeDeleteWorkspace}
        >
          {workspaceDeleteLoading ? "Excluindo…" : "Excluir área"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  const renderDeleteCardDialog = () => (
    <Dialog
      open={Boolean(cardDeleteTicket)}
      onClose={handleCloseDeleteCardModal}
      maxWidth="xs"
      fullWidth
      PaperProps={{ className: classes.deleteCardDialogPaper }}
    >
      <div className={classes.deleteCardDialogIconWrap}>
        <div className={classes.deleteCardDialogIconCircle}>
          <DeleteForever style={{ fontSize: 28 }} />
        </div>
      </div>
      <DialogTitle style={{ paddingTop: 0, textAlign: "center" }}>
        Excluir este cartão?
      </DialogTitle>
      <DialogContent style={{ paddingTop: 0 }}>
        <Typography variant="body2" color="textSecondary" component="p" align="center" style={{ marginBottom: 12 }}>
          O cartão{" "}
          <strong>{getKanbanCardDeleteLabel(cardDeleteTicket)}</strong> será
          removido do quadro.
        </Typography>
        <Typography variant="body2" color="textSecondary" component="p" align="center">
          {cardDeleteTicket?.isStandaloneQuadro
            ? "Esta ação não pode ser desfeita."
            : "O atendimento (ticket) será encerrado conforme as regras do sistema. Esta ação não pode ser desfeita."}
        </Typography>
      </DialogContent>
      <DialogActions style={{ padding: "8px 16px 20px", gap: 8, justifyContent: "center" }}>
        <Button
          variant="outlined"
          onClick={handleCloseDeleteCardModal}
          disabled={cardDeleteLoading}
          style={{ minWidth: 120 }}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          style={{ backgroundColor: "#d32f2f", color: "#fff", minWidth: 120 }}
          disabled={cardDeleteLoading}
          onClick={handleConfirmDeleteCard}
          startIcon={cardDeleteLoading ? null : <DeleteForever />}
        >
          {cardDeleteLoading ? "Excluindo…" : "Excluir"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ===== LANDING PAGE: Nenhuma área selecionada =====
  if (selectedQuadroGroupId == null) {
    return (
      <div className={classes.root}>
        <div className={classes.landingPage}>
          <Typography component="div" className={classes.landingTitle}>
            Áreas de Trabalho
            <HelpHint areaKey="kanban" />
          </Typography>
          <Typography className={classes.landingSubtitle}>
            Selecione uma área para acessar o quadro
          </Typography>

          <div className={classes.landingSearchWrap}>
            <TextField
              className={classes.landingSearchField}
              fullWidth
              variant="outlined"
              size="small"
              placeholder={i18n.t("tagsKanban.boardsLanding.searchPlaceholder")}
              value={boardSearchQuery}
              onChange={(e) => setBoardSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" color="action" aria-hidden />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                "aria-label": i18n.t("tagsKanban.boardsLanding.searchAria"),
              }}
            />
          </div>

          {filteredQuadroGroups.length === 0 && boardSearchQuery.trim() !== "" && (
            <Typography className={classes.landingNoResults}>
              {i18n.t("tagsKanban.boardsLanding.noResults")}
            </Typography>
          )}

          <div className={classes.landingGrid}>
            {filteredQuadroGroups.map((g) => {
              const idx = quadroGroups.findIndex((x) => String(x.id) === String(g.id));
              const colorIdx = idx >= 0 ? idx : 0;
              const bgColor = BOARD_COLORS[colorIdx % BOARD_COLORS.length];
              const isDragging = draggingBoardId === String(g.id);
              const isDropTarget = dragOverBoardId === String(g.id);
              return (
                <Paper
                  key={g.id}
                  className={`${classes.landingCard} ${isDragging ? classes.landingCardDragging : ""} ${isDropTarget ? classes.landingCardDropTarget : ""}`}
                  elevation={0}
                  onClick={() => handleBoardCardClick(g.id)}
                  draggable={!boardDragLockedBySearch}
                  onDragStart={
                    boardDragLockedBySearch
                      ? undefined
                      : (e) => {
                          if (e.target.closest("[data-no-drag]")) {
                            e.preventDefault();
                            return;
                          }
                          handleBoardDragStart(e, g.id);
                        }
                  }
                  onDragOver={boardDragLockedBySearch ? undefined : (e) => handleBoardDragOver(e, g.id)}
                  onDragLeave={boardDragLockedBySearch ? undefined : handleBoardDragLeave}
                  onDrop={boardDragLockedBySearch ? undefined : (e) => handleBoardDrop(e, g.id)}
                  onDragEnd={boardDragLockedBySearch ? undefined : handleBoardDragEnd}
                >
                  <div
                    className={classes.landingCardHeader}
                    style={{ backgroundColor: bgColor }}
                  >
                    <Dashboard className={classes.landingCardHeaderIcon} />
                  </div>
                  <div className={classes.landingCardBody}>
                    <div
                      className={classes.landingCardActions}
                      data-no-drag
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip title="Renomear área">
                        <IconButton
                          size="small"
                          aria-label="Renomear área"
                          onClick={(e) => {
                            e.stopPropagation();
                            openWorkspaceEditor(g);
                          }}
                        >
                          <Edit style={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                      {!g.isDefault && (
                        <Tooltip title="Excluir área">
                          <IconButton
                            size="small"
                            aria-label="Excluir área"
                            style={{ color: "#d32f2f" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteWorkspaceModal(g.id);
                            }}
                          >
                            <Delete style={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                    <Typography className={classes.landingCardName}>
                      {g.name}
                      {g.isDefault && (
                        <span className={classes.landingCardDefault}>PADRÃO</span>
                      )}
                    </Typography>
                    <Typography className={classes.landingCardMeta}>
                      Arraste para reordenar · Clique para acessar · Renomear ou excluir no canto
                    </Typography>
                  </div>
                </Paper>
              );
            })}

            {/* Card para criar nova área */}
            <div
              className={classes.landingAddCard}
              onClick={() => {
                setEditingWsId(null);
                setEditingWsName("");
                setNewWsName("");
                setWsManagerOpen(true);
              }}
            >
              <CreateNewFolder className={classes.landingAddIcon} />
              <Typography className={classes.landingAddText}>
                Criar nova área
              </Typography>
            </div>
          </div>
        </div>

        {renderWorkspaceManagerDialog()}
        {renderDeleteWorkspaceDialog()}
      </div>
    );
  }

  // ===== QUADRO KANBAN (área selecionada) =====
  return (
    <div className={classes.root}>
      {/* BARRA SUPERIOR DO QUADRO */}
      <div className={classes.boardTopBar}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => setSelectedQuadroGroupId(null)}
          className={classes.boardBackBtn}
          size="small"
        >
          Áreas
        </Button>
        <Divider orientation="vertical" flexItem />
        <Typography component="div" className={classes.boardCurrentName}>
          <span>
            {quadroGroups.find((g) => String(g.id) === String(selectedQuadroGroupId))?.name || "Quadro"}
          </span>
          <HelpHint areaKey="kanban" />
        </Typography>
        {quadroGroups.map((g) => {
          const isActive = String(g.id) === String(selectedQuadroGroupId);
          return (
            <Chip
              key={g.id}
              label={g.name}
              size="small"
              color={isActive ? "primary" : "default"}
              variant={isActive ? "default" : "outlined"}
              onClick={() => setSelectedQuadroGroupId(String(g.id))}
              style={{ fontWeight: isActive ? 700 : 400, cursor: "pointer" }}
            />
          );
        })}
        <Tooltip title="Gerenciar áreas">
          <IconButton
            size="small"
            onClick={() => {
              setEditingWsId(null);
              setEditingWsName("");
              setNewWsName("");
              setWsManagerOpen(true);
            }}
          >
            <Settings fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      <header className={classes.header}>
        <div className={classes.filters}>
          <TextField
            label="Data de início"
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
            className={classes.dateInput}
            inputProps={{ max: endDate }}
          />
          <TextField
            label="Data de fim"
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            InputLabelProps={{ shrink: true }}
            variant="outlined"
            size="small"
            className={classes.dateInput}
            inputProps={{ min: startDate }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleSearchClick}
            className={classes.btnBuscar}
          >
            BUSCAR
          </Button>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Settings />}
            onClick={() => setStatusManagerOpen(true)}
            style={{ textTransform: "none", fontWeight: 600 }}
          >
            Gerenciar Status
          </Button>
          <Can
            role={user.profile}
            perform="dashboard:view"
            yes={() => (
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddColunas}
                className={classes.btnAdicionar}
              >
                + ADICIONAR COLUNAS
              </Button>
            )}
          />
        </div>
      </header>

      <div
        className={classes.columnsWrapper}
        onDragOverCapture={(e) => {
          if (draggingColumnId) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const col = el && el.closest("[data-lane-id]");
          if (col) setDragOverLaneId(col.getAttribute("data-lane-id"));
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragOverLaneId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const el = document.elementFromPoint(e.clientX, e.clientY);
          const col = el && el.closest("[data-lane-id]");
          const targetLaneId = col ? col.getAttribute("data-lane-id") : null;
          setDragOverLaneId(null);
          if (!targetLaneId) return;
          const raw = e.dataTransfer.getData("application/json");
          if (!raw) return;
          try {
            const data = JSON.parse(raw);
            if (data.type === "column") {
              handleColumnDrop(e, targetLaneId);
              return;
            }
            const { ticketId, sourceLaneId } = data;
            if (ticketId != null && sourceLaneId != null) {
              handleCardMove(ticketId, sourceLaneId, targetLaneId);
            }
            setDraggingTicketId(null);
          } catch (err) {
            console.error(err);
          }
        }}
      >
        {lanes.length === 0 ? (
          <div className={classes.columnsEmptyPlaceholder}>
            <Typography variant="h6" color="textSecondary" align="center">
              Esta área ainda não tem colunas
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" style={{ maxWidth: 420 }}>
              Para começar, adicione colunas (etapas) pelo botão no topo da página ou pelo botão abaixo. Os cartões aparecem só nas colunas que você criar.
            </Typography>
            <Can
              role={user.profile}
              perform="dashboard:view"
              yes={() => (
                <Button variant="contained" color="primary" onClick={handleAddColunas} className={classes.btnAdicionar}>
                  + ADICIONAR COLUNAS
                </Button>
              )}
            />
          </div>
        ) : (
        lanes.map((lane) => {
          const isTagColumn = lane.id !== LANE_EM_ABERTO;
          const tag = isTagColumn ? tags.find((t) => String(t.id) === lane.id) : null;
          const columnSearchRaw = columnSearchByLaneId[lane.id] || "";
          const columnSearchNorm = normalizeKanbanColumnSearch(columnSearchRaw);
          const filteredLaneTickets = columnSearchNorm
            ? lane.tickets.filter((t) => ticketMatchesKanbanColumnSearch(t, columnSearchNorm))
            : lane.tickets;
          return (
          <div
            key={lane.id}
            data-lane-id={lane.id}
            className={`${classes.column} ${
              draggingColumnId === lane.id ? classes.columnDragging : ""
            } ${dragOverColumnId === lane.id ? classes.columnDropTarget : ""}`}
            onDragOver={isTagColumn ? (e) => handleColumnDragOver(e, lane.id) : undefined}
            onDragLeave={isTagColumn ? handleColumnDragLeave : undefined}
            onDrop={isTagColumn ? (e) => handleColumnDrop(e, lane.id) : undefined}
          >
            <div
              className={`${classes.columnHeader} ${
                lane.id === LANE_EM_ABERTO ? classes.columnHeaderEmAberto : ""
              }`}
              style={lane.headerColor ? { backgroundColor: lane.headerColor } : undefined}
            >
              <div className={classes.columnHeaderTitleRow}>
                {isTagColumn && (
                  <span
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, lane.id)}
                    onDragEnd={handleColumnDragEnd}
                    style={{ cursor: "grab", display: "flex", flexShrink: 0, color: "rgba(255,255,255,0.9)", marginTop: 1 }}
                    title="Arrastar para reordenar"
                  >
                    <DragIndicator className={classes.columnDragHandleIcon} />
                  </span>
                )}
                <span className={classes.columnHeaderTitleText} title={lane.title}>
                  {lane.title}
                </span>
                <div className={classes.columnHeaderRightActions}>
                  {isTagColumn && tag && (
                    <IconButton
                      size="small"
                      className={classes.columnEditIcon}
                      onClick={(e) => handleEditColumn(e, tag)}
                      title="Editar coluna"
                    >
                      <Edit />
                    </IconButton>
                  )}
                  <Tooltip title="Adicionar cartão">
                    <IconButton
                      size="small"
                      className={classes.columnAddCardIcon}
                      onClick={() => handleOpenNewTicketModal(lane.id)}
                      aria-label="Adicionar cartão"
                    >
                      <Add />
                    </IconButton>
                  </Tooltip>
                </div>
              </div>
              <div className={classes.columnHeaderMetaRow}>
                <span
                  title={
                    columnSearchNorm
                      ? `Exibindo ${filteredLaneTickets.length} de ${lane.tickets.length} cartões`
                      : `${lane.tickets.length} cartões`
                  }
                >
                  {columnSearchNorm
                    ? `${filteredLaneTickets.length}/${lane.tickets.length}`
                    : lane.tickets.length}
                </span>
              </div>
            </div>
            <div className={classes.columnSearchRow}>
              <TextField
                fullWidth
                size="small"
                variant="outlined"
                placeholder="Pesquisar contato, projeto, ID…"
                value={columnSearchRaw}
                onChange={(e) => {
                  const v = e.target.value;
                  setColumnSearchByLaneId((prev) => ({ ...prev, [lane.id]: v }));
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search style={{ fontSize: 18, opacity: 0.55 }} />
                    </InputAdornment>
                  ),
                  endAdornment: columnSearchRaw ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        aria-label="Limpar pesquisa"
                        onClick={() => {
                          setColumnSearchByLaneId((prev) => {
                            const next = { ...prev };
                            delete next[lane.id];
                            return next;
                          });
                        }}
                      >
                        <Close fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />
            </div>
            <div
              className={`${classes.columnCards} ${
                dragOverLaneId === lane.id ? classes.columnCardsDragOver : ""
              }`}
              onDragOver={(e) => handleDragOver(e, lane.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, lane.id)}
            >
              {filteredLaneTickets.length === 0 && columnSearchNorm ? (
                <Typography variant="caption" color="textSecondary" style={{ textAlign: "center", padding: 8 }}>
                  Nenhum cartão encontrado para esta pesquisa.
                </Typography>
              ) : (
              filteredLaneTickets.map((ticket) => {
                const statusChip = getQuadroEtapaDisplay(ticket.quadroEtapaStatus, customStatuses);
                const hasContact = hasRealKanbanContact(ticket);
                const nomeCartaoRaw = getKanbanCardNomeCartao(ticket);
                const cardTitleDisplay = nomeCartaoRaw || "Sem título";
                const contactLine = hasContact ? getKanbanContactDisplayLine(ticket) : "";
                return (
                <Paper
                  key={ticket.id}
                  data-ticket-id={ticket.id}
                  elevation={0}
                  className={`${classes.card} ${
                    draggingTicketId === ticket.id ? classes.cardDragging : ""
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, ticket.id, lane.id)}
                  onDragEnd={handleDragEnd}
                >
                  <div className={classes.cardHeader}>
                    <div className={classes.cardHeaderText}>
                      <span className={classes.cardFieldLabel}>Cartão</span>
                      {editingNameTicketId === ticket.id ? (
                        <input
                          className={classes.inlineNameInput}
                          value={editingNameValue}
                          onChange={(e) => setEditingNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditName(ticket.id);
                            if (e.key === "Escape") handleCancelEditName();
                          }}
                          onBlur={() => handleSaveEditName(ticket.id)}
                          autoFocus
                          data-no-drag
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <Typography className={classes.cardClientName} title={cardTitleDisplay}>
                            {cardTitleDisplay}
                          </Typography>
                          <IconButton
                            size="small"
                            className={classes.cardEditNameBtn}
                            onClick={(e) => handleStartEditName(e, ticket)}
                            title="Editar título do cartão"
                            data-no-drag
                          >
                            <Edit style={{ fontSize: 14 }} />
                          </IconButton>
                        </div>
                      )}
                      {hasContact && contactLine && (
                        <div className={classes.cardContactBlock}>
                          <span className={classes.cardFieldLabel}>Cliente / contato</span>
                          <div className={classes.cardContactRow}>
                            <Avatar
                              className={classes.cardContactAvatar}
                              src={getContactImageUrl(getKanbanTicketContact(ticket)) || undefined}
                              alt={contactLine}
                            >
                              {(contactLine || "?").trim().charAt(0).toUpperCase() || "?"}
                            </Avatar>
                            <Typography className={classes.cardContactName} component="span" title={contactLine}>
                              {contactLine}
                            </Typography>
                          </div>
                        </div>
                      )}
                      {ticket.whatsapp?.name && hasContact && (
                        <Typography className={classes.cardConnection} title={ticket.whatsapp.name}>
                          {ticket.whatsapp.name}
                        </Typography>
                      )}
                    </div>
                    <div className={classes.cardBadgeWrap}>
                      <Chip
                        size="small"
                        label={statusChip?.label || "Sem status"}
                        className={classes.cardStatus}
                        title="Status do cartão"
                        style={{
                          backgroundColor: statusChip?.color || "#9e9e9e",
                          color: "#fff",
                        }}
                      />
                    </div>
                  </div>
                  {(ticket.quadroCapaUrl || ticket.capaUrl) && (
                    <img
                      src={getCardImageUrl(ticket)}
                      alt="Capa"
                      className={classes.cardCapa}
                    />
                  )}
                  {Array.isArray(ticket.quadroProcessoAttachments) &&
                    ticket.quadroProcessoAttachments.length > 0 &&
                    (() => {
                      const procImages = ticket.quadroProcessoAttachments.filter((x) =>
                        isQuadroProcessoImageFilename(x.name)
                      );
                      return (
                        <div
                          className={classes.cardProcessoSection}
                          data-no-drag
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          <span className={classes.cardProcessoLabel}>Imagens e documentos do processo</span>
                          <div className={classes.cardProcessoRow}>
                            {ticket.quadroProcessoAttachments.map((att) => {
                              const isImg = isQuadroProcessoImageFilename(att.name);
                              const imgIndex = procImages.findIndex((x) => x.id === att.id);
                              if (isImg) {
                                return (
                                  <img
                                    key={att.id}
                                    src={resolveBackendPublicUrl(att.url)}
                                    alt={att.name || ""}
                                    className={classes.cardProcessoThumb}
                                    title={att.name || "Ampliar"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (imgIndex >= 0) {
                                        setCardProcLightbox({ images: procImages, index: imgIndex });
                                      }
                                    }}
                                  />
                                );
                              }
                              return (
                                <Tooltip key={att.id} title={`Abrir / baixar: ${att.name || "documento"}`}>
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    className={classes.cardProcessoDoc}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(resolveBackendPublicUrl(att.url), "_blank", "noopener,noreferrer");
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        window.open(resolveBackendPublicUrl(att.url), "_blank", "noopener,noreferrer");
                                      }
                                    }}
                                  >
                                    <Description className={classes.cardProcessoDocIcon} />
                                    <span className={classes.cardProcessoDocName}>{att.name || "Documento"}</span>
                                  </span>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  {(ticket.quadroSharedGroupIds?.length > 0 || ticket.sharedQuadroGroupIds?.length > 0) && (
                    <div className={classes.cardSharedMeta}>
                      Compartilhado: {(ticket.quadroSharedGroupIds || ticket.sharedQuadroGroupIds || [])
                        .map((id) => quadroGroups.find((g) => String(g.id) === String(id))?.name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  )}
                  <div className={classes.cardActions} data-no-drag>
                    <IconButton size="small" className={classes.cardIconBtn} onClick={(e) => handleOpenMove(e, ticket)} title="Mover para outra área, etapa ou atendente (sai deste quadro)">
                      <SwapHoriz fontSize="small" />
                    </IconButton>
                    <IconButton size="small" className={classes.cardIconBtn} onClick={(e) => handleOpenShare(e, ticket)} title="Compartilhar com outras áreas (vinculado ou desvinculado)">
                      <Share fontSize="small" />
                    </IconButton>
                    <IconButton size="small" className={classes.cardIconBtn} onClick={() => handleVerQuadro(ticket.uuid)} title="Ver Quadro">
                      <Visibility fontSize="small" />
                    </IconButton>
                    <IconButton size="small" className={classes.cardIconBtn} onClick={() => handleWhatsApp(ticket)} title="Abrir conversa (modal)">
                      <WhatsApp fontSize="small" />
                    </IconButton>
                    <IconButton size="small" className={classes.cardIconBtn} onClick={(e) => handleEdit(e, ticket.uuid)} title="Editar">
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" className={classes.cardIconBtn} onClick={(e) => handleDeleteClick(e, ticket)} title="Excluir">
                      <Delete fontSize="small" />
                    </IconButton>
                  </div>
                </Paper>
                );
              })
              )}
            </div>
          </div>
          );
        })
        )}
      </div>

      <Dialog
        open={Boolean(cardProcLightbox?.images?.length)}
        onClose={() => setCardProcLightbox(null)}
        maxWidth={false}
        PaperProps={{
          style: { backgroundColor: "#111", maxWidth: "min(96vw, 920px)", margin: 16 },
        }}
      >
        <div style={{ position: "relative", padding: 8, minWidth: 200 }}>
          <IconButton
            style={{ position: "absolute", top: 4, right: 4, zIndex: 2, color: "#fff" }}
            onClick={() => setCardProcLightbox(null)}
            aria-label="Fechar"
          >
            <Close />
          </IconButton>
          {cardProcLightbox?.images?.length > 0 && (
            <>
              <img
                alt={cardProcLightbox.images[cardProcLightbox.index]?.name || ""}
                src={resolveBackendPublicUrl(cardProcLightbox.images[cardProcLightbox.index]?.url)}
                style={{
                  display: "block",
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  margin: "0 auto",
                  objectFit: "contain",
                }}
              />
              {cardProcLightbox.images.length > 1 && (
                <>
                  <IconButton
                    className={classes.cardProcLightboxNav}
                    style={{ left: 8 }}
                    onClick={() =>
                      setCardProcLightbox((lb) => {
                        if (!lb?.images?.length) return lb;
                        const n = lb.images.length;
                        return { ...lb, index: (lb.index - 1 + n) % n };
                      })
                    }
                    aria-label="Imagem anterior"
                  >
                    <ChevronLeft htmlColor="#fff" />
                  </IconButton>
                  <IconButton
                    className={classes.cardProcLightboxNav}
                    style={{ right: 8 }}
                    onClick={() =>
                      setCardProcLightbox((lb) => {
                        if (!lb?.images?.length) return lb;
                        const n = lb.images.length;
                        return { ...lb, index: (lb.index + 1) % n };
                      })
                    }
                    aria-label="Imagem seguinte"
                  >
                    <ChevronRight htmlColor="#fff" />
                  </IconButton>
                </>
              )}
              <Typography
                variant="caption"
                style={{ display: "block", textAlign: "center", color: "#aaa", marginTop: 6 }}
              >
                {cardProcLightbox.index + 1} / {cardProcLightbox.images.length}
                {cardProcLightbox.images[cardProcLightbox.index]?.name
                  ? ` — ${cardProcLightbox.images[cardProcLightbox.index].name}`
                  : ""}
              </Typography>
            </>
          )}
        </div>
      </Dialog>

      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={handleCloseNewTicketModal}
        quadroGroupId={selectedQuadroGroupId}
        kanbanLaneId={newTicketModalLaneId}
        onTicketCreated={afterKanbanTicketCreated}
      />

      {editColumnTag && (
        <TagModal
          open={!!editColumnTag}
          onClose={handleCloseTagModal}
          tagId={editColumnTag.id}
          kanban={1}
          quadroGroupId={
            editColumnTag.quadroGroupId != null
              ? editColumnTag.quadroGroupId
              : selectedQuadroGroupId
          }
        />
      )}

      <QuadroModal
        open={quadroModalOpen}
        onClose={() => {
          setQuadroModalOpen(false);
          setQuadroModalTicketUuid(null);
        }}
        ticketUuid={quadroModalTicketUuid}
        readOnly={quadroModalReadOnly}
        quadroGroupId={selectedQuadroGroupId}
        quadroGroupName={quadroGroups.find((g) => String(g.id) === String(selectedQuadroGroupId))?.name}
        onOpenChat={(uuid) => {
          if (!uuid) return;
          setQuadroModalOpen(false);
          setQuadroModalTicketUuid(null);
          setChatModalTicketUuid(uuid);
          setChatModalOpen(true);
        }}
        onQuadroUpdated={fetchTickets}
        onOpenMove={(t) => {
          if (!t) return;
          setQuadroModalOpen(false);
          setMoveModalTicket(t);
          setMoveModalTargetGroupId("");
          setMoveModalTargetTagId("");
          setMoveModalTargetUserId("");
          setMoveModalOpen(true);
        }}
        onOpenShare={(t) => {
          if (!t) return;
          setShareModalTicket(t);
          const shared = t.quadroSharedGroupIds || t.sharedQuadroGroupIds || [];
          const otherIds = quadroGroups.map((g) => String(g.id)).filter((id) => id !== String(selectedQuadroGroupId));
          setShareModalSelectedIds(shared.map(String).filter((id) => otherIds.includes(id)));
          setShareModalLinkType(t.quadroLinkType === "unlinked" ? "unlinked" : "linked");
          setShareModalStagesByGroup(normalizeSharedStagesByGroup(t.quadroSharedStagesByGroup));
      shareModalTagsRequestedRef.current = new Set();
      setShareModalTagsByGroup({});
      setShareModalOpen(true);
        }}
      />

      <KanbanChatModal
        open={chatModalOpen}
        onClose={() => {
          setChatModalOpen(false);
          setChatModalTicketUuid(null);
        }}
        ticketUuid={chatModalTicketUuid}
        onVerQuadro={(uuid) => {
          setQuadroModalTicketUuid(uuid);
          setQuadroModalReadOnly(true);
          setQuadroModalOpen(true);
        }}
      />

      <Dialog open={shareModalOpen} onClose={handleCloseShareModal} maxWidth="sm" fullWidth>
        <DialogTitle>Compartilhar com outras áreas</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 12 }}>
            O card aparecerá nas áreas marcadas. Em cada área, escolha em quais etapas (colunas daquele quadro) ele deve aparecer e se o vínculo com o quadro base deve ser mantido.
          </Typography>
          {shareModalTicket && (
            <Paper variant="outlined" style={{ padding: 12, marginBottom: 16, backgroundColor: "#fafafa" }}>
              <Typography variant="caption" color="textSecondary" component="div">
                <strong>Área de trabalho atual:</strong>{" "}
                {quadroGroups.find((x) => String(x.id) === String(selectedQuadroGroupId))?.name || "—"}
              </Typography>
              <Typography variant="caption" color="textSecondary" component="div" style={{ marginTop: 4 }}>
                <strong>Etapa nesta área:</strong>{" "}
                {shareModalTicket.tags?.[0]?.name || "Sem etapa (Em aberto)"}
              </Typography>
            </Paper>
          )}
          {otherGroups.length === 0 ? (
            <Typography variant="body2" color="textSecondary">Não há outras áreas configuradas.</Typography>
          ) : (
            <>
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Outras áreas e etapas</Typography>
              <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
                Cada quadro tem suas próprias colunas. As opções abaixo são sempre as etapas da área indicada, não as do quadro que você está vendo agora.
              </Typography>
              <div style={{ marginBottom: 16 }}>
                {otherGroups.map((g) => {
                  const gid = String(g.id);
                  const selected = shareModalSelectedIds.includes(gid);
                  const colOptsLoaded = Object.prototype.hasOwnProperty.call(shareModalTagsByGroup, gid);
                  const colOpts = shareModalTagsByGroup[gid];
                  const loadingCols = selected && !colOptsLoaded;
                  const stageSel = shareModalStagesByGroup[gid] || [];
                  const stageLabel =
                    !selected || loadingCols
                      ? null
                      : !colOpts || colOpts.length === 0
                        ? "Nenhuma coluna cadastrada neste quadro — crie em Tags do Kanban."
                        : stageSel.length === 0
                          ? "Nesta área o card pode aparecer em qualquer coluna (nenhuma etapa específica selecionada)."
                          : `Nesta área o card aparecerá nestas etapas: ${stageSel
                              .map((id) => colOpts.find((t) => String(t.id) === String(id))?.name || `#${id}`)
                              .filter(Boolean)
                              .join(", ")}.`;
                  return (
                    <Paper key={g.id} variant="outlined" style={{ marginBottom: 12, padding: "10px 12px" }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={selected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setShareModalSelectedIds((prev) => [...prev, gid]);
                              } else {
                                setShareModalSelectedIds((prev) => prev.filter((id) => id !== gid));
                                setShareModalStagesByGroup((prev) => {
                                  const next = { ...prev };
                                  delete next[gid];
                                  return next;
                                });
                              }
                            }}
                          />
                        }
                        label={<Typography variant="body2" style={{ fontWeight: 600 }}>{g.name}</Typography>}
                      />
                      {selected && (
                        <div style={{ marginLeft: 32, marginTop: 4 }}>
                          {loadingCols && (
                            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
                              Carregando etapas do quadro «{g.name}»…
                            </Typography>
                          )}
                          {!loadingCols && stageLabel && (
                            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8, lineHeight: 1.4 }}>
                              {stageLabel}
                            </Typography>
                          )}
                          {!loadingCols && colOpts && colOpts.length > 0 && (
                            <FormControl size="small" fullWidth style={{ maxWidth: "100%" }}>
                              <InputLabel id={`share-stages-${gid}`}>Etapas nesta área</InputLabel>
                              <Select
                                labelId={`share-stages-${gid}`}
                                multiple
                                value={stageSel}
                                onChange={(e) =>
                                  setShareModalStagesByGroup((prev) => ({
                                    ...prev,
                                    [gid]: typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value,
                                  }))
                                }
                                renderValue={(sel) =>
                                  !sel || sel.length === 0
                                    ? "Todas as etapas deste quadro"
                                    : sel
                                        .map((id) => colOpts.find((t) => String(t.id) === String(id))?.name || `#${id}`)
                                        .filter(Boolean)
                                        .join(", ")
                                }
                                label="Etapas nesta área"
                              >
                                {colOpts.map((tag) => (
                                  <MenuItem key={tag.id} value={String(tag.id)}>
                                    {tag.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          )}
                        </div>
                      )}
                    </Paper>
                  );
                })}
              </div>
              <Typography variant="subtitle2" style={{ marginBottom: 8 }}>Vínculo</Typography>
              <RadioGroup value={shareModalLinkType} onChange={(e) => setShareModalLinkType(e.target.value)}>
                <FormControlLabel
                  value="linked"
                  control={<Radio />}
                  label={
                    <span>
                      <strong>Manter vinculado</strong> — Alterações no quadro base refletem em todos os cards compartilhados (e vice-versa), com histórico de onde foi alterado (ex.: Produção, Financeiro).
                    </span>
                  }
                />
                <FormControlLabel
                  value="unlinked"
                  control={<Radio />}
                  label={
                    <span>
                      <strong>Desvincular ao compartilhar</strong> — Cada área pode alterar o quadro independentemente; as informações não ficam espelhadas.
                    </span>
                  }
                />
              </RadioGroup>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseShareModal}>Cancelar</Button>
          <Button onClick={handleShareSave} color="primary" variant="contained" disabled={shareModalSaving}>
            {shareModalSaving ? "Salvando…" : "Salvar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Mover: move o ticket para outra área/etapa/atendente (some do quadro atual) */}
      <Dialog open={moveModalOpen} onClose={handleCloseMoveModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SwapHoriz fontSize="small" />
            Mover ticket
          </div>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            O ticket sairá desta área e aparecerá apenas no destino escolhido (outra área de trabalho, etapa ou atendente).
          </Typography>
          <FormControl fullWidth size="small" style={{ marginBottom: 16 }}>
            <InputLabel>Área de destino *</InputLabel>
            <Select
              value={moveModalTargetGroupId}
              onChange={(e) => {
                setMoveModalTargetGroupId(e.target.value);
                setMoveModalTargetTagId("");
              }}
              label="Área de destino *"
            >
              <MenuItem value="">— Selecione —</MenuItem>
              {quadroGroups.filter((g) => String(g.id) !== String(selectedQuadroGroupId)).map((g) => (
                <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>
              ))}
            </Select>
            {quadroGroups.filter((g) => String(g.id) !== String(selectedQuadroGroupId)).length === 0 && (
              <Typography variant="caption" color="textSecondary" style={{ marginTop: 4 }}>Crie outra área em Áreas de Trabalho para mover o ticket.</Typography>
            )}
          </FormControl>
          <FormControl fullWidth size="small" style={{ marginBottom: 16 }}>
            <InputLabel>Etapa (opcional)</InputLabel>
            <Select
              value={moveModalTargetTagId}
              onChange={(e) => setMoveModalTargetTagId(e.target.value)}
              label="Etapa (opcional)"
            >
              <MenuItem value="">— Nenhuma (Em aberto) —</MenuItem>
              {moveModalTargetTags.map((tag) => (
                <MenuItem key={tag.id} value={String(tag.id)}>{tag.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Atendente (opcional)</InputLabel>
            <Select
              value={moveModalTargetUserId}
              onChange={(e) => setMoveModalTargetUserId(e.target.value)}
              label="Atendente (opcional)"
            >
              <MenuItem value="">— Nenhum —</MenuItem>
              {usersList.map((u) => (
                <MenuItem key={u.id} value={String(u.id)}>{u.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMoveModal}>Cancelar</Button>
          <Button onClick={handleMoveSave} color="primary" variant="contained" disabled={moveModalSaving || !moveModalTargetGroupId}>
            {moveModalSaving ? "Movendo…" : "Mover"}
          </Button>
        </DialogActions>
      </Dialog>

      {renderWorkspaceManagerDialog()}
      {renderDeleteWorkspaceDialog()}
      {renderDeleteCardDialog()}

      {/* Gerenciador de Status Personalizados */}
      <Dialog
        open={statusManagerOpen}
        onClose={() => { setStatusManagerOpen(false); handleCancelEditStatus(); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Settings fontSize="small" />
            Gerenciar Status Personalizados
          </div>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            Crie, edite ou remova status para adaptar o quadro ao seu processo de trabalho.
          </Typography>

          {customStatuses.length === 0 && (
            <Paper variant="outlined" style={{ padding: 16, marginBottom: 16, textAlign: "center" }}>
              <Typography variant="body2" color="textSecondary">
                Nenhum status personalizado criado ainda. Os status padrão estão sendo usados (Entregue, Em produção, Aguardando, Cancelado).
              </Typography>
            </Paper>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {customStatuses.map((s, idx) => (
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
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: s.color,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" style={{ flex: 1, fontWeight: 500 }}>
                  {s.label}
                </Typography>
                <Typography variant="caption" color="textSecondary" style={{ marginRight: 8 }}>
                  {s.value}
                </Typography>
                <IconButton size="small" onClick={() => handleEditStatusStart(idx)} title="Editar">
                  <Edit style={{ fontSize: 16 }} />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteStatus(idx)} title="Excluir" style={{ color: "#d32f2f" }}>
                  <Delete style={{ fontSize: 16 }} />
                </IconButton>
              </Paper>
            ))}
          </div>

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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setStatusManagerOpen(false); handleCancelEditStatus(); }}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Kanban;
