import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Menu,
  MenuItem,
} from "@material-ui/core";
import { makeStyles, alpha, useTheme } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import DragIndicator from "@material-ui/icons/DragIndicator";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import TagModal from "../TagModal";
import QuickFunnelStageModal from "../QuickFunnelStageModal";

/** Quantidade máxima de chips na faixa; o restante abre em “Ver mais”. */
const MAX_INLINE_INBOX_TAGS = 5;

/** Mesmo valor que o backend (`INBOX_FUNNEL_FILTER_KANBAN`) — etapas do funil na caixa. */
const KANBAN_INBOX_FUNNEL_STAGES = 2;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: theme.spacing(1),
    flex: 1,
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    margin: 0,
    padding: 0,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: theme.spacing(0.5),
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing(0.5),
    minHeight: 28,
    flexWrap: "wrap",
    rowGap: theme.spacing(0.5),
  },
  sectionHeaderActions: {
    display: "inline-flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing(0.25),
    marginLeft: "auto",
  },
  sectionLabel: {
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
    lineHeight: 1.2,
    margin: 0,
    padding: 0,
  },
  sectionIconBtn: {
    padding: 6,
    color: theme.palette.text.secondary,
    "&:hover": {
      color: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
    },
  },
  /** Faixa com quebra de linha + “Ver mais” — sem barra de rolagem horizontal. */
  chipWrapStrip: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    alignContent: "center",
    gap: theme.spacing(0.5),
    minHeight: 36,
    padding: theme.spacing(0.5, 0.75),
    borderRadius: 8,
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    margin: 0,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.mode === "dark"
        ? alpha(theme.palette.common.white, 0.06)
        : alpha(theme.palette.common.black, 0.04),
    boxShadow:
      theme.mode === "dark"
        ? "none"
        : `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.9)}`,
  },
  chipScrollItem: {
    flexShrink: 0,
  },
  seeMoreChip: {
    borderStyle: "dashed",
    fontWeight: 700,
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
  quickChip: {
    fontWeight: 600,
    fontSize: "0.75rem",
    height: 26,
    borderRadius: 9,
    border: "none",
    transition: theme.transitions.create(["background-color", "color"], {
      duration: 180,
    }),
    "&:focus": {
      backgroundColor: "inherit",
    },
  },
  quickChipActive: {
    backgroundColor: `${theme.palette.primary.main} !important`,
    color: `${theme.palette.primary.contrastText} !important`,
    boxShadow: `0 1px 4px ${alpha(theme.palette.primary.main, 0.45)}`,
  },
  tagsBlock: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(0.5),
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  },
  manageListItem: {
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(0.5),
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.mode === "dark"
        ? alpha(theme.palette.common.white, 0.04)
        : alpha(theme.palette.common.black, 0.03),
    paddingRight: 88,
  },
  tagChip: {
    fontWeight: 600,
    fontSize: "0.7rem",
    height: 26,
    borderRadius: 10,
    flexShrink: 0,
    border: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(
      ["transform", "box-shadow", "border-color"],
      { duration: 180 }
    ),
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: theme.shadows[2],
    },
  },
  chipDrop: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: theme.palette.primary.main,
    transform: "scale(1.02)",
  },
  manageSectionTitle: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(0.75),
    fontWeight: 700,
    fontSize: "0.75rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: theme.palette.text.secondary,
  },
  manageItemActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: theme.spacing(0.25),
    marginRight: theme.spacing(-0.5),
  },
  manageIconBtn: {
    padding: 6,
  },
  manageDragHandle: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    padding: theme.spacing(0.25, 0.5),
    marginRight: theme.spacing(0.5),
    borderRadius: 6,
    color: theme.palette.text.secondary,
    flexShrink: 0,
    touchAction: "none",
    userSelect: "none",
    "&:active": {
      cursor: "grabbing",
    },
    "&:hover": {
      backgroundColor: alpha(theme.palette.primary.main, 0.08),
      color: theme.palette.primary.main,
    },
  },
  manageListDropTarget: {
    borderColor: `${theme.palette.primary.main} !important`,
    boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.35)}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.06),
  },
  manageListDragging: {
    opacity: 0.55,
  },
}));

const TicketsInboxFilterBar = ({
  quickFilter,
  onQuickFilterChange,
  folderTagId,
  onFolderTagChange,
  onContactTagged,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const [categoryTags, setCategoryTags] = useState([]);
  const [stageTags, setStageTags] = useState([]);
  const [dragOverTagId, setDragOverTagId] = useState(null);
  /** Criar/editar categoria (kanban 0) ou editar etapa de filtro (kanban 2) */
  const [tagModal, setTagModal] = useState({ open: false, tagId: null, kanban: 0 });
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [deleteTagDialogOpen, setDeleteTagDialogOpen] = useState(false);
  const [tagPendingDelete, setTagPendingDelete] = useState(null);
  /** "category" | "stage" — textos do diálogo de exclusão */
  const [pendingDeleteKind, setPendingDeleteKind] = useState("stage");
  const [categoryMoreAnchor, setCategoryMoreAnchor] = useState(null);
  const [stageMoreAnchor, setStageMoreAnchor] = useState(null);

  const manageReorderDragRef = useRef(null);
  const [manageDropTargetId, setManageDropTargetId] = useState(null);
  const [manageDragSourceId, setManageDragSourceId] = useState(null);

  const categoryInline = categoryTags.slice(0, MAX_INLINE_INBOX_TAGS);
  const categoryOverflow = categoryTags.slice(MAX_INLINE_INBOX_TAGS);
  const stageInline = stageTags.slice(0, MAX_INLINE_INBOX_TAGS);
  const stageOverflow = stageTags.slice(MAX_INLINE_INBOX_TAGS);

  const isFolderTagActive = (tag) => Number(folderTagId) === Number(tag.id);

  const selectFolderTag = (tag) => {
    const id = Number(tag.id);
    onFolderTagChange(isFolderTagActive(tag) ? null : id);
  };

  const refreshTags = useCallback(async () => {
    try {
      const [r0, r1] = await Promise.all([
        api.get("/tags/list", { params: { kanban: 0 } }),
        api.get("/tags/list", { params: { kanban: 2 } }),
      ]);
      if (Array.isArray(r0.data)) setCategoryTags(r0.data);
      if (Array.isArray(r1.data)) setStageTags(r1.data);
    } catch (e) {
      toastError(e);
    }
  }, []);

  useEffect(() => {
    refreshTags();
  }, [refreshTags]);

  useEffect(() => {
    if (!manageDialogOpen) {
      manageReorderDragRef.current = null;
      setManageDropTargetId(null);
      setManageDragSourceId(null);
    }
  }, [manageDialogOpen]);

  const handleManageDragStart = (e, kind, id) => {
    manageReorderDragRef.current = { kind, id: Number(id) };
    try {
      e.dataTransfer.setData("text/plain", String(id));
    } catch (_) {
      /* ignore */
    }
    e.dataTransfer.effectAllowed = "move";
    setManageDragSourceId(Number(id));
    setManageDropTargetId(null);
  };

  const handleManageDragEnd = () => {
    manageReorderDragRef.current = null;
    setManageDragSourceId(null);
    setManageDropTargetId(null);
  };

  const handleManageDragOverRow = (e, kind, targetId) => {
    const d = manageReorderDragRef.current;
    if (!d || d.kind !== kind) return;
    if (Number(d.id) === Number(targetId)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setManageDropTargetId(Number(targetId));
  };

  const handleManageDragLeaveRow = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setManageDropTargetId(null);
    }
  };

  const persistInboxReorder = async (kind, orderedList) => {
    const kanban = kind === "category" ? 0 : KANBAN_INBOX_FUNNEL_STAGES;
    const tagIds = orderedList.map((t) => t.id);
    await api.put("/tags/inbox-reorder", { kanban, tagIds });
    toast.success(i18n.t("tickets.inbox.manageReorderSaved"));
  };

  const handleManageDropRow = async (e, kind, targetId) => {
    e.preventDefault();
    const d = manageReorderDragRef.current;
    setManageDropTargetId(null);
    setManageDragSourceId(null);
    manageReorderDragRef.current = null;
    if (!d || d.kind !== kind) return;
    if (Number(d.id) === Number(targetId)) return;

    const isCat = kind === "category";
    const list = isCat ? [...categoryTags] : [...stageTags];
    const fromIdx = list.findIndex((t) => Number(t.id) === Number(d.id));
    const toIdx = list.findIndex((t) => Number(t.id) === Number(targetId));
    if (fromIdx < 0 || toIdx < 0) return;

    const next = [...list];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);

    if (isCat) setCategoryTags(next);
    else setStageTags(next);

    try {
      await persistInboxReorder(kind, next);
    } catch (err) {
      toastError(err);
      await refreshTags();
    }
  };

  const handleDragOverTag = (e, tagId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverTagId(tagId);
  };

  const handleDragLeaveTag = () => {
    setDragOverTagId(null);
  };

  const handleDropOnTag = async (e, tag) => {
    e.preventDefault();
    setDragOverTagId(null);
    let raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    try {
      const { contactId } = JSON.parse(raw);
      if (!contactId) return;
      await api.post(`/tags/contact-link/${contactId}/${tag.id}`);
      toast.success(`Etiqueta "${tag.name}" aplicada ao contato.`);
    } catch (err) {
      toastError(err);
    }
  };

  const requestDeleteInboxTag = (tag, kind) => {
    setPendingDeleteKind(kind);
    setTagPendingDelete(tag);
    setDeleteTagDialogOpen(true);
  };

  const cancelDeleteInboxTag = () => {
    setDeleteTagDialogOpen(false);
    setTagPendingDelete(null);
  };

  const confirmDeleteInboxTag = async () => {
    const tag = tagPendingDelete;
    if (!tag) return;
    setDeleteTagDialogOpen(false);
    setTagPendingDelete(null);
    try {
      await api.delete(`/tags/${tag.id}`);
      if (Number(folderTagId) === Number(tag.id)) onFolderTagChange(null);
      toast.success(i18n.t("tags.toasts.deleted"));
      await refreshTags();
      if (onContactTagged) onContactTagged(tag);
    } catch (err) {
      toastError(err);
    }
  };

  const closeTagModal = () => {
    setTagModal({ open: false, tagId: null, kanban: 0 });
    refreshTags();
  };

  const openCategoryCreate = () => {
    setTagModal({ open: true, tagId: null, kanban: 0 });
  };

  const openTagEdit = (tag, kanban) => {
    setManageDialogOpen(false);
    setTagModal({ open: true, tagId: tag.id, kanban });
  };

  const closeStageModal = () => {
    setStageModalOpen(false);
    refreshTags();
  };

  /** Chips na faixa: só filtro / arrastar contato — exclusão fica em “Gerenciar”. */
  const renderScrollTagChip = (tag, keyPrefix) => (
    <Chip
      key={`${keyPrefix}-${tag.id}`}
      size="small"
      className={`${classes.tagChip} ${classes.chipScrollItem} ${
        dragOverTagId === tag.id ? classes.chipDrop : ""
      }`}
      style={{
        backgroundColor: isFolderTagActive(tag) ? tag.color || "#1976d2" : undefined,
        color: isFolderTagActive(tag) ? "#fff" : undefined,
        borderColor: isFolderTagActive(tag) ? "transparent" : undefined,
      }}
      label={tag.name}
      onClick={() => {
        selectFolderTag(tag);
      }}
      onDragOver={(e) => handleDragOverTag(e, tag.id)}
      onDragLeave={handleDragLeaveTag}
      onDrop={(e) => handleDropOnTag(e, tag)}
    />
  );

  return (
    <Box className={classes.root}>
      <Box className={classes.section}>
        <Box className={classes.sectionHeader}>
          <Typography className={classes.sectionLabel} component="span">
            {i18n.t("tickets.inbox.inboxCategoriesLabel")}
          </Typography>
          <Box className={classes.sectionHeaderActions}>
            <Tooltip title={i18n.t("tickets.inbox.createCategoryTooltip")}>
              <IconButton
                size="small"
                className={classes.sectionIconBtn}
                aria-label={i18n.t("tickets.inbox.createCategoryAria")}
                onClick={openCategoryCreate}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={i18n.t("tickets.inbox.manageTagsTooltip")}>
              <IconButton
                size="small"
                className={classes.sectionIconBtn}
                aria-label={i18n.t("tickets.inbox.manageTagsAria")}
                onClick={() => setManageDialogOpen(true)}
              >
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box className={classes.chipWrapStrip}>
          {categoryInline.map((tag) => renderScrollTagChip(tag, "c"))}
          {categoryOverflow.length > 0 && (
            <>
              <Chip
                size="small"
                icon={<ExpandMoreIcon style={{ fontSize: 18 }} />}
                className={`${classes.tagChip} ${classes.chipScrollItem} ${classes.seeMoreChip}`}
                label={i18n.t("tickets.inbox.inboxSeeMore", {
                  count: categoryOverflow.length,
                })}
                onClick={(e) => setCategoryMoreAnchor(e.currentTarget)}
              />
              <Menu
                anchorEl={categoryMoreAnchor}
                keepMounted
                open={Boolean(categoryMoreAnchor)}
                onClose={() => setCategoryMoreAnchor(null)}
                getContentAnchorEl={null}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{ style: { maxHeight: 320 } }}
              >
                {categoryOverflow.map((tag) => (
                  <MenuItem
                    key={`co-${tag.id}`}
                    selected={isFolderTagActive(tag)}
                    onClick={() => {
                      selectFolderTag(tag);
                      setCategoryMoreAnchor(null);
                    }}
                  >
                    {tag.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      </Box>

      <Box className={classes.tagsBlock}>
        <Box className={classes.sectionHeader}>
          <Typography className={classes.sectionLabel} component="span">
            {i18n.t("tickets.inbox.inboxFolderTags")}
          </Typography>
          <Box className={classes.sectionHeaderActions}>
            <Tooltip title={i18n.t("tickets.inbox.createStageTooltip")}>
              <IconButton
                size="small"
                className={classes.sectionIconBtn}
                aria-label={i18n.t("tickets.inbox.createStageAria")}
                onClick={() => setStageModalOpen(true)}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={i18n.t("tickets.inbox.manageTagsTooltip")}>
              <IconButton
                size="small"
                className={classes.sectionIconBtn}
                aria-label={i18n.t("tickets.inbox.manageTagsAria")}
                onClick={() => setManageDialogOpen(true)}
              >
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Box className={classes.chipWrapStrip}>
          {stageInline.map((tag) => renderScrollTagChip(tag, "s"))}
          {stageOverflow.length > 0 && (
            <>
              <Chip
                size="small"
                icon={<ExpandMoreIcon style={{ fontSize: 18 }} />}
                className={`${classes.tagChip} ${classes.chipScrollItem} ${classes.seeMoreChip}`}
                label={i18n.t("tickets.inbox.inboxSeeMore", {
                  count: stageOverflow.length,
                })}
                onClick={(e) => setStageMoreAnchor(e.currentTarget)}
              />
              <Menu
                anchorEl={stageMoreAnchor}
                keepMounted
                open={Boolean(stageMoreAnchor)}
                onClose={() => setStageMoreAnchor(null)}
                getContentAnchorEl={null}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                PaperProps={{ style: { maxHeight: 320 } }}
              >
                {stageOverflow.map((tag) => (
                  <MenuItem
                    key={`so-${tag.id}`}
                    selected={isFolderTagActive(tag)}
                    onClick={() => {
                      selectFolderTag(tag);
                      setStageMoreAnchor(null);
                    }}
                  >
                    {tag.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      </Box>

      <Box className={classes.section}>
        <Box className={classes.sectionHeader}>
          <Typography className={classes.sectionLabel} component="span">
            Filtros do chat
          </Typography>
        </Box>
        <Box className={classes.chipWrapStrip}>
          <Chip
            size="small"
            className={`${classes.quickChip} ${classes.chipScrollItem} ${
              quickFilter === "all" ? classes.quickChipActive : ""
            }`}
            label="Todos"
            color="default"
            onClick={() => onQuickFilterChange("all")}
          />
          <Chip
            size="small"
            className={`${classes.quickChip} ${classes.chipScrollItem} ${
              quickFilter === "unread" ? classes.quickChipActive : ""
            }`}
            label="Não lidos"
            color="default"
            onClick={() => onQuickFilterChange("unread")}
          />
        </Box>
      </Box>

      <TagModal
        key={`inbox-tag-${tagModal.kanban}-${tagModal.tagId ?? "new"}`}
        open={tagModal.open}
        tagId={tagModal.tagId}
        kanban={tagModal.kanban}
        onClose={closeTagModal}
      />
      <QuickFunnelStageModal open={stageModalOpen} onClose={closeStageModal} />

      <Dialog
        open={manageDialogOpen}
        onClose={() => setManageDialogOpen(false)}
        aria-labelledby="inbox-manage-tags-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="inbox-manage-tags-title">
          {i18n.t("tickets.inbox.manageTagsDialogTitle")}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" paragraph>
            {i18n.t("tickets.inbox.manageTagsDialogHint")}
          </Typography>
          <Typography className={classes.manageSectionTitle} component="h3">
            {i18n.t("tickets.inbox.manageTagsCategoriesHeading")}
          </Typography>
          {categoryTags.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          ) : (
            <List dense disablePadding>
              {categoryTags.map((tag) => (
                <ListItem
                  key={`mc-${tag.id}`}
                  className={`${classes.manageListItem} ${
                    manageDropTargetId === Number(tag.id)
                      ? classes.manageListDropTarget
                      : ""
                  } ${
                    manageDragSourceId === Number(tag.id)
                      ? classes.manageListDragging
                      : ""
                  }`}
                  onDragOver={(e) => handleManageDragOverRow(e, "category", tag.id)}
                  onDragLeave={handleManageDragLeaveRow}
                  onDrop={(e) => handleManageDropRow(e, "category", tag.id)}
                >
                  <Tooltip title={i18n.t("tickets.inbox.manageDragReorderTooltip")}>
                    <span
                      className={classes.manageDragHandle}
                      draggable
                      onDragStart={(ev) =>
                        handleManageDragStart(ev, "category", tag.id)
                      }
                      onDragEnd={handleManageDragEnd}
                      onMouseDown={(ev) => ev.stopPropagation()}
                    >
                      <DragIndicator fontSize="small" />
                    </span>
                  </Tooltip>
                  <Box
                    style={{
                      width: 4,
                      alignSelf: "stretch",
                      borderRadius: 2,
                      backgroundColor: tag.color || theme.palette.grey[400],
                      marginRight: 12,
                    }}
                  />
                  <ListItemText primary={tag.name} />
                  <ListItemSecondaryAction>
                    <Box className={classes.manageItemActions} component="span">
                      <Tooltip title={i18n.t("tickets.inbox.editCategoryTooltip")}>
                        <IconButton
                          size="small"
                          className={classes.manageIconBtn}
                          color="primary"
                          aria-label={i18n.t("tickets.inbox.editCategoryTooltip")}
                          onClick={() => openTagEdit(tag, 0)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={i18n.t("tickets.inbox.deleteCategoryTooltip")}>
                        <IconButton
                          size="small"
                          className={classes.manageIconBtn}
                          aria-label={i18n.t("tickets.inbox.deleteCategoryTooltip")}
                          onClick={() => {
                            setManageDialogOpen(false);
                            requestDeleteInboxTag(tag, "category");
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
          <Divider style={{ marginTop: 16, marginBottom: 8 }} />
          <Typography className={classes.manageSectionTitle} component="h3">
            {i18n.t("tickets.inbox.manageTagsStagesHeading")}
          </Typography>
          {stageTags.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              —
            </Typography>
          ) : (
            <List dense disablePadding>
              {stageTags.map((tag) => (
                <ListItem
                  key={`ms-${tag.id}`}
                  className={`${classes.manageListItem} ${
                    manageDropTargetId === Number(tag.id)
                      ? classes.manageListDropTarget
                      : ""
                  } ${
                    manageDragSourceId === Number(tag.id)
                      ? classes.manageListDragging
                      : ""
                  }`}
                  onDragOver={(e) => handleManageDragOverRow(e, "stage", tag.id)}
                  onDragLeave={handleManageDragLeaveRow}
                  onDrop={(e) => handleManageDropRow(e, "stage", tag.id)}
                >
                  <Tooltip title={i18n.t("tickets.inbox.manageDragReorderTooltip")}>
                    <span
                      className={classes.manageDragHandle}
                      draggable
                      onDragStart={(ev) =>
                        handleManageDragStart(ev, "stage", tag.id)
                      }
                      onDragEnd={handleManageDragEnd}
                      onMouseDown={(ev) => ev.stopPropagation()}
                    >
                      <DragIndicator fontSize="small" />
                    </span>
                  </Tooltip>
                  <Box
                    style={{
                      width: 4,
                      alignSelf: "stretch",
                      borderRadius: 2,
                      backgroundColor: tag.color || theme.palette.grey[400],
                      marginRight: 12,
                    }}
                  />
                  <ListItemText primary={tag.name} />
                  <ListItemSecondaryAction>
                    <Box className={classes.manageItemActions} component="span">
                      <Tooltip title={i18n.t("tickets.inbox.editStageTooltip")}>
                        <IconButton
                          size="small"
                          className={classes.manageIconBtn}
                          color="primary"
                          aria-label={i18n.t("tickets.inbox.editStageTooltip")}
                          onClick={() => openTagEdit(tag, 2)}
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={i18n.t("tickets.inbox.deleteStageTooltip")}>
                        <IconButton
                          size="small"
                          className={classes.manageIconBtn}
                          aria-label={i18n.t("tickets.inbox.deleteStageTooltip")}
                          onClick={() => {
                            setManageDialogOpen(false);
                            requestDeleteInboxTag(tag, "stage");
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManageDialogOpen(false)} color="primary" variant="contained">
            {i18n.t("confirmationModal.buttons.cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTagDialogOpen}
        onClose={cancelDeleteInboxTag}
        aria-labelledby="inbox-delete-tag-title"
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id="inbox-delete-tag-title">
          {pendingDeleteKind === "category"
            ? i18n.t("tickets.inbox.deleteCategoryTitle")
            : i18n.t("tickets.inbox.deleteFunnelStageTitle")}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2">
            {tagPendingDelete
              ? i18n.t(
                  pendingDeleteKind === "category"
                    ? "tickets.inbox.deleteCategoryConfirm"
                    : "tickets.inbox.deleteFunnelStageConfirm",
                  { name: tagPendingDelete.name }
                )
              : ""}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteInboxTag} color="default" variant="contained">
            {i18n.t("confirmationModal.buttons.cancel")}
          </Button>
          <Button
            onClick={confirmDeleteInboxTag}
            color="secondary"
            variant="contained"
          >
            {i18n.t("confirmationModal.buttons.confirm")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TicketsInboxFilterBar;
