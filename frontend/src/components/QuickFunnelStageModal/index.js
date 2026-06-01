import React, { useContext, useEffect, useState } from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import FormHelperText from "@material-ui/core/FormHelperText";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

function randomColor() {
  const r = Math.floor(Math.random() * 200) + 55;
  const g = Math.floor(Math.random() * 200) + 55;
  const b = Math.floor(Math.random() * 200) + 55;
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Etapa só para filtro na inbox (kanban=2 no backend), sem vínculo a quadro. */
const QuickFunnelStageModal = ({ open, onClose }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [stageName, setStageName] = useState("");
  const [color, setColor] = useState("#1976d2");

  useEffect(() => {
    if (!open) return;
    setStageName("");
    setColor(randomColor());
  }, [open]);

  const handleSubmit = async () => {
    const name = stageName.trim();
    if (name.length < 3) {
      toast.warning(i18n.t("tickets.inbox.quickStageNameShort"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/tags", {
        name,
        color,
        userId: user?.id,
        kanban: 2,
        timeLane: 0,
        nextLaneId: null,
        greetingMessageLane: "",
        rollbackLaneId: null,
      });
      toast.success(i18n.t("tickets.inbox.quickStageSuccess"));
      onClose();
    } catch (e) {
      toastError(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !loading && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{i18n.t("tickets.inbox.quickStageTitle")}</DialogTitle>
      <DialogContent>
        <TextField
          label={i18n.t("tickets.inbox.quickStageName")}
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          fullWidth
          margin="dense"
          variant="outlined"
          autoFocus
        />
        <TextField
          label={i18n.t("tickets.inbox.quickStageColor")}
          value={color}
          onChange={(e) => setColor(e.target.value)}
          fullWidth
          margin="dense"
          variant="outlined"
        />
        <FormHelperText>{i18n.t("tickets.inbox.quickStageFilterOnlyHint")}</FormHelperText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {i18n.t("tagModal.buttons.cancel")}
        </Button>
        <Button color="primary" variant="contained" onClick={handleSubmit} disabled={loading}>
          {i18n.t("tickets.inbox.quickStageSubmit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickFunnelStageModal;
