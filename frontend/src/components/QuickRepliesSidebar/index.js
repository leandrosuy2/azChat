import React, { useState, useEffect, useCallback, useMemo, useContext, useRef } from "react";
import clsx from "clsx";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import SendIcon from "@material-ui/icons/Send";
import VisibilityIcon from "@material-ui/icons/Visibility";
import MoreVertIcon from "@material-ui/icons/MoreVert";
import AppsIcon from "@material-ui/icons/Apps";
import AddIcon from "@material-ui/icons/Add";
import CloseIcon from "@material-ui/icons/Close";
import KeyboardArrowDownIcon from "@material-ui/icons/KeyboardArrowDown";
import FileCopyOutlinedIcon from "@material-ui/icons/FileCopyOutlined";
import EditIcon from "@material-ui/icons/Edit";
import EventIcon from "@material-ui/icons/Event";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import DragIndicatorIcon from "@material-ui/icons/DragIndicator";
import ChatBubbleOutlineIcon from "@material-ui/icons/ChatBubbleOutline";
import formatQuickMessageTemplate from "../../utils/formatQuickMessageTemplate";
import { quickMessageSnippet } from "../../utils/quickMessageSequence";
import useQuickMessages from "../../hooks/useQuickMessages";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import SidebarQuickMessageEditorModal from "./SidebarQuickMessageEditorModal";
import SidebarQuickMessagesLibraryModal from "./SidebarQuickMessagesLibraryModal";
import SidebarQuickReplyPreviewModal from "./SidebarQuickReplyPreviewModal";
import QuickReplySidebarScheduleDialog from "./QuickReplySidebarScheduleDialog";

const UNCATEGORIZED_KEY = "__sem_categoria__";

const contrastTextOn = (hexColor) => {
  const hex = String(hexColor || "#546E7A").replace("#", "");
  if (hex.length < 6) return "#fff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1a1a1a" : "#ffffff";
};

/** Tipos ao criar nova resposta (menu no botão +, sem modal). */
const NEW_REPLY_KINDS = [
  "text",
  "image",
  "video",
  "audio",
  "document",
  "pix",
  "group",
  "contact",
  "linkBanner",
  "sticker",
  "list",
];

const inferMediaKind = (mediaPath) => {
  if (!mediaPath) return "text";
  const u = String(mediaPath).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return "image";
  if (/\.(mp4|webm|3gp|mov)(\?|$)/i.test(u)) return "video";
  if (/\.pdf(\?|$)/i.test(u)) return "pdf";
  return "file";
};

const mediaBasename = (mediaPath) => {
  if (!mediaPath) return null;
  const clean = String(mediaPath).split("?")[0];
  const parts = clean.split("/").filter(Boolean);
  const last = parts.pop();
  return last ? last.replace(/ /g, "_") : null;
};

const useStyles = makeStyles((theme) => ({
  root: {
    position: "relative",
    width: 320,
    flexShrink: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    minHeight: 0,
    transition: theme.transitions.create(["width", "opacity"], {
      duration: theme.transitions.duration.shorter,
    }),
  },
  rootCollapsed: {
    width: 0,
    opacity: 0,
    overflow: "hidden",
    borderRight: "none",
  },
  rootInDrawer: {
    position: "relative",
    width: "100%",
    height: "100%",
    maxHeight: "100%",
    borderRight: "none",
  },
  surfaceOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    display: "flex",
    flexDirection: "column",
    backgroundColor: theme.palette.background.paper,
    overflow: "hidden",
  },
  header: {
    padding: theme.spacing(0.75, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    marginBottom: theme.spacing(1),
  },
  searchField: {
    flex: 1,
    minWidth: 0,
    "& .MuiOutlinedInput-input": {
      fontSize: "0.8125rem",
      padding: "7px 10px",
    },
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.5),
    alignItems: "center",
  },
  chip: {
    fontWeight: 600,
    fontSize: "0.625rem",
    height: 24,
    borderRadius: 6,
    "& .MuiChip-label": {
      paddingLeft: 8,
      paddingRight: 8,
    },
  },
  chipInactive: {
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.08)"
        : "rgba(0, 150, 136, 0.12)",
    color: theme.palette.type === "dark" ? theme.palette.text.primary : "#00695c",
    border: "none",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.12)"
          : "rgba(0, 150, 136, 0.2)",
    },
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  accordionSummary: {
    minHeight: 36,
    borderLeftWidth: 3,
    borderLeftStyle: "solid",
    paddingLeft: theme.spacing(2.25),
    paddingRight: theme.spacing(1.25),
    borderRadius: 4,
    marginBottom: 2,
    "& .MuiAccordionSummary-content": {
      margin: "8px 0",
      marginRight: theme.spacing(0.5),
    },
  },
  accordionExpandIcon: {
    padding: theme.spacing(0.5),
  },
  categoryTitle: {
    fontWeight: 700,
    fontSize: "0.7rem",
    lineHeight: 1.2,
    letterSpacing: "0.04em",
    paddingLeft: theme.spacing(0.5),
  },
  itemRow: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.75, 0.75),
    marginBottom: theme.spacing(0.5),
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`,
  },
  itemRowTop: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.25),
    minWidth: 0,
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    marginLeft: "auto",
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  inlineEditField: {
    marginTop: theme.spacing(0.25),
    "& .MuiOutlinedInput-input": {
      fontSize: "0.72rem",
      padding: "6px 8px",
    },
  },
  shortcode: {
    fontWeight: 700,
    fontSize: "0.72rem",
    letterSpacing: "0.02em",
    lineHeight: 1.25,
  },
  snippet: {
    fontSize: "0.65rem",
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    lineHeight: 1.25,
  },
  meta: {
    fontSize: "0.6rem",
    color: theme.palette.text.secondary,
    marginTop: 1,
    lineHeight: 1.2,
  },
  menuHeader: {
    padding: theme.spacing(0.5, 1.25, 0.25),
    pointerEvents: "none",
  },
  menuTitle: {
    fontWeight: 700,
    fontSize: "0.75rem",
    marginLeft: 6,
    lineHeight: 1.2,
  },
  menuItemDense: {
    minHeight: 40,
    paddingTop: 4,
    paddingBottom: 4,
    fontSize: "0.75rem",
  },
  menuPrimary: {
    fontSize: "0.75rem",
    lineHeight: 1.25,
  },
  menuItemIcon: {
    minWidth: 34,
  },
  emptyText: {
    fontSize: "0.75rem",
  },
  filterMenuItem: {
    fontSize: "0.75rem",
    minHeight: 36,
    paddingTop: 4,
    paddingBottom: 4,
  },
  categoryDropRoot: {
    borderRadius: 4,
    transition: "box-shadow 120ms ease",
  },
  categoryDropActive: {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
  },
  dragHandle: {
    cursor: "grab",
    display: "flex",
    alignItems: "flex-start",
    paddingTop: 2,
    marginRight: 2,
    color: theme.palette.text.secondary,
    flexShrink: 0,
    "&:active": {
      cursor: "grabbing",
    },
  },
  itemRowDragging: {
    opacity: 0.55,
  },
}));

const QuickRepliesSidebar = ({
  open,
  ticket,
  contact,
  quickReplyHandlersRef,
  onClose,
  draftQuickMessage,
  onDraftQuickMessageConsumed,
}) => {
  const classes = useStyles();
  const { user, socket } = useContext(AuthContext);
  const { list: listQuickMessages, deleteRecord, update: updateQuickMessage } = useQuickMessages();

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  /** all | popular | noCategory | type | category */
  const [filterMode, setFilterMode] = useState("all");
  const [filterTypeKind, setFilterTypeKind] = useState("text");
  const [filterCategoryKey, setFilterCategoryKey] = useState(null);
  const [expandedCats, setExpandedCats] = useState(() => new Set());
  const [preview, setPreview] = useState(null);

  const [typeMenuAnchor, setTypeMenuAnchor] = useState(null);
  const [categoryMenuAnchor, setCategoryMenuAnchor] = useState(null);
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  const [rowMenuMessage, setRowMenuMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorQuickId, setEditorQuickId] = useState(null);
  const [editorCreationKind, setEditorCreationKind] = useState(null);
  const [createMenuAnchor, setCreateMenuAnchor] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDefaultBody, setScheduleDefaultBody] = useState("");
  const [draggingMessageId, setDraggingMessageId] = useState(null);
  const [dragOverCategoryKey, setDragOverCategoryKey] = useState(null);
  const draggingMessageIdRef = useRef(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineEditValue, setInlineEditValue] = useState("");
  const [inlineEditSaving, setInlineEditSaving] = useState(false);
  const [editorInitialMessage, setEditorInitialMessage] = useState("");

  const load = useCallback(async () => {
    if (!user?.companyId) return;
    try {
      const data = await listQuickMessages({
        companyId: user.companyId,
        userId: user.id,
      });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    }
  }, [listQuickMessages, user?.companyId, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const body =
      draftQuickMessage?.message != null
        ? String(draftQuickMessage.message).trim()
        : "";
    if (!body) return;
    setEditorCreationKind("text");
    setEditorQuickId(null);
    setEditorInitialMessage(body);
    setEditorOpen(true);
    onDraftQuickMessageConsumed?.();
  }, [draftQuickMessage, onDraftQuickMessageConsumed]);

  useEffect(() => {
    if (!user?.companyId || !socket) return undefined;
    const ev = `company-${user.companyId}-quickmessage`;
    const onMsg = () => load();
    socket.on(ev, onMsg);
    return () => socket.off(ev, onMsg);
  }, [socket, user?.companyId, load]);

  const baseItems = useMemo(
    () => items.filter((m) => m.useInSlash !== false),
    [items]
  );

  const categoryOptions = useMemo(() => {
    const map = new Map();
    baseItems.forEach((m) => {
      const raw = (m.category || "").trim();
      const key = raw || UNCATEGORIZED_KEY;
      const label = raw || i18n.t("messagesInput.quickReplies.uncategorized");
      const color = m.categoryColor || "#546E7A";
      if (!map.has(key)) map.set(key, { key, label, color });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "pt")
    );
  }, [baseItems]);

  const filtered = useMemo(() => {
    let rows = baseItems.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((m) => {
        const t = `${m.shortcode || ""} ${m.message || ""}`.toLowerCase();
        return t.includes(q);
      });
    }
    if (filterMode === "popular") {
      rows = rows.filter((m) => (m.useCount || 0) > 0);
      rows.sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
    } else if (filterMode === "noCategory") {
      rows = rows.filter((m) => !(m.category || "").trim());
    } else if (filterMode === "type") {
      rows = rows.filter((m) => inferMediaKind(m.mediaPath) === filterTypeKind);
    } else if (filterMode === "category" && filterCategoryKey) {
      rows = rows.filter((m) => {
        const raw = (m.category || "").trim();
        const key = raw || UNCATEGORIZED_KEY;
        return key === filterCategoryKey;
      });
    }
    return rows;
  }, [baseItems, search, filterMode, filterTypeKind, filterCategoryKey]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((m) => {
      const raw = (m.category || "").trim();
      const key = raw || UNCATEGORIZED_KEY;
      const label = raw || i18n.t("messagesInput.quickReplies.uncategorized");
      const color = m.categoryColor || "#546E7A";
      if (!map.has(key)) {
        map.set(key, { key, label, color, items: [] });
      }
      map.get(key).items.push(m);
    });
    const list = Array.from(map.values());
    list.sort((a, b) => a.label.localeCompare(b.label, "pt"));
    return list;
  }, [filtered]);

  const groupedKeySig = grouped.map((g) => g.key).join("|");
  useEffect(() => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      grouped.forEach((g) => next.add(g.key));
      return next;
    });
  }, [groupedKeySig]);

  const handleAccordion = (key) => (_e, isExpanded) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (isExpanded) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleSend = async (m, e) => {
    const composeOnly = e?.ctrlKey || e?.metaKey;
    const fn = quickReplyHandlersRef?.current?.sendQuickReply;
    if (typeof fn !== "function") {
      toast.warning(
        "Não foi possível enviar: o chat ainda não está pronto. Aguarde o carregamento ou recarregue a página."
      );
      return;
    }
    try {
      await fn(m, { composeOnly });
    } catch (err) {
      toastError(err);
    }
  };

  const openPreview = (m) => setPreview(m);
  const closePreview = () => setPreview(null);

  const handlePickNewCreationKind = (kind) => {
    setCreateMenuAnchor(null);
    setEditorCreationKind(kind || "text");
    setEditorQuickId(null);
    setEditorOpen(true);
  };

  const openEditExisting = (id) => {
    setEditorCreationKind(null);
    setEditorQuickId(Number(id));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorQuickId(null);
    setEditorCreationKind(null);
    setEditorInitialMessage("");
  };

  const openScheduleFromMessage = (m) => {
    const text = formatQuickMessageTemplate(m.message || "", { ticket, contact, user });
    const mediaNote = m.mediaPath
      ? `\n[${i18n.t("messagesInput.quickReplies.attachment")}: ${m.mediaName || ""}]`
      : "";
    setScheduleDefaultBody(`${text}${mediaNote}`.trim());
    setScheduleOpen(true);
  };

  const closeRowMenu = () => {
    setRowMenuAnchor(null);
    setRowMenuMessage(null);
  };

  const buildQuickMessagePayload = (m, overrides = {}) => {
    const hasMedia = Boolean(m.mediaPath);
    return {
      id: m.id,
      shortcode: m.shortcode || "",
      message: m.message != null ? String(m.message) : "",
      geral: Boolean(m.geral),
      visao: Boolean(m.visao),
      category: (m.category || "").trim() || null,
      categoryColor: m.categoryColor || null,
      isFavorite: Boolean(m.isFavorite),
      autoSend: m.autoSend !== false,
      useInSlash: m.useInSlash !== false,
      isMedia: hasMedia,
      mediaPath: hasMedia ? mediaBasename(m.mediaPath) : null,
      mediaName: m.mediaName || null,
      ...overrides,
    };
  };

  const saveInlineEdit = async (m) => {
    if (inlineEditSaving) return;
    const trimmed = String(inlineEditValue || "").trim();
    const hasMedia = Boolean(m.mediaPath);
    if (!hasMedia && trimmed.length < 3) {
      toast.warning("A mensagem deve ter pelo menos 3 caracteres.");
      return;
    }
    setInlineEditSaving(true);
    try {
      await updateQuickMessage(
        buildQuickMessagePayload(m, { message: inlineEditValue })
      );
      toast.success(i18n.t("messagesInput.quickReplies.inlineEditSaved"));
      setInlineEditId(null);
      load();
    } catch (err) {
      toastError(err);
    } finally {
      setInlineEditSaving(false);
    }
  };

  const startInlineEdit = (m) => {
    setInlineEditId(m.id);
    setInlineEditValue(m.message != null ? String(m.message) : "");
  };

  const handleDuplicate = async (m) => {
    try {
      const { data: src } = await api.get(`/quick-messages/${m.id}`);
      const suffix = Date.now().toString(36).slice(-5);
      const newShort = `${String(src.shortcode || "msg").replace(/\s/g, "_")}_c_${suffix}`;
      const hasMedia = Boolean(src.mediaPath);
      const msgRaw = String(src.message || "").trim();
      const messageBody =
        hasMedia || msgRaw.length >= 3 ? String(src.message || "") : "…";

      const body = {
        shortcode: newShort,
        message: messageBody,
        geral: Boolean(src.geral),
        visao: Boolean(src.visao),
        category: src.category || null,
        categoryColor: src.categoryColor || null,
        isFavorite: Boolean(src.isFavorite),
        autoSend: src.autoSend !== false,
        useInSlash: src.useInSlash !== false,
        isMedia: hasMedia,
        mediaPath: hasMedia ? mediaBasename(src.mediaPath) : null,
        mediaName: src.mediaName || null,
      };
      await api.post("/quick-messages", body);
      toast.success(i18n.t("messagesInput.quickReplies.duplicateSuccess"));
      load();
    } catch (err) {
      toastError(err);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteRecord(deleteTarget.id);
      load();
      toast.success(i18n.t("quickMessages.toasts.deleted"));
    } catch (err) {
      toastError(err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const clearCategoryDragUi = useCallback(() => {
    draggingMessageIdRef.current = null;
    setDraggingMessageId(null);
    setDragOverCategoryKey(null);
  }, []);

  const handleQuickMessageDragStart = useCallback((e, m) => {
    e.stopPropagation();
    const idStr = String(m.id);
    try {
      e.dataTransfer.setData("application/x-primata-quick-msg", idStr);
    } catch {
      /* ignore */
    }
    e.dataTransfer.setData("text/plain", idStr);
    e.dataTransfer.effectAllowed = "move";
    draggingMessageIdRef.current = m.id;
    setDraggingMessageId(m.id);
  }, []);

  const handleCategoryDragOver = useCallback((e, catKey) => {
    if (draggingMessageIdRef.current == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCategoryKey(catKey);
  }, []);

  const handleCategoryDragLeave = useCallback((e, catKey) => {
    const rel = e.relatedTarget;
    if (rel && e.currentTarget.contains(rel)) return;
    setDragOverCategoryKey((prev) => (prev === catKey ? null : prev));
  }, []);

  const handleCategoryDrop = useCallback(
    async (e, cat) => {
      e.preventDefault();
      e.stopPropagation();
      const rawId =
        e.dataTransfer.getData("application/x-primata-quick-msg") ||
        e.dataTransfer.getData("text/plain");
      clearCategoryDragUi();
      const id = Number(rawId);
      if (!Number.isFinite(id)) return;
      const m = items.find((x) => Number(x.id) === id);
      if (!m) return;
      const fromKey = (m.category || "").trim() || UNCATEGORIZED_KEY;
      if (fromKey === cat.key) return;

      const newCategory = cat.key === UNCATEGORIZED_KEY ? null : String(cat.key);
      const newColor =
        cat.key === UNCATEGORIZED_KEY ? null : cat.color || "#546E7A";

      try {
        await updateQuickMessage(
          buildQuickMessagePayload(m, {
            category: newCategory,
            categoryColor: newColor,
          })
        );
        toast.success(i18n.t("messagesInput.quickReplies.categoryMoved"));
        load();
      } catch (err) {
        toastError(err);
      }
    },
    [items, updateQuickMessage, load, clearCategoryDragUi]
  );

  const inDrawer = typeof onClose === "function";
  const collapsed = !inDrawer && !open;

  const chipProps = (active) => ({
    size: "small",
    className: clsx(classes.chip, !active && classes.chipInactive),
    color: active ? "primary" : "default",
    variant: active ? "default" : "default",
  });

  const typeKindLabels = {
    text: i18n.t("messagesInput.quickReplies.typeText"),
    image: i18n.t("messagesInput.quickReplies.typeImage"),
    video: i18n.t("messagesInput.quickReplies.typeVideo"),
    pdf: i18n.t("messagesInput.quickReplies.typePdf"),
    file: i18n.t("messagesInput.quickReplies.typeFile"),
  };

  return (
    <Box
      className={clsx(
        classes.root,
        collapsed && classes.rootCollapsed,
        inDrawer && classes.rootInDrawer
      )}
    >
      <Box className={classes.header}>
        <Box className={classes.searchRow}>
          <TextField
            className={classes.searchField}
            size="small"
            fullWidth
            variant="outlined"
            placeholder={i18n.t("messagesInput.quickReplies.searchPlaceholder")}
            value={search}
            onChange={(ev) => setSearch(ev.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" style={{ marginRight: -4 }}>
                  {inDrawer && (
                    <Tooltip title={i18n.t("messagesInput.quickReplies.hidePanel")}>
                      <IconButton
                        size="small"
                        onClick={onClose}
                        aria-label="close quick replies"
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title={i18n.t("messagesInput.quickReplies.tooltipOpenGrid")}>
                    <IconButton
                      size="small"
                      onClick={() => setLibraryOpen(true)}
                      aria-label="open quick replies library"
                    >
                      <AppsIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={i18n.t("messagesInput.quickReplies.tooltipAdd")}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateMenuAnchor(e.currentTarget);
                      }}
                      aria-label="new quick reply"
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
            }}
          />
          <Menu
            anchorEl={createMenuAnchor}
            keepMounted
            open={Boolean(createMenuAnchor)}
            onClose={() => setCreateMenuAnchor(null)}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            PaperProps={{ style: { maxHeight: 420 } }}
          >
            {NEW_REPLY_KINDS.map((k) => (
              <MenuItem
                key={k}
                dense
                className={classes.filterMenuItem}
                onClick={() => handlePickNewCreationKind(k)}
              >
                {i18n.t(`messagesInput.quickReplies.createTypes.${k}`)}
              </MenuItem>
            ))}
          </Menu>
        </Box>

        <Box className={classes.filters}>
          <Chip
            {...chipProps(filterMode === "all")}
            label={i18n.t("messagesInput.quickReplies.filterAll")}
            onClick={() => {
              setFilterMode("all");
              setFilterCategoryKey(null);
            }}
          />
          <Chip
            {...chipProps(filterMode === "type")}
            label={i18n.t("messagesInput.quickReplies.filterByType")}
            onClick={(e) => setTypeMenuAnchor(e.currentTarget)}
            onDelete={(e) => {
              e.stopPropagation();
              setTypeMenuAnchor(e.currentTarget);
            }}
            deleteIcon={<KeyboardArrowDownIcon />}
          />
          <Menu
            anchorEl={typeMenuAnchor}
            keepMounted
            open={Boolean(typeMenuAnchor)}
            onClose={() => setTypeMenuAnchor(null)}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            {["text", "image", "video", "pdf", "file"].map((k) => (
              <MenuItem
                key={k}
                dense
                className={classes.filterMenuItem}
                selected={filterMode === "type" && filterTypeKind === k}
                onClick={() => {
                  setFilterMode("type");
                  setFilterTypeKind(k);
                  setFilterCategoryKey(null);
                  setTypeMenuAnchor(null);
                }}
              >
                {typeKindLabels[k]}
              </MenuItem>
            ))}
          </Menu>

          <Chip
            {...chipProps(filterMode === "noCategory")}
            label={i18n.t("messagesInput.quickReplies.filterNoCategory")}
            onClick={() => {
              setFilterMode("noCategory");
              setFilterCategoryKey(null);
            }}
          />
          <Chip
            {...chipProps(filterMode === "category" && Boolean(filterCategoryKey))}
            label={i18n.t("messagesInput.quickReplies.filterByCategory")}
            onClick={(e) => setCategoryMenuAnchor(e.currentTarget)}
            onDelete={(e) => {
              e.stopPropagation();
              setCategoryMenuAnchor(e.currentTarget);
            }}
            deleteIcon={<KeyboardArrowDownIcon />}
          />
          <Menu
            anchorEl={categoryMenuAnchor}
            keepMounted
            open={Boolean(categoryMenuAnchor)}
            onClose={() => setCategoryMenuAnchor(null)}
            PaperProps={{ style: { maxHeight: 320 } }}
          >
            {categoryOptions.map((c) => (
              <MenuItem
                key={c.key}
                dense
                className={classes.filterMenuItem}
                selected={filterMode === "category" && filterCategoryKey === c.key}
                onClick={() => {
                  setFilterMode("category");
                  setFilterCategoryKey(c.key);
                  setCategoryMenuAnchor(null);
                }}
              >
                <span style={{ borderLeft: `4px solid ${c.color}`, paddingLeft: 8 }}>
                  {c.label}
                </span>
              </MenuItem>
            ))}
          </Menu>

          <Chip
            {...chipProps(filterMode === "popular")}
            label={i18n.t("messagesInput.quickReplies.filterPopular")}
            onClick={() => {
              setFilterMode("popular");
              setFilterCategoryKey(null);
            }}
          />
        </Box>
      </Box>

      <Box className={classes.scroll}>
        {grouped.length === 0 ? (
          <Box p={2}>
            <Typography variant="body2" color="textSecondary" className={classes.emptyText}>
              {i18n.t("messagesInput.quickReplies.empty")}
            </Typography>
          </Box>
        ) : (
          grouped.map((cat) => (
            <Box
              key={cat.key}
              className={clsx(
                classes.categoryDropRoot,
                dragOverCategoryKey === cat.key &&
                  draggingMessageId != null &&
                  classes.categoryDropActive
              )}
              onDragOver={(e) => handleCategoryDragOver(e, cat.key)}
              onDragLeave={(e) => handleCategoryDragLeave(e, cat.key)}
              onDrop={(e) => handleCategoryDrop(e, cat)}
            >
            <Accordion
              expanded={expandedCats.has(cat.key)}
              onChange={handleAccordion(cat.key)}
              elevation={0}
              square
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                classes={{ expandIcon: classes.accordionExpandIcon }}
                className={classes.accordionSummary}
                style={{
                  borderLeftColor: cat.color,
                  backgroundColor: cat.color,
                  color: contrastTextOn(cat.color),
                }}
              >
                <Typography
                  component="span"
                  className={classes.categoryTitle}
                  style={{ color: "inherit" }}
                >
                  {String(cat.label).toUpperCase()}
                </Typography>
              </AccordionSummary>
              <AccordionDetails
                style={{
                  display: "block",
                  padding: "6px 8px",
                  backgroundColor: "transparent",
                  borderLeft: `4px solid ${cat.color}`,
                }}
              >
                {cat.items.map((m) => {
                  const accent = m.categoryColor || cat.color;
                  const isEditing = inlineEditId === m.id;
                  return (
                  <Box
                    key={m.id}
                    className={clsx(
                      classes.itemRow,
                      draggingMessageId === m.id && classes.itemRowDragging
                    )}
                    style={{
                      borderLeft: `4px solid ${accent}`,
                    }}
                  >
                    <Box className={classes.itemRowTop}>
                      <Tooltip title={i18n.t("messagesInput.quickReplies.tooltipDragToCategory")}>
                        <Box
                          component="span"
                          className={classes.dragHandle}
                          draggable
                          onDragStart={(e) => handleQuickMessageDragStart(e, m)}
                          onDragEnd={clearCategoryDragUi}
                        >
                          <DragIndicatorIcon fontSize="small" />
                        </Box>
                      </Tooltip>
                      <Box className={classes.itemBody}>
                        <Typography className={classes.shortcode}>
                          {m.isFavorite ? "⭐ " : ""}
                          {String(m.shortcode || "").toUpperCase()}
                        </Typography>
                      </Box>
                      <Box className={classes.itemActions}>
                        <Tooltip title={i18n.t("messagesInput.quickReplies.menuEdit")}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              isEditing ? saveInlineEdit(m) : startInlineEdit(m)
                            }
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={i18n.t("messagesInput.quickReplies.tooltipPreview")}>
                          <IconButton size="small" onClick={() => openPreview(m)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={i18n.t("messagesInput.quickReplies.tooltipSend")}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => handleSend(m, e)}
                          >
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={i18n.t("messagesInput.quickReplies.tooltipMore")}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setRowMenuAnchor(e.currentTarget);
                              setRowMenuMessage(m);
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    {isEditing ? (
                      <TextField
                        className={classes.inlineEditField}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        variant="outlined"
                        value={inlineEditValue}
                        onChange={(ev) => setInlineEditValue(ev.target.value)}
                        onBlur={() => saveInlineEdit(m)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) {
                            ev.preventDefault();
                            saveInlineEdit(m);
                          }
                          if (ev.key === "Escape") {
                            setInlineEditId(null);
                          }
                        }}
                        autoFocus
                        disabled={inlineEditSaving}
                      />
                    ) : (
                      <Typography
                        className={classes.snippet}
                        style={{ whiteSpace: "normal", cursor: "text" }}
                        onClick={() => startInlineEdit(m)}
                      >
                        {quickMessageSnippet(m.message)}
                      </Typography>
                    )}
                    <Typography className={classes.meta}>
                      {i18n.t("messagesInput.quickReplies.uses", {
                        count: m.useCount || 0,
                      })}
                    </Typography>
                  </Box>
                  );
                })}
              </AccordionDetails>
            </Accordion>
            </Box>
          ))
        )}
      </Box>

      <Menu
        anchorEl={rowMenuAnchor}
        keepMounted
        open={Boolean(rowMenuAnchor && rowMenuMessage)}
        onClose={closeRowMenu}
        PaperProps={{ style: { minWidth: 216 } }}
      >
        {rowMenuMessage && (
          <Box className={classes.menuHeader}>
            <Box display="flex" alignItems="center">
              <ChatBubbleOutlineIcon style={{ fontSize: 18 }} color="primary" />
              <Typography component="span" className={classes.menuTitle}>
                {String(rowMenuMessage.shortcode || "").toUpperCase()}
              </Typography>
            </Box>
          </Box>
        )}
        <MenuItem
          dense
          className={classes.menuItemDense}
          onClick={() => {
            if (rowMenuMessage) handleDuplicate(rowMenuMessage);
            closeRowMenu();
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <FileCopyOutlinedIcon style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary={i18n.t("messagesInput.quickReplies.menuDuplicate")}
            classes={{ primary: classes.menuPrimary }}
          />
        </MenuItem>
        <MenuItem
          dense
          className={classes.menuItemDense}
          onClick={() => {
            if (rowMenuMessage) openEditExisting(rowMenuMessage.id);
            closeRowMenu();
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <EditIcon style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary={i18n.t("messagesInput.quickReplies.menuEdit")}
            classes={{ primary: classes.menuPrimary }}
          />
        </MenuItem>
        <MenuItem
          dense
          className={classes.menuItemDense}
          onClick={() => {
            if (rowMenuMessage) openScheduleFromMessage(rowMenuMessage);
            closeRowMenu();
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <EventIcon style={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primary={i18n.t("messagesInput.quickReplies.menuSchedule")}
            classes={{ primary: classes.menuPrimary }}
          />
        </MenuItem>
        <MenuItem
          dense
          className={classes.menuItemDense}
          onClick={() => {
            if (rowMenuMessage) setDeleteTarget(rowMenuMessage);
            closeRowMenu();
          }}
        >
          <ListItemIcon className={classes.menuItemIcon}>
            <DeleteOutlineIcon style={{ fontSize: 18 }} color="error" />
          </ListItemIcon>
          <ListItemText
            primary={i18n.t("messagesInput.quickReplies.menuDelete")}
            classes={{ primary: classes.menuPrimary }}
          />
        </MenuItem>
      </Menu>

      {deleteTarget ? (
        <Box className={classes.surfaceOverlay} style={{ zIndex: 160 }}>
          <Box
            display="flex"
            flex={1}
            alignItems="center"
            justifyContent="center"
            padding={2}
            style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
          >
            <Box
              style={{
                maxWidth: 380,
                width: "100%",
                padding: 16,
                borderRadius: 8,
                backgroundColor: "inherit",
              }}
              bgcolor="background.paper"
            >
              <Typography variant="subtitle1" gutterBottom style={{ fontWeight: 700 }}>
                {i18n.t("messagesInput.quickReplies.confirmDeleteTitle")}
              </Typography>
              <Typography variant="body2" paragraph>
                {i18n.t("messagesInput.quickReplies.confirmDeleteMessage", {
                  shortcode: deleteTarget.shortcode || "",
                })}
              </Typography>
              <Box display="flex" justifyContent="flex-end" style={{ gap: 8 }}>
                <Button variant="outlined" onClick={() => setDeleteTarget(null)}>
                  {i18n.t("quickMessages.buttons.cancel")}
                </Button>
                <Button color="secondary" variant="contained" onClick={confirmDelete}>
                  {i18n.t("confirmationModal.buttons.confirm")}
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}

      {libraryOpen ? (
        <Box className={classes.surfaceOverlay} style={{ zIndex: 110 }}>
          <SidebarQuickMessagesLibraryModal
            open
            onClose={() => setLibraryOpen(false)}
            items={items.filter((m) => m.useInSlash !== false)}
            onEdit={(id) => {
              setLibraryOpen(false);
              openEditExisting(id);
            }}
            onCreate={() => {
              setLibraryOpen(false);
              handlePickNewCreationKind("text");
            }}
          />
        </Box>
      ) : null}

      {editorOpen ? (
        <Box className={classes.surfaceOverlay} style={{ zIndex: 120 }}>
          <SidebarQuickMessageEditorModal
            key={`qm-${editorQuickId ?? "new"}-${editorCreationKind || "plain"}`}
            open
            onClose={closeEditor}
            quickemessageId={editorQuickId ?? undefined}
            creationKind={editorQuickId ? null : editorCreationKind}
            initialMessage={editorQuickId ? undefined : editorInitialMessage}
            onSaved={() => {
              load();
              closeEditor();
            }}
          />
        </Box>
      ) : null}

      {scheduleOpen ? (
        <Box className={classes.surfaceOverlay} style={{ zIndex: 130 }}>
          <QuickReplySidebarScheduleDialog
            open
            onClose={() => setScheduleOpen(false)}
            ticket={ticket}
            contact={contact}
            user={user}
            defaultBody={scheduleDefaultBody}
          />
        </Box>
      ) : null}

      {preview ? (
        <Box className={classes.surfaceOverlay} style={{ zIndex: 125 }}>
          <SidebarQuickReplyPreviewModal
            open
            onClose={closePreview}
            preview={preview}
            ticket={ticket}
            contact={contact}
            user={user}
            onSend={(e) => {
              if (preview) handleSend(preview, e);
              closePreview();
            }}
          />
        </Box>
      ) : null}
    </Box>
  );
};

export default QuickRepliesSidebar;
