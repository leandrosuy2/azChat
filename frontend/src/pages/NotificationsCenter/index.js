import React, { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  Box,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  makeStyles,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@material-ui/core";
import ChatIcon from "@material-ui/icons/Chat";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import RemoveDoneIcon from "@material-ui/icons/RemoveCircleOutline";
import InboxIcon from "@material-ui/icons/Inbox";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import HelpHint from "../../components/HelpHint";

const STORAGE_KEY = "azchat_notifications_center";
const READ_STORAGE_KEY = "azchat_notifications_read_ids";
const KANBAN_KIND = "kanban_move";
const SYSTEM_KIND = "system";

const NOTIFICATION_TYPE_TABS = [
  { value: "all", label: "Todas" },
  { value: "lembrete", label: "Lembretes" },
  { value: SYSTEM_KIND, label: "Sistema" },
  { value: KANBAN_KIND, label: "Kanban" },
];

const READ_FILTERS = [
  { value: "unread", label: "Pendentes" },
  { value: "read", label: "Vistas" },
  { value: "all", label: "Todas" },
];

const TOOLBAR_HEIGHT = 48;

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    height: "calc(100vh - 48px)",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: theme.palette.background.default,
  },

  topbar: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    minHeight: 40,
  },
  typeTabs: {
    flexShrink: 0,
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    minHeight: 36,
  },
  topbarTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  topbarCounter: {
    fontSize: 12,
    fontWeight: 500,
    padding: theme.spacing(0.25, 1),
    borderRadius: 10,
    color: theme.palette.text.secondary,
    background: theme.palette.action.hover,
  },
  topbarCounterActive: {
    color: theme.palette.primary.main,
    background:
      theme.palette.type === "dark"
        ? "rgba(0,150,136,0.18)"
        : "rgba(0, 150, 136, 0.12)",
  },
  spacer: { flex: 1 },

  content: {
    flex: 1,
    minHeight: 0,
    display: "grid",
    gridTemplateColumns: "minmax(300px, 360px) minmax(0, 1fr)",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "1fr",
      gridTemplateRows: "minmax(220px, 42%) minmax(0, 1fr)",
    },
  },

  listPanel: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    borderRight: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
  },
  listToolbar: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
    minHeight: TOOLBAR_HEIGHT,
  },
  toolbarDivider: {
    width: 1,
    height: 20,
    background: theme.palette.divider,
    margin: theme.spacing(0, 0.25),
  },
  listToolbarSelection: {
    background:
      theme.palette.type === "dark"
        ? "rgba(0,150,136,0.10)"
        : "rgba(0, 150, 136, 0.06)",
  },

  segment: {
    display: "inline-flex",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    overflow: "hidden",
    background: theme.palette.background.paper,
    height: 28,
  },
  segmentBtn: {
    padding: theme.spacing(0, 1.25),
    fontSize: 12,
    lineHeight: "26px",
    cursor: "pointer",
    border: "none",
    background: "transparent",
    color: theme.palette.text.secondary,
    fontWeight: 500,
    "&:not(:last-child)": {
      borderRight: `1px solid ${theme.palette.divider}`,
    },
    "&:hover:not(:disabled)": {
      background: theme.palette.action.hover,
    },
  },
  segmentBtnActive: {
    background:
      theme.palette.type === "dark"
        ? "rgba(0,150,136,0.18)"
        : "rgba(0, 150, 136, 0.14)",
    color: theme.palette.primary.main,
    fontWeight: 600,
  },
  segmentBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },

  list: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  listItem: {
    minHeight: 56,
    paddingTop: theme.spacing(0.75),
    paddingBottom: theme.spacing(0.75),
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
    borderLeft: "3px solid transparent",
    position: "relative",
    "&::after": {
      content: '""',
      position: "absolute",
      left: theme.spacing(5.5),
      right: theme.spacing(1.5),
      bottom: 0,
      height: 1,
      background: theme.palette.divider,
      opacity: 0.5,
      pointerEvents: "none",
    },
    "&:last-child::after": {
      display: "none",
    },
    "&:hover": {
      background: theme.palette.action.hover,
      "& $rowCheckbox": { opacity: 1 },
      "& $rowDot": { opacity: 0 },
    },
  },
  listItemActive: {
    borderLeftColor: theme.palette.primary.main,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(0, 150, 136, 0.07)",
  },
  listIcon: {
    minWidth: 32,
    width: 32,
    height: 32,
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rowDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    position: "absolute",
    transition: "opacity 0.15s",
  },
  rowDotUnread: {
    background: theme.palette.primary.main,
  },
  rowDotRead: {
    background: theme.palette.action.disabled,
    opacity: 0.4,
  },
  rowCheckbox: {
    opacity: 0,
    transition: "opacity 0.15s",
    padding: 4,
    position: "absolute",
  },
  rowCheckboxOn: {
    opacity: 1,
  },
  listTitle: {
    fontSize: 13.5,
    color: theme.palette.text.primary,
    lineHeight: 1.3,
  },
  listTitleUnread: {
    fontWeight: 700,
  },
  listTitleRead: {
    fontWeight: 400,
    color: theme.palette.text.secondary,
  },
  listMeta: {
    fontSize: 11.5,
    color: theme.palette.text.secondary,
    marginTop: 2,
  },

  detailPanel: {
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: theme.palette.background.default,
  },
  detailHeader: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    minHeight: TOOLBAR_HEIGHT,
  },
  detailHeaderText: {
    minWidth: 0,
    flex: 1,
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: 600,
    lineHeight: 1.25,
    color: theme.palette.text.primary,
  },
  detailMeta: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    marginTop: 2,
    fontSize: 11.5,
    color: theme.palette.text.secondary,
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 6px",
    borderRadius: 10,
    fontSize: 11,
    fontWeight: 600,
  },
  statusBadgeUnread: {
    color: theme.palette.primary.main,
    background:
      theme.palette.type === "dark"
        ? "rgba(0,150,136,0.18)"
        : "rgba(0, 150, 136, 0.14)",
  },
  statusBadgeRead: {
    color: theme.palette.text.secondary,
    background: theme.palette.action.hover,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "currentColor",
  },
  detailActions: {
    display: "flex",
    alignItems: "center",
    gap: 2,
  },

  detailScroll: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    padding: theme.spacing(2, 2, 1.5),
  },
  bodyBox: {
    whiteSpace: "pre-wrap",
    padding: theme.spacing(1.5, 1.75),
    lineHeight: 1.55,
    fontSize: 14,
    color: theme.palette.text.primary,
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 6,
    marginBottom: theme.spacing(2),
  },
  bodyBoxError: {
    fontSize: 11.5,
    color: theme.palette.error.main,
    marginTop: theme.spacing(0.75),
    display: "block",
    paddingTop: theme.spacing(0.75),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  metaSectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.75),
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(80px, auto) minmax(0, 1fr)",
    columnGap: theme.spacing(2),
    rowGap: theme.spacing(0.5),
  },
  metaLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  metaValue: {
    fontSize: 12,
    color: theme.palette.text.primary,
    minWidth: 0,
    fontWeight: 500,
  },

  detailFooter: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    minHeight: 56,
  },
  primaryAction: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.75),
    padding: theme.spacing(0.85, 2),
    fontSize: 13.5,
    fontWeight: 600,
    color: "#fff",
    background: theme.palette.primary.main,
    borderRadius: 4,
    border: "none",
    cursor: "pointer",
    textTransform: "none",
    boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
    transition: "background 0.15s",
    "&:hover": {
      background: theme.palette.primary.dark,
    },
    "&:disabled": {
      opacity: 0.5,
      cursor: "not-allowed",
    },
  },
  footerHint: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },

  empty: {
    height: "100%",
    minHeight: 220,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    color: theme.palette.text.secondary,
    padding: theme.spacing(3),
    gap: theme.spacing(0.5),
  },
  emptyIcon: {
    fontSize: 36,
    color: theme.palette.divider,
  },
  emptyText: {
    fontSize: 13,
  },

  futureBox: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: theme.spacing(3),
  },
  futureCard: {
    maxWidth: 460,
  },
  futureTitle: {
    fontSize: 14,
    fontWeight: 600,
    marginTop: theme.spacing(1),
  },
  futureBody: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },

  iconBtnDanger: {
    color: theme.palette.error.main,
  },
}));

function isKanbanNotification(item) {
  return item?.kind === KANBAN_KIND;
}

function readStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (_) {
    return [];
  }
}

function readNotifications() {
  return readStoredNotifications().filter((item) => !isKanbanNotification(item));
}

function writeNotifications(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore */
  }
}

function readReadIds() {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.map(String) : [];
  } catch (_) {
    return [];
  }
}

function writeReadIds(list) {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(list));
  } catch (_) {
    /* ignore */
  }
}

function mergeNotifications(...groups) {
  const byId = new Map();
  groups.flat().forEach((item) => {
    if (!item?.id || isKanbanNotification(item)) return;
    byId.set(String(item.id), item);
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
}

function getDeleteEndpoint(item) {
  if (item?.kind === "lembrete" && item.disparoId) {
    return `/notifications/lembretes/${item.disparoId}`;
  }
  return null;
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min`;
  if (diffHour < 24) return `${diffHour} h`;
  if (diffDay < 7) return `${diffDay} d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const Segment = ({ options, value, onChange, classes, getLabel, ariaLabel }) => (
  <Box className={classes.segment} role="tablist" aria-label={ariaLabel}>
    {options.map((opt) => {
      const isActive = value === opt.value;
      const disabled = opt.disabled;
      return (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={isActive}
          disabled={disabled}
          className={[
            classes.segmentBtn,
            isActive ? classes.segmentBtnActive : "",
            disabled ? classes.segmentBtnDisabled : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => !disabled && onChange(opt.value)}
        >
          {getLabel ? getLabel(opt) : opt.label}
        </button>
      );
    })}
  </Box>
);

const NotificationsCenter = () => {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const selectedIdFromUrl = query.get("id");

  const [items, setItems] = useState(() => readNotifications());
  const [selectedId, setSelectedId] = useState(selectedIdFromUrl);
  const [readIds, setReadIds] = useState(() => readReadIds());
  const [activeType, setActiveType] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    let mounted = true;

    const fetchHistory = async () => {
      try {
        const lembretesRes = await api.get("/notifications/lembretes", { params: { limit: 120 } });
        if (!mounted) return;
        const serverNotifications = [...(lembretesRes.data?.notifications || [])];
        setItems((current) =>
          mergeNotifications(current, readNotifications(), serverNotifications)
        );
      } catch (err) {
        toastError(err);
      }
    };

    fetchHistory();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setItems((current) => mergeNotifications(current, readNotifications()));
    };
    refresh();
    window.addEventListener("azchat-notifications-updated", refresh);
    return () => window.removeEventListener("azchat-notifications-updated", refresh);
  }, []);

  useEffect(() => {
    if (selectedIdFromUrl) setSelectedId(selectedIdFromUrl);
  }, [selectedIdFromUrl]);

  const readSet = useMemo(() => new Set(readIds.map(String)), [readIds]);
  const isKanbanFutureTab = activeType === KANBAN_KIND;

  const counts = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.all += 1;
        if (item.kind === "lembrete") acc.lembrete += 1;
        if (item.kind === SYSTEM_KIND) acc.system += 1;
        if (readSet.has(String(item.id))) acc.read += 1;
        else acc.unread += 1;
        return acc;
      },
      { all: 0, lembrete: 0, system: 0, kanban_move: 0, read: 0, unread: 0 }
    );
  }, [items, readSet]);

  const filteredItems = useMemo(() => {
    if (isKanbanFutureTab) return [];

    return items.filter((item) => {
      const matchesType = activeType === "all" || item.kind === activeType;
      const isRead = readSet.has(String(item.id));
      const matchesRead =
        readFilter === "all" || (readFilter === "read" ? isRead : !isRead);
      return matchesType && matchesRead;
    });
  }, [items, activeType, readFilter, readSet, isKanbanFutureTab]);

  const selected = useMemo(() => {
    if (!filteredItems.length) return null;
    return (
      filteredItems.find((item) => String(item.id) === String(selectedId)) ||
      filteredItems[0]
    );
  }, [filteredItems, selectedId]);

  const selectedIdSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedIdSet.has(String(item.id))),
    [filteredItems, selectedIdSet]
  );
  const allVisibleSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIdSet.has(String(item.id)));
  const someVisibleSelected =
    filteredItems.some((item) => selectedIdSet.has(String(item.id))) && !allVisibleSelected;
  const selectedIsRead = selected ? readSet.has(String(selected.id)) : false;
  const hasSelection = selectedItems.length > 0;

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => filteredItems.some((item) => String(item.id) === String(id)))
    );
  }, [filteredItems]);

  const setReadState = (ids) => {
    const next = Array.from(new Set(ids.map(String)));
    setReadIds(next);
    writeReadIds(next);
    window.dispatchEvent(new Event("azchat-notifications-updated"));
  };

  const markItemsRead = (targetItems) => {
    if (!targetItems.length) return;
    setReadState([...readIds, ...targetItems.map((item) => item.id)]);
  };

  const markItemsUnread = (targetItems) => {
    if (!targetItems.length) return;
    const targetIds = new Set(targetItems.map((item) => String(item.id)));
    setReadState(readIds.filter((id) => !targetIds.has(String(id))));
  };

  const toggleSelectedRead = () => {
    if (!selected) return;
    if (selectedIsRead) markItemsUnread([selected]);
    else markItemsRead([selected]);
  };

  const markAllRead = () => markItemsRead(items);

  const toggleItemSelected = (itemId) => {
    setSelectedIds((current) => {
      const id = String(itemId);
      if (current.map(String).includes(id)) {
        return current.filter((currentId) => String(currentId) !== id);
      }
      return [...current, itemId];
    });
  };

  const toggleVisibleSelection = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredItems.map((item) => String(item.id)));
      setSelectedIds((current) => current.filter((id) => !visibleIds.has(String(id))));
      return;
    }
    setSelectedIds((current) =>
      Array.from(new Set([...current.map(String), ...filteredItems.map((item) => String(item.id))]))
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const removeItemsLocally = (targetItems) => {
    const idsToRemove = new Set(targetItems.map((item) => String(item.id)));
    setItems((current) => current.filter((item) => !idsToRemove.has(String(item.id))));
    writeNotifications(
      readStoredNotifications().filter((item) => !idsToRemove.has(String(item.id)))
    );
    setReadState(readIds.filter((id) => !idsToRemove.has(String(id))));
    setSelectedIds((current) => current.filter((id) => !idsToRemove.has(String(id))));
    if (selected && idsToRemove.has(String(selected.id))) {
      setSelectedId(null);
    }
  };

  const deleteItems = async (targetItems) => {
    if (!targetItems.length) return;
    const confirmed = window.confirm(
      targetItems.length === 1
        ? "Excluir esta notificação?"
        : `Excluir ${targetItems.length} notificações selecionadas?`
    );
    if (!confirmed) return;

    try {
      for (const item of targetItems) {
        const endpoint = getDeleteEndpoint(item);
        if (endpoint) await api.delete(endpoint);
      }
      removeItemsLocally(targetItems);
    } catch (err) {
      toastError(err);
    }
  };

  const openTicket = () => {
    if (!selected?.ticketId) return;
    history.push(`/tickets/${selected.ticketUuid || selected.ticketId}`);
  };

  const renderKanbanFuture = () => (
    <Box className={classes.futureBox}>
      <Box className={classes.futureCard}>
        <InboxIcon color="disabled" style={{ fontSize: 28 }} />
        <Typography className={classes.futureTitle}>Em revisão</Typography>
        <Typography className={classes.futureBody}>
          As notificações do Kanban estão pausadas até o agrupamento ser refeito.
        </Typography>
      </Box>
    </Box>
  );

  const hasContext =
    selected &&
    (selected.clientName ||
      selected.boardName ||
      selected.cardName ||
      selected.userName ||
      selected.ticketId ||
      selected.destinoTipo);

  return (
    <Box className={classes.root}>
      <Box className={classes.topbar}>
        <Box display="flex" alignItems="center">
          <Typography className={classes.topbarTitle}>Notificações</Typography>
          <HelpHint areaKey="notifications" />
        </Box>
        <span
          className={[
            classes.topbarCounter,
            counts.unread > 0 ? classes.topbarCounterActive : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {counts.unread > 0
            ? `${counts.unread} pendente${counts.unread > 1 ? "s" : ""}`
            : "tudo em dia"}
        </span>
        <Box className={classes.spacer} />
        <Tooltip title="Marcar todas como visualizadas">
          <span>
            <IconButton
              size="small"
              onClick={markAllRead}
              disabled={items.length === 0 || counts.unread === 0}
            >
              <DoneAllIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Tabs
        value={activeType}
        onChange={(_e, v) => {
          setActiveType(v);
          setSelectedId(null);
        }}
        indicatorColor="primary"
        textColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        className={classes.typeTabs}
      >
        {NOTIFICATION_TYPE_TABS.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={
              tab.value === "all"
                ? `${tab.label} (${counts.all})`
                : tab.value === "lembrete"
                  ? `${tab.label} (${counts.lembrete})`
                  : tab.value === SYSTEM_KIND
                    ? `${tab.label} (${counts.system || 0})`
                    : tab.label
            }
          />
        ))}
      </Tabs>

      <Box className={classes.content}>
        <Box className={classes.listPanel}>
          {!isKanbanFutureTab && (
            <Box
              className={[
                classes.listToolbar,
                hasSelection ? classes.listToolbarSelection : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Tooltip
                title={
                  allVisibleSelected
                    ? "Limpar seleção"
                    : someVisibleSelected
                      ? "Selecionar todas as visíveis"
                      : "Selecionar todas"
                }
              >
                <span>
                  <Checkbox
                    size="small"
                    color="primary"
                    checked={allVisibleSelected}
                    indeterminate={someVisibleSelected}
                    onChange={toggleVisibleSelection}
                    disabled={filteredItems.length === 0}
                    style={{ padding: 4 }}
                  />
                </span>
              </Tooltip>
              <span className={classes.toolbarDivider} />
              {hasSelection ? (
                <>
                  <Typography style={{ fontSize: 12, fontWeight: 600 }}>
                    {selectedItems.length} selecionada{selectedItems.length > 1 ? "s" : ""}
                  </Typography>
                  <Box className={classes.spacer} />
                  <Tooltip title="Marcar como vistas">
                    <IconButton size="small" onClick={() => markItemsRead(selectedItems)}>
                      <DoneAllIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Marcar como não vistas">
                    <IconButton size="small" onClick={() => markItemsUnread(selectedItems)}>
                      <RemoveDoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir selecionadas">
                    <IconButton
                      size="small"
                      className={classes.iconBtnDanger}
                      onClick={() => deleteItems(selectedItems)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Cancelar seleção">
                    <IconButton size="small" onClick={clearSelection}>
                      <Typography style={{ fontSize: 16, lineHeight: 1 }}>×</Typography>
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Segment
                  ariaLabel="Filtrar por status"
                  options={READ_FILTERS}
                  value={readFilter}
                  onChange={(v) => {
                    setReadFilter(v);
                    setSelectedId(null);
                  }}
                  classes={classes}
                />
              )}
            </Box>
          )}

          {isKanbanFutureTab ? (
            renderKanbanFuture()
          ) : filteredItems.length === 0 ? (
            <Box className={classes.empty}>
              <InboxIcon className={classes.emptyIcon} />
              <Typography className={classes.emptyText}>Nada por aqui.</Typography>
            </Box>
          ) : (
            <List dense disablePadding className={classes.list}>
              {filteredItems.map((item) => {
                const isRead = readSet.has(String(item.id));
                const checked = selectedIdSet.has(String(item.id));
                const isActive = selected && String(selected.id) === String(item.id);
                return (
                  <ListItem
                    key={item.id}
                    button
                    className={[
                      classes.listItem,
                      isActive ? classes.listItemActive : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <ListItemIcon className={classes.listIcon}>
                      <Checkbox
                        edge="start"
                        color="primary"
                        size="small"
                        checked={checked}
                        className={[
                          classes.rowCheckbox,
                          hasSelection || checked ? classes.rowCheckboxOn : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => toggleItemSelected(item.id)}
                      />
                      {!hasSelection && !checked && (
                        <span
                          className={[
                            classes.rowDot,
                            isRead ? classes.rowDotRead : classes.rowDotUnread,
                          ].join(" ")}
                        />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      disableTypography
                      primary={
                        <Typography
                          className={[
                            classes.listTitle,
                            isRead ? classes.listTitleRead : classes.listTitleUnread,
                          ].join(" ")}
                          noWrap
                        >
                          {item.title || "Notificação"}
                        </Typography>
                      }
                      secondary={
                        <Typography className={classes.listMeta} noWrap>
                          {(item.kindLabel || item.kind || "Aviso")} ·{" "}
                          {formatRelativeDate(item.createdAt)}
                        </Typography>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        <Box className={classes.detailPanel}>
          {isKanbanFutureTab ? (
            renderKanbanFuture()
          ) : !selected ? (
            <Box className={classes.empty}>
              <InboxIcon className={classes.emptyIcon} />
              <Typography className={classes.emptyText}>
                Selecione uma notificação à esquerda.
              </Typography>
            </Box>
          ) : (
            <>
              <Box className={classes.detailHeader}>
                <Box className={classes.detailHeaderText}>
                  <Typography className={classes.detailTitle} noWrap>
                    {selected.title || "Notificação"}
                  </Typography>
                  <Box className={classes.detailMeta}>
                    <span
                      className={[
                        classes.statusBadge,
                        selectedIsRead ? classes.statusBadgeRead : classes.statusBadgeUnread,
                      ].join(" ")}
                    >
                      <span className={classes.statusDot} />
                      {selectedIsRead ? "visualizada" : "pendente"}
                    </span>
                    <span>·</span>
                    <span>
                      {selected.createdAt
                        ? new Date(selected.createdAt).toLocaleString("pt-BR")
                        : "sem data"}
                    </span>
                  </Box>
                </Box>
                <Box className={classes.detailActions}>
                  <Tooltip
                    title={selectedIsRead ? "Marcar como não visualizada" : "Marcar como visualizada"}
                  >
                    <IconButton size="small" onClick={toggleSelectedRead}>
                      {selectedIsRead ? (
                        <RemoveDoneIcon fontSize="small" />
                      ) : (
                        <DoneAllIcon fontSize="small" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      size="small"
                      className={classes.iconBtnDanger}
                      onClick={() => deleteItems([selected])}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Box className={classes.detailScroll}>
                <Box className={classes.bodyBox}>
                  {selected.body || "Sem mensagem."}
                  {selected.whatsappErro && (
                    <span className={classes.bodyBoxError}>
                      WhatsApp: {selected.whatsappErro}
                    </span>
                  )}
                </Box>

                {hasContext && (
                  <>
                    <Typography className={classes.metaSectionTitle}>Contexto</Typography>
                    <Box className={classes.metaGrid}>
                      {selected.clientName && (
                        <>
                          <Typography className={classes.metaLabel}>Cliente</Typography>
                          <Typography className={classes.metaValue} noWrap>
                            {selected.clientName}
                          </Typography>
                        </>
                      )}
                      {selected.boardName && (
                        <>
                          <Typography className={classes.metaLabel}>Quadro</Typography>
                          <Typography className={classes.metaValue} noWrap>
                            {selected.boardName}
                          </Typography>
                        </>
                      )}
                      {selected.cardName && (
                        <>
                          <Typography className={classes.metaLabel}>Card</Typography>
                          <Typography className={classes.metaValue} noWrap>
                            {selected.cardName}
                          </Typography>
                        </>
                      )}
                      {selected.userName && (
                        <>
                          <Typography className={classes.metaLabel}>Responsável</Typography>
                          <Typography className={classes.metaValue} noWrap>
                            {selected.userName}
                          </Typography>
                        </>
                      )}
                      {selected.ticketId && (
                        <>
                          <Typography className={classes.metaLabel}>Ticket</Typography>
                          <Typography className={classes.metaValue} noWrap>
                            #{selected.ticketId}
                          </Typography>
                        </>
                      )}
                      {selected.destinoTipo && (
                        <>
                          <Typography className={classes.metaLabel}>Destino</Typography>
                          <Typography className={classes.metaValue} noWrap>
                            {selected.destinoTipo}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </>
                )}
              </Box>

              <Box className={classes.detailFooter}>
                <button
                  type="button"
                  className={classes.primaryAction}
                  disabled={!selected.ticketId}
                  onClick={openTicket}
                >
                  <ChatIcon fontSize="small" />
                  Abrir atendimento
                </button>
                {!selected.ticketId && (
                  <Typography className={classes.footerHint}>
                    Esta notificação não está vinculada a um atendimento.
                  </Typography>
                )}
              </Box>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default NotificationsCenter;
