import React, { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, IconButton, TextField, Typography, makeStyles } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import moment from "moment";
import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const padBodyMin = (text) => {
  let t = String(text || "").trim();
  if (t.length >= 5) return t;
  while (t.length < 5) t += " ";
  return t;
};

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
    overflowY: "auto",
    padding: theme.spacing(1.5),
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

/** Agendamento só dentro do painel (sem Dialog). */
const QuickReplySidebarScheduleDialog = ({
  open,
  onClose,
  ticket,
  contact,
  user,
  defaultBody,
}) => {
  const classes = useStyles();
  const [body, setBody] = useState("");
  const [sendAt, setSendAt] = useState(() =>
    moment().add(1, "hour").format("YYYY-MM-DDTHH:mm")
  );

  useEffect(() => {
    if (!open) return;
    setBody(padBodyMin(defaultBody));
    setSendAt(moment().add(1, "hour").format("YYYY-MM-DDTHH:mm"));
  }, [open, defaultBody]);

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    const contactId = contact?.id;
    if (!contactId) {
      toast.error(i18n.t("messagesInput.quickReplies.scheduleNeedContact"));
      return;
    }
    const whatsappId = ticket?.whatsappId;
    if (!whatsappId) {
      toast.error(i18n.t("messagesInput.quickReplies.scheduleNeedWhatsapp"));
      return;
    }
    const trimmed = String(body || "").trim();
    if (trimmed.length < 5) {
      toast.error(i18n.t("messagesInput.quickReplies.scheduleBodyTooShort"));
      return;
    }
    try {
      await api.post("/schedules", {
        body: trimmed,
        sendAt,
        contactId,
        userId: user?.id,
        ticketUserId: ticket?.userId ?? ticket?.user?.id ?? null,
        queueId: ticket?.queueId ?? null,
        openTicket: "enabled",
        statusTicket: "closed",
        whatsappId,
        intervalo: 1,
        valorIntervalo: 0,
        enviarQuantasVezes: 1,
        tipoDias: 4,
        contadorEnvio: 0,
        assinar: false,
      });
      toast.success(i18n.t("messagesInput.quickReplies.scheduleSaved"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  if (!open) return null;

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
          {i18n.t("messagesInput.quickReplies.scheduleDialogTitle")}
        </Typography>
        <IconButton size="small" onClick={handleClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box className={classes.body}>
        <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
          {i18n.t("messagesInput.quickReplies.scheduleDialogHint")}
        </Typography>
        <TextField
          label={i18n.t("messagesInput.quickReplies.scheduleBodyLabel")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          minRows={5}
          variant="outlined"
          margin="normal"
          fullWidth
        />
        <TextField
          label={i18n.t("messagesInput.quickReplies.scheduleSendAtLabel")}
          type="datetime-local"
          value={sendAt}
          onChange={(e) => setSendAt(e.target.value)}
          variant="outlined"
          margin="normal"
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
          {i18n.t("messagesInput.quickReplies.scheduleViewListHint")}{" "}
          <RouterLink to="/schedules">{i18n.t("messagesInput.quickReplies.scheduleViewListLink")}</RouterLink>
        </Typography>
      </Box>
      <Box className={classes.footer}>
        <Button onClick={handleClose}>{i18n.t("quickMessages.buttons.cancel")}</Button>
        <Button color="primary" variant="contained" onClick={handleSubmit}>
          {i18n.t("messagesInput.quickReplies.scheduleSave")}
        </Button>
      </Box>
    </Box>
  );
};

export default QuickReplySidebarScheduleDialog;
