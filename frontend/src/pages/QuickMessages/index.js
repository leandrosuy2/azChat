import React, { useState, useEffect, useReducer, useContext, useMemo, useCallback } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { toast } from "react-toastify";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import VisibilityIcon from "@material-ui/icons/Visibility";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Chip from "@material-ui/core/Chip";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Tooltip from "@material-ui/core/Tooltip";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import HelpHint from "../../components/HelpHint";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import QuickMessageDialog from "../../components/QuickMessageDialog";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Grid } from "@material-ui/core";
import { isArray } from "lodash";
import { AuthContext } from "../../context/Auth/AuthContext";
import ModalImageCors from "../../components/ModalImageCors";

const UNCATEGORIZED = "__uncategorized__";

const inferMediaKind = (mediaPath) => {
  if (!mediaPath) return "text";
  const u = String(mediaPath).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return "image";
  if (/\.(mp4|webm|3gp|mov)(\?|$)/i.test(u)) return "video";
  if (/\.pdf(\?|$)/i.test(u)) return "pdf";
  return "file";
};

const typeLabelKey = (kind) => {
  if (kind === "image") return "quickMessages.typeImage";
  if (kind === "video") return "quickMessages.typeVideo";
  if (kind === "pdf") return "quickMessages.typePdf";
  if (kind === "file") return "quickMessages.typeFile";
  return "quickMessages.typeText";
};

const reducer = (state, action) => {
  if (action.type === "LOAD_QUICKMESSAGES") {
    const quickmessages = action.payload;
    const newQuickmessages = [];

    if (isArray(quickmessages)) {
      quickmessages.forEach((quickemessage) => {
        const quickemessageIndex = state.findIndex(
          (u) => u.id === quickemessage.id
        );
        if (quickemessageIndex !== -1) {
          state[quickemessageIndex] = quickemessage;
        } else {
          newQuickmessages.push(quickemessage);
        }
      });
    }

    return [...state, ...newQuickmessages];
  }

  if (action.type === "UPDATE_QUICKMESSAGES") {
    const quickemessage = action.payload;
    const quickemessageIndex = state.findIndex((u) => u.id === quickemessage.id);

    if (quickemessageIndex !== -1) {
      state[quickemessageIndex] = quickemessage;
      return [...state];
    }
    return [quickemessage, ...state];
  }

  if (action.type === "DELETE_QUICKMESSAGE") {
    const quickemessageId = action.payload;
    const quickemessageIndex = state.findIndex((u) => u.id === quickemessageId);
    if (quickemessageIndex !== -1) {
      state.splice(quickemessageIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const useStyles = makeStyles((theme) => ({
  pageTitle: {
    color: theme.palette.primary.main,
    fontWeight: 600,
    marginBottom: theme.spacing(0.5),
    [theme.breakpoints.down("sm")]: {
      fontSize: "1.1rem",
      lineHeight: 1.2,
    },
  },
  headerToolbar: {
    width: "100%",
    [theme.breakpoints.down("sm")]: {
      marginTop: theme.spacing(-0.5),
    },
  },
  layout: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    gap: theme.spacing(1),
    flexDirection: "column",
    [theme.breakpoints.up("md")]: {
      flexDirection: "row",
    },
  },
  categoryPaper: {
    width: "100%",
    flexShrink: 0,
    padding: theme.spacing(0.5, 0),
    overflowX: "auto",
    overflowY: "hidden",
    maxHeight: 112,
    [theme.breakpoints.up("md")]: {
      width: 188,
      maxHeight: "100%",
      overflowX: "hidden",
      overflowY: "auto",
      padding: theme.spacing(0.75, 0),
    },
    ...theme.scrollbarStyles,
  },
  categoryChipsRow: {
    display: "flex",
    flexWrap: "nowrap",
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
    [theme.breakpoints.up("md")]: {
      display: "none",
    },
    ...theme.scrollbarStyles,
  },
  categoryListDesktop: {
    display: "none",
    [theme.breakpoints.up("md")]: {
      display: "block",
    },
  },
  chipFilter: {
    flexShrink: 0,
    height: 28,
    fontSize: "0.75rem",
  },
  mainPaper: {
    flex: 1,
    padding: theme.spacing(0.5),
    overflow: "auto",
    minWidth: 0,
    ...theme.scrollbarStyles,
    [theme.breakpoints.up("md")]: {
      padding: theme.spacing(1),
    },
  },
  table: {
    "& td, & th": {
      padding: theme.spacing(0.5, 0.75),
      fontSize: "0.8125rem",
      [theme.breakpoints.down("sm")]: {
        padding: theme.spacing(0.35, 0.5),
        fontSize: "0.75rem",
      },
    },
    "& th": {
      fontWeight: 600,
      whiteSpace: "nowrap",
    },
  },
  hideOnMobile: {
    [theme.breakpoints.down("xs")]: {
      display: "none",
    },
  },
  hideOnNarrow: {
    [theme.breakpoints.down("sm")]: {
      display: "none",
    },
  },
  typeChip: {
    height: 22,
    fontSize: "0.7rem",
  },
  previewBody: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: "0.875rem",
  },
  previewMedia: {
    maxWidth: "100%",
    maxHeight: 220,
    marginTop: theme.spacing(1),
    [theme.breakpoints.up("sm")]: {
      maxHeight: 320,
    },
  },
  dialogTitleCompact: {
    paddingBottom: theme.spacing(1),
    "& h2": {
      fontSize: "1rem",
      [theme.breakpoints.up("sm")]: {
        fontSize: "1.25rem",
      },
    },
  },
}));

const Quickemessages = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("xs"));
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));
  const location = useLocation();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedQuickemessage, setSelectedQuickemessage] = useState(null);
  const [deletingQuickemessage, setDeletingQuickemessage] = useState(null);
  const [quickemessageModalOpen, setQuickMessageDialogOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [quickemessages, dispatch] = useReducer(reducer, []);
  const [categoryKey, setCategoryKey] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [draftFromChat, setDraftFromChat] = useState(null);

  const { user, socket } = useContext(AuthContext);

  useEffect(() => {
    const dq = location.state && location.state.draftQuickMessage;
    if (dq && dq.message != null) {
      setDraftFromChat(dq);
      setSelectedQuickemessage(null);
      setQuickMessageDialogOpen(true);
      history.replace({
        pathname: "/quick-messages",
        search: location.search || "",
      });
    }
  }, [location.state, history, location.search]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const editId = params.get("edit");
    if (editId && /^\d+$/.test(editId)) {
      setSelectedQuickemessage({ id: Number(editId) });
      setQuickMessageDialogOpen(true);
    }
  }, [location.search]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchQuickemessages();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = user.companyId;

    const onQuickMessageEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUICKMESSAGES", payload: data.record });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUICKMESSAGE", payload: +data.id });
      }
    };
    socket.on(`company-${companyId}-quickmessage`, onQuickMessageEvent);

    return () => {
      socket.off(`company-${companyId}-quickmessage`, onQuickMessageEvent);
    };
  }, [socket, user.companyId]);

  const fetchQuickemessages = async () => {
    try {
      const { data } = await api.get("/quick-messages", {
        params: { searchParam, pageNumber },
      });

      dispatch({ type: "LOAD_QUICKMESSAGES", payload: data.records });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const reloadList = useCallback(async () => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
    setLoading(true);
    try {
      const { data } = await api.get("/quick-messages", {
        params: { searchParam, pageNumber: "1" },
      });
      dispatch({ type: "LOAD_QUICKMESSAGES", payload: data.records });
      setHasMore(data.hasMore);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [searchParam]);

  const handleOpenQuickMessageDialog = () => {
    setDraftFromChat(null);
    setSelectedQuickemessage(null);
    setQuickMessageDialogOpen(true);
  };

  const handleOpenCreateCategory = () => {
    setDraftFromChat(null);
    setSelectedQuickemessage(null);
    setQuickMessageDialogOpen(true);
    toast.info(i18n.t("quickMessages.createHint"));
  };

  const handleCloseQuickMessageDialog = () => {
    setSelectedQuickemessage(null);
    setDraftFromChat(null);
    setQuickMessageDialogOpen(false);
    fetchQuickemessages();
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditQuickemessage = (quickemessage) => {
    setDraftFromChat(null);
    setSelectedQuickemessage(quickemessage);
    setQuickMessageDialogOpen(true);
  };

  const handleDeleteQuickemessage = async (quickemessageId) => {
    try {
      await api.delete(`/quick-messages/${quickemessageId}`);
      toast.success(i18n.t("quickMessages.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingQuickemessage(null);
    setSearchParam("");
    setPageNumber(1);
    fetchQuickemessages();
    dispatch({ type: "RESET" });
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  const categories = useMemo(() => {
    const map = new Map();
    quickemessages.forEach((m) => {
      const raw = (m.category || "").trim();
      const key = raw || UNCATEGORIZED;
      const label = raw || i18n.t("quickMessages.uncategorized");
      const color = m.categoryColor || "#546E7A";
      if (!map.has(key)) {
        map.set(key, { key, label, color, count: 0 });
      }
      map.get(key).count += 1;
    });
    const list = Array.from(map.values());
    list.sort((a, b) => a.label.localeCompare(b.label, "pt"));
    return list;
  }, [quickemessages]);

  const filteredRows = useMemo(() => {
    if (!categoryKey) return quickemessages;
    return quickemessages.filter((m) => {
      const raw = (m.category || "").trim();
      const key = raw || UNCATEGORIZED;
      return key === categoryKey;
    });
  }, [quickemessages, categoryKey]);

  const handleToggleFavorite = async (row, e) => {
    e.stopPropagation();
    try {
      const { data: fresh } = await api.get(`/quick-messages/${row.id}`);
      const { data: updated } = await api.put(`/quick-messages/${row.id}`, {
        shortcode: fresh.shortcode,
        message: fresh.message ?? "",
        geral: Boolean(fresh.geral),
        visao: Boolean(fresh.visao),
        category: fresh.category,
        categoryColor: fresh.categoryColor || "#546E7A",
        isFavorite: !fresh.isFavorite,
        isMedia: Boolean(fresh.mediaName || fresh.mediaPath),
        autoSend: fresh.autoSend !== false,
        useInSlash: fresh.useInSlash !== false,
      });
      dispatch({
        type: "UPDATE_QUICKMESSAGES",
        payload: updated,
      });
    } catch (err) {
      toastError(err);
      toast.warning(i18n.t("quickMessages.toasts.favoriteError"));
    }
  };

  const previewKind = previewRow ? inferMediaKind(previewRow.mediaPath) : "text";

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingQuickemessage &&
          `${i18n.t("quickMessages.confirmationModal.deleteTitle")} ${deletingQuickemessage.shortcode}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteQuickemessage(deletingQuickemessage.id)}
      >
        {i18n.t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <Dialog
        open={Boolean(previewRow)}
        onClose={() => setPreviewRow(null)}
        maxWidth="sm"
        fullWidth
        fullScreen={isXs}
      >
        <DialogTitle className={classes.dialogTitleCompact}>
          {previewRow?.shortcode || i18n.t("quickMessages.previewTitle")}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="textSecondary" display="block">
            {previewRow?.category || i18n.t("quickMessages.uncategorized")}
          </Typography>
          <Typography className={classes.previewBody} component="div">
            {previewRow?.message || "—"}
          </Typography>
          {previewKind === "image" && previewRow?.mediaPath && (
            <Box className={classes.previewMedia}>
              <ModalImageCors imageUrl={previewRow.mediaPath} />
            </Box>
          )}
          {previewKind === "video" && previewRow?.mediaPath && (
            <video
              className={classes.previewMedia}
              src={previewRow.mediaPath}
              controls
            />
          )}
          {(previewKind === "pdf" || previewKind === "file") &&
            previewRow?.mediaPath && (
              <Button
                href={previewRow.mediaPath}
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
              >
                {previewRow.mediaName || i18n.t("quickMessages.buttons.attach")}
              </Button>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewRow(null)} color="primary">
            {i18n.t("quickMessages.buttons.cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      <QuickMessageDialog
        resetPagination={reloadList}
        open={quickemessageModalOpen}
        onClose={handleCloseQuickMessageDialog}
        aria-labelledby="form-dialog-title"
        quickemessageId={selectedQuickemessage && selectedQuickemessage.id}
        initialDraft={draftFromChat}
      />
      <MainHeader>
        <Grid className={classes.headerToolbar} container spacing={1} alignItems="center">
          <Grid xs={12} md={3} item>
            <span style={{ display: "flex", alignItems: "center" }}>
              <Typography
                component="h1"
                variant={isMdUp ? "h5" : "subtitle1"}
                className={classes.pageTitle}
              >
                {i18n.t("quickMessages.title")}
              </Typography>
              <HelpHint areaKey="quick-messages" />
            </span>
          </Grid>
          <Grid xs={12} md={9} item>
            <Grid spacing={1} container alignItems="center">
              <Grid xs={12} sm={5} md={5} item>
                <TextField
                  fullWidth
                  size="small"
                  margin="dense"
                  variant="outlined"
                  placeholder={i18n.t("quickMessages.searchPlaceholder")}
                  type="search"
                  value={searchParam}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: "gray", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid xs={6} sm={3} md={3} item>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  color="primary"
                  onClick={handleOpenQuickMessageDialog}
                >
                  {i18n.t("quickMessages.buttons.add")}
                </Button>
              </Grid>
              <Grid xs={6} sm={4} md={4} item>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={handleOpenCreateCategory}
                >
                  {i18n.t("quickMessages.createCategory")}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MainHeader>
      <Box className={classes.layout}>
        <Paper className={classes.categoryPaper} variant="outlined">
          <Box className={classes.categoryChipsRow}>
            <Chip
              size="small"
              className={classes.chipFilter}
              label={i18n.t("quickMessages.allCategories")}
              color={categoryKey === null ? "primary" : "default"}
              onClick={() => setCategoryKey(null)}
            />
            {categories.map((c) => (
              <Chip
                key={c.key}
                size="small"
                className={classes.chipFilter}
                label={`${c.label} (${c.count})`}
                style={{ borderLeft: `3px solid ${c.color}` }}
                color={categoryKey === c.key ? "primary" : "default"}
                variant={categoryKey === c.key ? "default" : "outlined"}
                onClick={() => setCategoryKey(c.key)}
              />
            ))}
          </Box>
          <Box className={classes.categoryListDesktop}>
            <List dense disablePadding>
              <ListItem
                button
                selected={categoryKey === null}
                onClick={() => setCategoryKey(null)}
              >
                <ListItemText
                  primary={i18n.t("quickMessages.allCategories")}
                  primaryTypographyProps={{ variant: "body2" }}
                />
              </ListItem>
              {categories.map((c) => (
                <ListItem
                  button
                  key={c.key}
                  selected={categoryKey === c.key}
                  onClick={() => setCategoryKey(c.key)}
                >
                  <Box
                    width={3}
                    minWidth={3}
                    borderRadius={1}
                    height={20}
                    bgcolor={c.color}
                    mr={1}
                  />
                  <ListItemText
                    primary={c.label}
                    secondary={`${c.count}`}
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
        </Paper>
        <Paper
          className={classes.mainPaper}
          variant="outlined"
          onScroll={handleScroll}
        >
          <Table size="small" className={classes.table} stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="center" style={{ width: 40 }} />
                <TableCell>{i18n.t("quickMessages.table.shortcode")}</TableCell>
                <TableCell>{i18n.t("quickMessages.table.preview")}</TableCell>
                <TableCell align="center" className={classes.hideOnMobile}>
                  {i18n.t("quickMessages.table.type")}
                </TableCell>
                <TableCell className={classes.hideOnNarrow}>
                  {i18n.t("quickMessages.table.category")}
                </TableCell>
                <TableCell align="center" className={classes.hideOnNarrow}>
                  {i18n.t("quickMessages.table.useCount")}
                </TableCell>
                <TableCell align="center" style={{ width: 120 }}>
                  {i18n.t("quickMessages.table.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <>
                {filteredRows.map((row) => {
                  const kind = inferMediaKind(row.mediaPath);
                  const maxPrev = isXs ? 42 : isMdUp ? 80 : 56;
                  const prev =
                    row.message && String(row.message).length > maxPrev
                      ? `${String(row.message).slice(0, maxPrev)}…`
                      : row.message || "—";
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell align="center">
                        <Tooltip title={i18n.t("quickMessages.buttons.favorite")}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleToggleFavorite(row, e)}
                          >
                            {row.isFavorite ? (
                              <StarIcon style={{ color: "#FFB300", fontSize: 20 }} />
                            ) : (
                              <StarBorderIcon style={{ fontSize: 20 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="inherit" noWrap title={row.shortcode}>
                          {row.shortcode}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="inherit" noWrap title={row.message}>
                          {prev}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" className={classes.hideOnMobile}>
                        <Chip
                          size="small"
                          className={classes.typeChip}
                          label={i18n.t(typeLabelKey(kind))}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell className={classes.hideOnNarrow}>
                        {row.category?.trim()
                          ? row.category
                          : i18n.t("quickMessages.uncategorized")}
                      </TableCell>
                      <TableCell align="center" className={classes.hideOnNarrow}>
                        {i18n.t("quickMessages.usedTimes", {
                          count: row.useCount || 0,
                        })}
                      </TableCell>
                      <TableCell align="center" style={{ whiteSpace: "nowrap" }}>
                        <Tooltip title={i18n.t("quickMessages.buttons.view")}>
                          <IconButton
                            size="small"
                            onClick={() => setPreviewRow(row)}
                          >
                            <VisibilityIcon style={{ fontSize: 20 }} />
                          </IconButton>
                        </Tooltip>
                        <IconButton
                          size="small"
                          onClick={() => handleEditQuickemessage(row)}
                        >
                          <EditIcon style={{ fontSize: 20 }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setConfirmModalOpen(true);
                            setDeletingQuickemessage(row);
                          }}
                        >
                          <DeleteOutlineIcon style={{ fontSize: 20 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {loading && <TableRowSkeleton columns={7} />}
              </>
            </TableBody>
          </Table>
        </Paper>
      </Box>
    </MainContainer>
  );
};

export default Quickemessages;
