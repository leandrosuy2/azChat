import React, { useState, useCallback } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import AddIcon from "@material-ui/icons/Add";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import { i18n } from "../translate/i18n";

/** Mesmos tipos do menu "Nova resposta" — mapeados para passos de sequência. */
const CREATION_KIND_ACTIONS = [
  { kind: "text", stepType: "text", seedBody: "" },
  { kind: "image", stepType: "media", seedBody: "" },
  { kind: "video", stepType: "media", seedBody: "" },
  { kind: "audio", stepType: "media", seedBody: "" },
  { kind: "document", stepType: "media", seedBody: "" },
  { kind: "pix", stepType: "text", seedBody: "Chave PIX:\nTipo:\nTitular:\n" },
  { kind: "group", stepType: "text", seedBody: "Participantes (números):\n" },
  { kind: "contact", stepType: "text", seedBody: "Contato:\nNome:\nTelefone:\n" },
  {
    kind: "linkBanner",
    stepType: "text",
    seedBody: "Link com banner:\nURL:\nTexto do botão:\n",
  },
  { kind: "sticker", stepType: "media", seedBody: "" },
  { kind: "list", stepType: "text", seedBody: "1) \n2) \n3) \n" },
];

/**
 * Interruptor + lista de passos (texto, espera, vários anexos) para respostas rápidas.
 * Estado (enabled/steps) fica no componente pai.
 */
const QuickMessageSequenceFormSection = ({
  sequenceEnabled,
  setSequenceEnabled,
  sequenceSteps,
  setSequenceSteps,
  getPlainMessage,
  setPlainMessage,
  disabled,
  helpTextClassName,
  onMediaAttachClick,
  hasMediaAttachmentAt,
  attachmentDisplayNameAt,
  onMediaRemoveClick,
}) => {
  const theme = useTheme();
  const [addStepAnchor, setAddStepAnchor] = useState(null);

  const addStepOfType = useCallback(
    (type) => {
      setAddStepAnchor(null);
      if (type === "text") {
        setSequenceSteps((prev) => [...prev, { type: "text", body: "" }]);
        return;
      }
      if (type === "delay") {
        setSequenceSteps((prev) => [...prev, { type: "delay", seconds: 2 }]);
        return;
      }
      if (type === "media") {
        setSequenceSteps((prev) => [...prev, { type: "media", caption: "" }]);
      }
    },
    [setSequenceSteps]
  );

  const addCreationKindStep = useCallback(
    (kind) => {
      setAddStepAnchor(null);
      const def = CREATION_KIND_ACTIONS.find((a) => a.kind === kind);
      if (!def) return;
      if (def.stepType === "text") {
        setSequenceSteps((prev) => [
          ...prev,
          { type: "text", body: def.seedBody || "" },
        ]);
        return;
      }
      if (def.stepType === "media") {
        setSequenceSteps((prev) => [
          ...prev,
          { type: "media", caption: def.seedBody || "" },
        ]);
      }
    },
    [setSequenceSteps]
  );

  const removeStepAt = useCallback(
    (idx) => {
      setSequenceSteps((prev) => {
        if (prev.length <= 1) return prev;
        return prev.filter((_, i) => i !== idx);
      });
    },
    [setSequenceSteps]
  );

  const patchStep = useCallback(
    (idx, patch) => {
      setSequenceSteps((prev) => prev.map((st, i) => (i === idx ? { ...st, ...patch } : st)));
    },
    [setSequenceSteps]
  );

  const stepTitle = (step) => {
    if (step.type === "text") return i18n.t("messagesInput.quickReplies.sequenceStepText");
    if (step.type === "delay") return i18n.t("messagesInput.quickReplies.sequenceStepDelay");
    return i18n.t("messagesInput.quickReplies.sequenceStepMedia");
  };

  return (
    <>
      <Box mb={1}>
        <FormControlLabel
          control={
            <Switch
              checked={sequenceEnabled}
              onChange={(e) => {
                const on = e.target.checked;
                if (on) {
                  setSequenceEnabled(true);
                  setSequenceSteps([{ type: "text", body: String(getPlainMessage() || "") }]);
                } else {
                  const merged = sequenceSteps
                    .filter((s) => s.type === "text")
                    .map((s) => String(s.body || ""))
                    .filter(Boolean)
                    .join("\n\n");
                  setSequenceEnabled(false);
                  setSequenceSteps([{ type: "text", body: "" }]);
                  setPlainMessage(merged);
                }
              }}
              disabled={disabled}
              color="primary"
            />
          }
          label={i18n.t("messagesInput.quickReplies.sequenceTitle")}
        />
        {sequenceEnabled ? (
          <Typography
            variant="caption"
            color="textSecondary"
            component="p"
            className={helpTextClassName}
          >
            {i18n.t("messagesInput.quickReplies.sequenceHint")}
          </Typography>
        ) : null}
      </Box>

      {sequenceEnabled ? (
        <Box>
          {sequenceSteps.map((step, idx) => (
            <Box
              key={idx}
              mb={1.5}
              p={1.5}
              borderRadius={4}
              style={{ border: `1px solid ${theme.palette.divider}` }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" style={{ fontWeight: 700 }}>
                  {stepTitle(step)}
                </Typography>
                <IconButton
                  size="small"
                  disabled={disabled || sequenceSteps.length <= 1}
                  onClick={() => removeStepAt(idx)}
                  aria-label="remove step"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
              {step.type === "text" ? (
                <TextField
                  size="small"
                  fullWidth
                  variant="outlined"
                  multiline
                  minRows={2}
                  label={i18n.t("quickMessages.dialog.message")}
                  value={step.body}
                  onChange={(e) => patchStep(idx, { body: e.target.value })}
                  disabled={disabled}
                />
              ) : null}
              {step.type === "delay" ? (
                <TextField
                  type="number"
                  size="small"
                  fullWidth
                  variant="outlined"
                  label={i18n.t("messagesInput.quickReplies.sequenceDelaySeconds")}
                  inputProps={{ min: 0, max: 300, step: 0.5 }}
                  value={step.seconds}
                  onChange={(e) => patchStep(idx, { seconds: Number(e.target.value) })}
                  disabled={disabled}
                />
              ) : null}
              {step.type === "media" ? (
                <>
                  <TextField
                    size="small"
                    fullWidth
                    variant="outlined"
                    label={i18n.t("messagesInput.quickReplies.sequenceCaption")}
                    value={step.caption}
                    onChange={(e) => patchStep(idx, { caption: e.target.value })}
                    disabled={disabled}
                  />
                  {typeof onMediaAttachClick === "function" &&
                  typeof hasMediaAttachmentAt === "function" &&
                  typeof attachmentDisplayNameAt === "function" ? (
                    <Box mt={1.5}>
                      {!hasMediaAttachmentAt(idx) ? (
                        <Button
                          type="button"
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<AttachFileIcon />}
                          disabled={disabled}
                          onClick={() => onMediaAttachClick(idx)}
                        >
                          {i18n.t("quickMessages.buttons.attach")}
                        </Button>
                      ) : (
                        <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8 }}>
                          <Button
                            type="button"
                            size="small"
                            variant="outlined"
                            startIcon={<AttachFileIcon />}
                            disabled={disabled}
                            onClick={() => onMediaAttachClick(idx)}
                          >
                            {attachmentDisplayNameAt(idx) || i18n.t("quickMessages.buttons.attach")}
                          </Button>
                          {typeof onMediaRemoveClick === "function" ? (
                            <IconButton
                              size="small"
                              color="secondary"
                              disabled={disabled}
                              onClick={() => onMediaRemoveClick(idx)}
                              aria-label="remove attachment"
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          ) : null}
                        </Box>
                      )}
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        component="p"
                        style={{ marginTop: 8, marginBottom: 0 }}
                      >
                        {i18n.t("messagesInput.quickReplies.sequenceAttachInStepHint")}
                      </Typography>
                    </Box>
                  ) : null}
                </>
              ) : null}
            </Box>
          ))}
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            disabled={disabled}
            onClick={(e) => setAddStepAnchor(e.currentTarget)}
          >
            {i18n.t("messagesInput.quickReplies.sequenceAddStep")}
          </Button>
          <Menu
            anchorEl={addStepAnchor}
            keepMounted
            open={Boolean(addStepAnchor)}
            onClose={() => setAddStepAnchor(null)}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <MenuItem dense onClick={() => addStepOfType("delay")}>
              {i18n.t("messagesInput.quickReplies.sequenceStepDelay")}
            </MenuItem>
            {CREATION_KIND_ACTIONS.map((a) => (
              <MenuItem key={a.kind} dense onClick={() => addCreationKindStep(a.kind)}>
                {i18n.t(`messagesInput.quickReplies.createTypes.${a.kind}`)}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      ) : null}
    </>
  );
};

export default QuickMessageSequenceFormSection;
