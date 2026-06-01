import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import CircularProgress from "@material-ui/core/CircularProgress";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import CloseIcon from "@material-ui/icons/Close";
import IconButton from "@material-ui/core/IconButton";
import Grid from "@material-ui/core/Grid";
import Box from "@material-ui/core/Box";
import Typography from "@material-ui/core/Typography";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Select from "@material-ui/core/Select";
import { i18n } from "../../translate/i18n";
import { head } from "lodash";
import axios from "axios";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import SidebarQuickMessageVariablesChips from "./SidebarQuickMessageVariablesChips";
import QuickMessageSequenceFormSection from "../QuickMessageSequenceFormSection";
import {
  parseQuickMessageSequence,
  stringifyQuickMessageSequence,
  normalizeSequenceSteps,
  sequenceHasMediaStep,
  mediaOrdinalAtStepIndex,
  buildQuickMessageAttachmentPublicUrl,
  parseAttachmentsList,
  basenameQuickMessageFile,
} from "../../utils/quickMessageSequence";

const schema = Yup.object().shape({
  shortcode: Yup.string().required("Obrigatório"),
});

const useStyles = makeStyles((theme) => ({
  formRoot: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minHeight: 0,
  },
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    position: "relative",
  },
  header: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 1),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(1, 1.25),
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
  btnWrapper: { position: "relative" },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  helpText: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(-0.5),
    marginBottom: theme.spacing(1),
  },
  confirmScrim: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: theme.spacing(2),
  },
  confirmCard: {
    maxWidth: 360,
    width: "100%",
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
  },
}));

const initialForm = {
  shortcode: "",
  message: "",
  geral: false,
  category: "",
  categoryColor: "#546E7A",
  isFavorite: false,
  autoSend: true,
  useInSlash: true,
  visao: true,
};

const acceptForCreationKind = (kind) => {
  if (!kind) return "";
  switch (kind) {
    case "image":
      return "image/*";
    case "video":
      return "video/*";
    case "audio":
      return "audio/*";
    case "document":
      return ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf";
    case "sticker":
      return "image/webp,image/png,image/jpeg";
    default:
      return "";
  }
};

const seedRecordForCreationKind = (kind) => {
  const o = { ...initialForm };
  switch (kind) {
    case "pix":
      o.category = "PIX";
      o.categoryColor = "#00897B";
      o.message =
        "Chave PIX:\nTipo (CPF / CNPJ / e-mail / telefone / aleatória):\nTitular:\n";
      break;
    case "list":
      o.message = "1) \n2) \n3) \n";
      break;
    case "group":
      o.message =
        "Converter em grupo WhatsApp:\n\nParticipantes (números com DDI e DDD):\nObservações:\n";
      break;
    case "contact":
      o.message = "Contato:\nNome:\nTelefone:\n";
      break;
    case "linkBanner":
      o.message =
        "Link com banner:\n\nURL:\nTexto do botão (opcional):\n\n(Anexe a imagem do banner em Arquivo.)\n";
      break;
    default:
      break;
  }
  return o;
};

/** Editor só dentro do painel de respostas (sem Dialog / portal na página). */
const SidebarQuickMessageEditorModal = ({ open, onClose, quickemessageId, creationKind, onSaved }) => {
  const classes = useStyles();
  const theme = useTheme();
  const { user } = useContext(AuthContext);
  const messageInputRef = useRef(null);
  const attachmentFile = useRef(null);
  const mediaPickStepRef = useRef(null);

  const [record, setRecord] = useState({ ...initialForm });
  const [attachment, setAttachment] = useState(null);
  const [confirmMediaOpen, setConfirmMediaOpen] = useState(false);
  const [sequenceEnabled, setSequenceEnabled] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState(() => [{ type: "text", body: "" }]);
  const [mediaFilesByStepIndex, setMediaFilesByStepIndex] = useState({});
  const [serverAttachments, setServerAttachments] = useState([]);

  const resetLocal = useCallback(() => {
    setRecord({ ...initialForm });
    setAttachment(null);
    if (attachmentFile.current) attachmentFile.current.value = null;
    setSequenceEnabled(false);
    setSequenceSteps([{ type: "text", body: "" }]);
    setMediaFilesByStepIndex({});
    setServerAttachments([]);
    mediaPickStepRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    if (quickemessageId) {
      (async () => {
        try {
          const { data } = await api.get(`/quick-messages/${quickemessageId}`);
          const parsed = parseQuickMessageSequence(data.message);
          if (parsed) {
            setSequenceEnabled(true);
            setSequenceSteps(
              parsed.steps.length ? normalizeSequenceSteps(parsed.steps) : [{ type: "text", body: "" }]
            );
          } else {
            setSequenceEnabled(false);
            setSequenceSteps([{ type: "text", body: "" }]);
          }
          setRecord({
            ...initialForm,
            ...data,
            autoSend: data.autoSend !== false,
            useInSlash: data.useInSlash !== false,
          });
          const att = parseAttachmentsList(data.attachments);
          if (att.length) setServerAttachments(att);
          else {
            const b = basenameQuickMessageFile(data.mediaPath);
            if (b) setServerAttachments([{ path: b, name: data.mediaName || b }]);
            else setServerAttachments([]);
          }
          setMediaFilesByStepIndex({});
        } catch (err) {
          toastError(err);
        }
      })();
      return;
    }
    setSequenceEnabled(false);
    setSequenceSteps([{ type: "text", body: "" }]);
    setMediaFilesByStepIndex({});
    setServerAttachments([]);
    setRecord(seedRecordForCreationKind(creationKind || null));
    setAttachment(null);
    if (attachmentFile.current) attachmentFile.current.value = null;
  }, [quickemessageId, open, creationKind]);

  const handleClose = () => {
    resetLocal();
    onClose();
  };

  const handleAttachment = (e) => {
    const file = head(e.target.files);
    const pick = mediaPickStepRef.current;
    if (file && sequenceEnabled && typeof pick === "number") {
      setMediaFilesByStepIndex((prev) => ({ ...prev, [pick]: file }));
      mediaPickStepRef.current = null;
      if (e.target) e.target.value = "";
      return;
    }
    if (file) setAttachment(file);
    if (e.target) e.target.value = "";
  };

  const uploadSequenceAttachments = async (id, valuesSnapshot, recordSnapshot) => {
    try {
      await api.delete(`/quick-messages/${id}/media-upload`);
    } catch (_) {
      /* sem anexos ainda */
    }
    let ord = 0;
    for (let si = 0; si < sequenceSteps.length; si += 1) {
      if (sequenceSteps[si].type !== "media") continue;
      const picked = mediaFilesByStepIndex[si];
      if (picked) {
        const formData = new FormData();
        formData.append("typeArch", "quickMessage");
        formData.append("file", picked);
        await api.post(`/quick-messages/${id}/media-upload`, formData);
      } else {
        const row =
          serverAttachments[ord] ||
          (ord === 0 && valuesSnapshot.mediaPath
            ? {
                path: basenameQuickMessageFile(valuesSnapshot.mediaPath),
                name: valuesSnapshot.mediaName || basenameQuickMessageFile(valuesSnapshot.mediaPath),
              }
            : null);
        if (row?.path) {
          const url = buildQuickMessageAttachmentPublicUrl(
            {
              companyId: recordSnapshot.companyId || user?.companyId,
              mediaPath: valuesSnapshot.mediaPath,
            },
            row.path
          );
          if (url) {
            const { data: blob } = await axios.get(url, { responseType: "blob" });
            const ext = (blob.type && blob.type.split("/")[1]) || "bin";
            const formData = new FormData();
            formData.append("typeArch", "quickMessage");
            const nm = String(row.name || `file.${ext}`).replace(/\s/g, "_");
            formData.append(
              "file",
              new File([blob], nm, { type: blob.type || "application/octet-stream" })
            );
            await api.post(`/quick-messages/${id}/media-upload`, formData);
          }
        }
      }
      ord += 1;
    }
  };

  const save = async (values) => {
    let messageToSave = values.message;
    const stepsNorm = normalizeSequenceSteps(sequenceSteps);
    const hasSeqMedia = sequenceEnabled && sequenceHasMediaStep(stepsNorm);

    if (sequenceEnabled) {
      const hasText = stepsNorm.some((s) => s.type === "text" && String(s.body || "").trim());
      let mediaOk = true;
      if (sequenceHasMediaStep(stepsNorm)) {
        for (let i = 0; i < sequenceSteps.length; i += 1) {
          if (sequenceSteps[i].type !== "media") continue;
          const f = mediaFilesByStepIndex[i];
          const ord = mediaOrdinalAtStepIndex(sequenceSteps, i);
          const row = ord != null ? serverAttachments[ord] : null;
          const legacy = ord === 0 && values.mediaPath;
          if (!f && !row?.path && !legacy) {
            mediaOk = false;
            break;
          }
        }
      }
      if (!hasText && !(sequenceHasMediaStep(stepsNorm) && mediaOk)) {
        toast.error(i18n.t("messagesInput.quickReplies.sequenceErrorNeedContent"));
        return;
      }
      if (sequenceHasMediaStep(stepsNorm) && !mediaOk) {
        toast.error(i18n.t("messagesInput.quickReplies.sequenceErrorNeedAttachment"));
        return;
      }
      messageToSave = stringifyQuickMessageSequence(sequenceSteps);
    }

    const hasMedia = hasSeqMedia || Boolean(attachment || values.mediaPath);
    const payload = {
      ...values,
      message: messageToSave,
      autoSend: values.autoSend !== false,
      useInSlash: values.useInSlash !== false,
      isMedia: hasMedia,
      mediaPath: hasSeqMedia
        ? null
        : attachment
          ? String(attachment.name).replace(/ /g, "_")
          : values.mediaPath
            ? basenameQuickMessageFile(values.mediaPath)
            : null,
      attachments: hasSeqMedia ? null : values.attachments,
    };

    try {
      if (quickemessageId) {
        await api.put(`/quick-messages/${quickemessageId}`, payload);
        if (hasSeqMedia) {
          await uploadSequenceAttachments(quickemessageId, values, record);
        } else if (attachment != null) {
          const formData = new FormData();
          formData.append("typeArch", "quickMessage");
          formData.append("file", attachment);
          await api.post(`/quick-messages/${quickemessageId}/media-upload`, formData);
        }
      } else {
        const { data } = await api.post("/quick-messages", payload);
        if (hasSeqMedia) {
          await uploadSequenceAttachments(data.id, values, { ...record, companyId: user?.companyId });
        } else if (attachment != null) {
          const formData = new FormData();
          formData.append("typeArch", "quickMessage");
          formData.append("file", attachment);
          await api.post(`/quick-messages/${data.id}/media-upload`, formData);
        }
      }
      toast.success(i18n.t("quickMessages.toasts.success"));
      if (typeof onSaved === "function") onSaved();
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const deleteMedia = async () => {
    setConfirmMediaOpen(false);
    if (attachment) {
      setAttachment(null);
      if (attachmentFile.current) attachmentFile.current.value = null;
      return;
    }
    if (record.mediaPath && quickemessageId) {
      try {
        await api.delete(`/quick-messages/${quickemessageId}/media-upload`);
        setRecord((prev) => ({ ...prev, mediaPath: null, mediaName: null, attachments: null }));
        setServerAttachments([]);
        setMediaFilesByStepIndex({});
        toast.success(i18n.t("quickMessages.toasts.deleted"));
        if (typeof onSaved === "function") onSaved();
      } catch (err) {
        toastError(err);
      }
    }
  };

  const insertVar = async (msgVar, setFieldValue) => {
    const el = messageInputRef.current;
    if (!el) return;
    const a = el.selectionStart ?? el.value.length;
    const b = el.selectionEnd ?? el.value.length;
    const first = el.value.substring(0, a);
    const second = el.value.substring(b);
    const pos = a + msgVar.length;
    setFieldValue("message", `${first}${msgVar}${second}`);
    await new Promise((r) => setTimeout(r, 80));
    el.setSelectionRange(pos, pos);
  };

  if (!open) return null;

  return (
    <Box className={classes.root}>
      {confirmMediaOpen && (
        <Box className={classes.confirmScrim}>
          <Box className={classes.confirmCard}>
            <Typography variant="subtitle2" gutterBottom>
              {i18n.t("quickMessages.confirmationModal.deleteTitle")}
            </Typography>
            <Typography variant="body2" paragraph>
              {i18n.t("quickMessages.confirmationModal.deleteMessage")}
            </Typography>
            <Box display="flex" justifyContent="flex-end" gridGap={8}>
              <Button variant="outlined" onClick={() => setConfirmMediaOpen(false)}>
                {i18n.t("quickMessages.buttons.cancel")}
              </Button>
              <Button color="secondary" variant="contained" onClick={deleteMedia}>
                {i18n.t("confirmationModal.buttons.confirm")}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Box className={classes.header}>
        <Typography variant="subtitle1" style={{ fontWeight: 700 }}>
          {quickemessageId
            ? i18n.t("quickMessages.dialog.edit")
            : i18n.t("quickMessages.dialog.add")}
        </Typography>
        <IconButton size="small" onClick={handleClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <input
        type="file"
        ref={attachmentFile}
        style={{ display: "none" }}
        accept={
          sequenceEnabled && sequenceSteps.some((s) => s.type === "media")
            ? "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf"
            : acceptForCreationKind(creationKind) || undefined
        }
        onChange={handleAttachment}
      />

      <Formik
        initialValues={record}
        enableReinitialize
        validationSchema={schema}
        onSubmit={(vals, actions) => {
          setTimeout(() => {
            save(vals);
            actions.setSubmitting(false);
          }, 200);
        }}
      >
        {({ touched, errors, isSubmitting, setFieldValue, values }) => {
          const disabledShare =
            quickemessageId &&
            values.visao &&
            !values.geral &&
            values.userId !== user?.id;

          return (
            <Form className={classes.formRoot}>
              <Box className={classes.scroll}>
                <Grid container spacing={2}>
                  {!quickemessageId && creationKind ? (
                    <Grid item xs={12}>
                      <Box
                        style={{
                          padding: "8px 12px",
                          borderRadius: 4,
                          backgroundColor: theme.palette.action.hover,
                          borderLeft: `4px solid ${theme.palette.primary.main}`,
                        }}
                      >
                        <Typography variant="caption" color="textPrimary" component="p">
                          {i18n.t(
                            `messagesInput.quickReplies.creationHints.${creationKind}`
                          )}
                        </Typography>
                      </Box>
                    </Grid>
                  ) : null}
                  <Grid item xs={12}>
                    <Field
                      as={TextField}
                      autoFocus
                      name="shortcode"
                      label={i18n.t("quickMessages.dialog.shortcode")}
                      disabled={disabledShare}
                      error={touched.shortcode && Boolean(errors.shortcode)}
                      helperText={touched.shortcode && errors.shortcode}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Field
                      as={TextField}
                      name="category"
                      label={i18n.t("quickMessages.dialog.category")}
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      disabled={disabledShare}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Field
                      as={TextField}
                      name="categoryColor"
                      label={i18n.t("quickMessages.dialog.categoryColor")}
                      type="color"
                      variant="outlined"
                      margin="dense"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                      disabled={disabledShare}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={Boolean(values.isFavorite)}
                          onChange={(e) => setFieldValue("isFavorite", e.target.checked)}
                          disabled={disabledShare}
                          color="primary"
                        />
                      }
                      label={i18n.t("quickMessages.dialog.favorite")}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <QuickMessageSequenceFormSection
                      sequenceEnabled={sequenceEnabled}
                      setSequenceEnabled={setSequenceEnabled}
                      sequenceSteps={sequenceSteps}
                      setSequenceSteps={setSequenceSteps}
                      getPlainMessage={() => values.message}
                      setPlainMessage={(s) => setFieldValue("message", s)}
                      disabled={disabledShare}
                      helpTextClassName={classes.helpText}
                      onMediaAttachClick={(stepIdx) => {
                        mediaPickStepRef.current = stepIdx;
                        if (attachmentFile.current) attachmentFile.current.click();
                      }}
                      hasMediaAttachmentAt={(stepIdx) => {
                        if (mediaFilesByStepIndex[stepIdx]) return true;
                        const ord = mediaOrdinalAtStepIndex(sequenceSteps, stepIdx);
                        if (ord == null) return false;
                        const row = serverAttachments[ord];
                        if (row?.path) return true;
                        return ord === 0 && Boolean(values.mediaPath);
                      }}
                      attachmentDisplayNameAt={(stepIdx) => {
                        if (mediaFilesByStepIndex[stepIdx]?.name) {
                          return mediaFilesByStepIndex[stepIdx].name;
                        }
                        const ord = mediaOrdinalAtStepIndex(sequenceSteps, stepIdx);
                        if (ord == null) return "";
                        const row = serverAttachments[ord];
                        if (row?.name) return row.name;
                        if (ord === 0 && values.mediaName) return values.mediaName;
                        return row?.path || basenameQuickMessageFile(values.mediaPath) || "";
                      }}
                      onMediaRemoveClick={(stepIdx) => {
                        setMediaFilesByStepIndex((prev) => {
                          const next = { ...prev };
                          delete next[stepIdx];
                          return next;
                        });
                      }}
                    />
                  </Grid>
                  {!sequenceEnabled ? (
                    <Grid item xs={12}>
                      <Field
                        as={TextField}
                        name="message"
                        label={i18n.t("quickMessages.dialog.message")}
                        inputRef={messageInputRef}
                        variant="outlined"
                        margin="dense"
                        fullWidth
                        multiline
                        rows={7}
                        disabled={disabledShare}
                      />
                      <SidebarQuickMessageVariablesChips
                        disabled={isSubmitting || disabledShare}
                        onInsert={(value) => insertVar(value, setFieldValue)}
                      />
                    </Grid>
                  ) : null}
                  <Grid item xs={12}>
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel id="sidebar-qm-visao">{i18n.t("quickMessages.dialog.visao")}</InputLabel>
                      <Select
                        labelId="sidebar-qm-visao"
                        label={i18n.t("quickMessages.dialog.visao")}
                        disabled={disabledShare}
                        value={values.visao ? "true" : "false"}
                        onChange={(e) =>
                          setFieldValue("visao", e.target.value === "true")
                        }
                      >
                        <MenuItem value="true">{i18n.t("announcements.active")}</MenuItem>
                        <MenuItem value="false">{i18n.t("announcements.inactive")}</MenuItem>
                      </Select>
                    </FormControl>
                    {values.visao === true && (
                      <FormControl variant="outlined" margin="dense" fullWidth>
                        <InputLabel id="sidebar-qm-geral">{i18n.t("quickMessages.dialog.geral")}</InputLabel>
                        <Select
                          labelId="sidebar-qm-geral"
                          label={i18n.t("quickMessages.dialog.geral")}
                          disabled={disabledShare}
                          value={values.geral ? "true" : "false"}
                          onChange={(e) =>
                            setFieldValue("geral", e.target.value === "true")
                          }
                        >
                          <MenuItem value="true">{i18n.t("announcements.active")}</MenuItem>
                          <MenuItem value="false">{i18n.t("announcements.inactive")}</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  </Grid>
                  {!(sequenceEnabled && sequenceHasMediaStep(sequenceSteps)) ? (
                    <Grid item xs={12}>
                      {(values.mediaPath || attachment) && (
                        <>
                          <Button startIcon={<AttachFileIcon />}>
                            {attachment ? attachment.name : values.mediaName}
                          </Button>
                          <IconButton
                            onClick={() => setConfirmMediaOpen(true)}
                            color="secondary"
                            disabled={disabledShare}
                          >
                            <DeleteOutlineIcon color="secondary" />
                          </IconButton>
                        </>
                      )}
                      {!attachment && !values.mediaPath && (
                        <Button
                          color="primary"
                          variant="outlined"
                          startIcon={<AttachFileIcon />}
                          disabled={isSubmitting || disabledShare}
                          onClick={() => attachmentFile.current && attachmentFile.current.click()}
                        >
                          {i18n.t("quickMessages.buttons.attach")}
                        </Button>
                      )}
                    </Grid>
                  ) : null}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={values.autoSend !== false}
                          onChange={(e) => setFieldValue("autoSend", e.target.checked)}
                          disabled={disabledShare}
                          color="primary"
                        />
                      }
                      label={i18n.t("quickMessages.dialog.autoSend")}
                    />
                    <Typography className={classes.helpText} component="p">
                      {i18n.t("quickMessages.dialog.autoSendHelp")}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={values.useInSlash !== false}
                          onChange={(e) => setFieldValue("useInSlash", e.target.checked)}
                          disabled={disabledShare}
                          color="primary"
                        />
                      }
                      label={i18n.t("quickMessages.dialog.useInSlash")}
                    />
                    <Typography className={classes.helpText} component="p">
                      {i18n.t("quickMessages.dialog.useInSlashHelp")}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              <Box className={classes.footer}>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  variant="outlined"
                  disabled={isSubmitting}
                >
                  {i18n.t("quickMessages.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="contained"
                  disabled={isSubmitting || disabledShare}
                  className={classes.btnWrapper}
                >
                  {quickemessageId
                    ? i18n.t("quickMessages.buttons.edit")
                    : i18n.t("quickMessages.buttons.add")}
                  {isSubmitting && (
                    <CircularProgress size={24} className={classes.buttonProgress} />
                  )}
                </Button>
              </Box>
            </Form>
          );
        }}
      </Formik>
    </Box>
  );
};

export default SidebarQuickMessageEditorModal;
