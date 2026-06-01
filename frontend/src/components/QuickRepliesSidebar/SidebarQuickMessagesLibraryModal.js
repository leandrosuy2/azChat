import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  makeStyles,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import CloseIcon from "@material-ui/icons/Close";
import EditIcon from "@material-ui/icons/Edit";
import { i18n } from "../../translate/i18n";
import { quickMessageSnippet } from "../../utils/quickMessageSequence";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
  },
  header: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  body: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(0, 1.25, 1),
    minHeight: 0,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 0.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.04)"
          : "rgba(0,0,0,0.04)",
    },
  },
  rowBody: { flex: 1, minWidth: 0 },
  shortcode: { fontWeight: 600, fontSize: "0.8rem" },
  snippet: {
    fontSize: "0.72rem",
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
  },
  footer: {
    flexShrink: 0,
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
    padding: theme.spacing(1, 1.25),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

/** Lista de respostas só dentro do painel (sem Dialog). */
const SidebarQuickMessagesLibraryModal = ({ open, onClose, items, onEdit, onCreate }) => {
  const classes = useStyles();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const list = Array.isArray(items) ? items.slice() : [];
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((m) => {
      const s = `${m.shortcode || ""} ${m.message || ""} ${m.category || ""}`.toLowerCase();
      return s.includes(t);
    });
  }, [items, q]);

  if (!open) return null;

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography component="span" variant="subtitle1" style={{ fontWeight: 700 }}>
          {i18n.t("messagesInput.quickReplies.libraryTitle")}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box className={classes.body}>
        <TextField
          size="small"
          fullWidth
          variant="outlined"
          placeholder={i18n.t("messagesInput.quickReplies.librarySearch")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ marginBottom: 12 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Box className={classes.scroll}>
          {rows.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              {i18n.t("messagesInput.quickReplies.empty")}
            </Typography>
          ) : (
            rows.map((m) => (
              <Box key={m.id} className={classes.row}>
                <Box className={classes.rowBody}>
                  <Typography className={classes.shortcode}>/{m.shortcode}</Typography>
                  <Typography className={classes.snippet}>
                    {quickMessageSnippet(m.message)}
                  </Typography>
                  {(m.category || "").trim() ? (
                    <Typography variant="caption" color="textSecondary">
                      {m.category}
                    </Typography>
                  ) : null}
                </Box>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => {
                    onEdit(m.id);
                    onClose();
                  }}
                  aria-label="edit"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Box>
            ))
          )}
        </Box>
      </Box>
      <Box className={classes.footer}>
        <Button onClick={onClose}>{i18n.t("quickMessages.buttons.cancel")}</Button>
        <Button color="primary" variant="contained" onClick={() => onCreate()}>
          {i18n.t("messagesInput.quickReplies.libraryNew")}
        </Button>
      </Box>
    </Box>
  );
};

export default SidebarQuickMessagesLibraryModal;
