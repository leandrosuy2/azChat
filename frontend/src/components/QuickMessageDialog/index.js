import React, { useContext, useState, useEffect, useRef, useCallback } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
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
import axios from "axios";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import AttachFileIcon from "@material-ui/icons/AttachFile";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import IconButton from "@material-ui/core/IconButton";
import Accordion from "@material-ui/core/Accordion";
import AccordionSummary from "@material-ui/core/AccordionSummary";
import AccordionDetails from "@material-ui/core/AccordionDetails";
import Typography from "@material-ui/core/Typography";
import { i18n } from "../../translate/i18n";
import { head } from "lodash";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import MessageVariablesPicker from "../MessageVariablesPicker";

import {
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
} from "@material-ui/core";
import ConfirmationModal from "../ConfirmationModal";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  accordionDetails: {
    flexDirection: "column",
    paddingTop: 0,
  },
  helpText: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(-0.5),
    marginBottom: theme.spacing(1),
  },
  dialogTitle: {
    paddingBottom: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      "& h2": { fontSize: "1rem" },
    },
  },
  dialogContent: {
    [theme.breakpoints.down("sm")]: {
      paddingLeft: theme.spacing(1.5),
      paddingRight: theme.spacing(1.5),
    },
  },
}));

const QuickeMessageSchema = Yup.object().shape({
  shortcode: Yup.string().required("Obrigatório"),
});

const QuickMessageDialog = ({
  open,
  onClose,
  quickemessageId,
  reload,
  resetPagination,
  onSaved,
  initialDraft,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("xs"));
  const narrowDialog = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useContext(AuthContext);
  const messageInputRef = useRef();
  const mediaPickStepRef = useRef(null);

  const notifySaved = reload || resetPagination || onSaved;

  const initialState = {
    shortcode: "",
    message: "",
    geral: false,
    status: true,
    category: "",
    categoryColor: "#546E7A",
    isFavorite: false,
    autoSend: true,
    useInSlash: true,
  };

  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [quickemessage, setQuickemessage] = useState(initialState);
  const [attachment, setAttachment] = useState(null);
  const attachmentFile = useRef(null);
  const [expandedPanel, setExpandedPanel] = useState("main");
  const [sequenceEnabled, setSequenceEnabled] = useState(false);
  const [sequenceSteps, setSequenceSteps] = useState(() => [{ type: "text", body: "" }]);
  const [mediaFilesByStepIndex, setMediaFilesByStepIndex] = useState({});
  const [serverAttachments, setServerAttachments] = useState([]);

  const handleAccordionChange = (panel) => (_e, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const resetLocal = useCallback(() => {
    setQuickemessage(initialState);
    setAttachment(null);
    if (attachmentFile.current) attachmentFile.current.value = null;
    setExpandedPanel("main");
    setSequenceEnabled(false);
    setSequenceSteps([{ type: "text", body: "" }]);
    setMediaFilesByStepIndex({});
    setServerAttachments([]);
    mediaPickStepRef.current = null;
  }, []);

  useEffect(() => {
    if (!open || !quickemessageId) return;
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
        setQuickemessage((prevState) => ({
          ...prevState,
          ...data,
          autoSend: data.autoSend !== false,
          useInSlash: data.useInSlash !== false,
        }));
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
  }, [quickemessageId, open]);

  useEffect(() => {
    if (!open || quickemessageId) return;
    setSequenceEnabled(false);
    setSequenceSteps([{ type: "text", body: "" }]);
    if (initialDraft && initialDraft.message != null) {
      setQuickemessage((prev) => ({
        ...initialState,
        ...prev,
        ...initialDraft,
        message: String(initialDraft.message),
        autoSend: initialDraft.autoSend !== false,
        useInSlash: initialDraft.useInSlash !== false,
      }));
    } else {
      setQuickemessage(initialState);
    }
  }, [open, quickemessageId, initialDraft]);

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

  const handleSaveQuickeMessage = async (values) => {
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
    const quickemessageData = {
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

    const recordSnapshot = { ...quickemessage, companyId: quickemessage.companyId || user?.companyId };

    try {
      if (quickemessageId) {
        await api.put(`/quick-messages/${quickemessageId}`, quickemessageData);
        if (hasSeqMedia) {
          await uploadSequenceAttachments(quickemessageId, values, recordSnapshot);
        } else if (attachment != null) {
          const formData = new FormData();
          formData.append("typeArch", "quickMessage");
          formData.append("file", attachment);
          await api.post(
            `/quick-messages/${quickemessageId}/media-upload`,
            formData
          );
        }
      } else {
        const { data } = await api.post("/quick-messages", quickemessageData);
        if (hasSeqMedia) {
          await uploadSequenceAttachments(data.id, values, recordSnapshot);
        } else if (attachment != null) {
          const formData = new FormData();
          formData.append("typeArch", "quickMessage");
          formData.append("file", attachment);
          await api.post(`/quick-messages/${data.id}/media-upload`, formData);
        }
      }
      toast.success(i18n.t("quickMessages.toasts.success"));
      if (typeof notifySaved === "function") {
        notifySaved();
      }
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const deleteMedia = async () => {
    if (attachment) {
      setAttachment(null);
      attachmentFile.current.value = null;
      setConfirmationOpen(false);
      return;
    }

    if (quickemessage.mediaPath && quickemessage.id) {
      try {
        await api.delete(`/quick-messages/${quickemessage.id}/media-upload`);
        setQuickemessage((prev) => ({
          ...prev,
          mediaPath: null,
          mediaName: null,
          attachments: null,
        }));
        setServerAttachments([]);
        setMediaFilesByStepIndex({});
        toast.success(i18n.t("quickMessages.toasts.deleted"));
        if (typeof notifySaved === "function") {
          notifySaved();
        }
      } catch (err) {
        toastError(err);
      }
    }
    setConfirmationOpen(false);
  };

  const handleClickMsgVar = async (msgVar, setValueFunc) => {
    const el = messageInputRef.current;
    const firstHalfText = el.value.substring(0, el.selectionStart);
    const secondHalfText = el.value.substring(el.selectionEnd);
    const newCursorPos = el.selectionStart + msgVar.length;

    setValueFunc("message", `${firstHalfText}${msgVar}${secondHalfText}`);

    await new Promise((r) => setTimeout(r, 100));
    messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
  };

  return (
    <div className={classes.root}>
      <ConfirmationModal
        title={i18n.t("quickMessages.confirmationModal.deleteTitle")}
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={deleteMedia}
      >
        {i18n.t("quickMessages.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={narrowDialog ? "sm" : "md"}
        fullWidth
        fullScreen={fullScreenDialog}
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title" className={classes.dialogTitle}>
          {quickemessageId
            ? `${i18n.t("quickMessages.dialog.edit")}`
            : `${i18n.t("quickMessages.dialog.add")}`}
        </DialogTitle>
        <div style={{ display: "none" }}>
          <input
            type="file"
            ref={attachmentFile}
            accept={
              sequenceEnabled && sequenceSteps.some((s) => s.type === "media")
                ? "image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,application/pdf"
                : undefined
            }
            onChange={(e) => handleAttachment(e)}
          />
        </div>
        <Formik
          initialValues={quickemessage}
          enableReinitialize={true}
          validationSchema={QuickeMessageSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveQuickeMessage(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ touched, errors, isSubmitting, setFieldValue, values }) => {
            const disabledByShare =
              quickemessageId &&
              values.visao &&
              !values.geral &&
              values.userId !== user.id;
            return (
            <Form>
              <DialogContent dividers className={classes.dialogContent}>
                <Accordion
                  expanded={expandedPanel === "main"}
                  onChange={handleAccordionChange("main")}
                  elevation={0}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {i18n.t("quickMessages.dialog.accordionMain")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.accordionDetails}>
                    <Grid spacing={2} container>
                      <Grid xs={12} item>
                        <Field
                          as={TextField}
                          autoFocus
                          label={i18n.t("quickMessages.dialog.shortcode")}
                          name="shortcode"
                          disabled={disabledByShare}
                          error={touched.shortcode && Boolean(errors.shortcode)}
                          helperText={touched.shortcode && errors.shortcode}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                      </Grid>
                      <Grid xs={12} sm={8} item>
                        <Field
                          as={TextField}
                          label={i18n.t("quickMessages.dialog.category")}
                          name="category"
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          disabled={disabledByShare}
                        />
                      </Grid>
                      <Grid xs={12} sm={4} item>
                        <Field
                          as={TextField}
                          label={i18n.t("quickMessages.dialog.categoryColor")}
                          name="categoryColor"
                          type="color"
                          variant="outlined"
                          margin="dense"
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          disabled={disabledByShare}
                        />
                      </Grid>
                      <Grid xs={12} item>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={Boolean(values.isFavorite)}
                              onChange={(e) =>
                                setFieldValue("isFavorite", e.target.checked)
                              }
                              disabled={disabledByShare}
                              color="primary"
                            />
                          }
                          label={i18n.t("quickMessages.dialog.favorite")}
                        />
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={expandedPanel === "content"}
                  onChange={handleAccordionChange("content")}
                  elevation={0}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {i18n.t("quickMessages.dialog.accordionContent")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.accordionDetails}>
                    <Grid spacing={2} container>
                      <Grid item xs={12}>
                        <QuickMessageSequenceFormSection
                          sequenceEnabled={sequenceEnabled}
                          setSequenceEnabled={setSequenceEnabled}
                          sequenceSteps={sequenceSteps}
                          setSequenceSteps={setSequenceSteps}
                          getPlainMessage={() => values.message}
                          setPlainMessage={(s) => setFieldValue("message", s)}
                          disabled={disabledByShare}
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
                            label={i18n.t("quickMessages.dialog.message")}
                            name="message"
                            inputRef={messageInputRef}
                            error={touched.message && Boolean(errors.message)}
                            helperText={touched.message && errors.message}
                            variant="outlined"
                            margin="dense"
                            disabled={disabledByShare}
                            multiline={true}
                            rows={8}
                            fullWidth
                          />
                          <MessageVariablesPicker
                            disabled={isSubmitting || disabledByShare}
                            onClick={(value) => handleClickMsgVar(value, setFieldValue)}
                          />
                        </Grid>
                      ) : null}
                    </Grid>
                  </AccordionDetails>
                </Accordion>

                <Accordion
                  expanded={expandedPanel === "sharing"}
                  onChange={handleAccordionChange("sharing")}
                  elevation={0}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {i18n.t("quickMessages.dialog.accordionSharing")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.accordionDetails}>
                    <FormControl variant="outlined" margin="dense" fullWidth>
                      <InputLabel id="geral-selection-label">
                        {i18n.t("quickMessages.dialog.visao")}
                      </InputLabel>
                      <Field
                        as={Select}
                        label={i18n.t("quickMessages.dialog.visao")}
                        labelId="visao-selection-label"
                        id="visao"
                        disabled={disabledByShare}
                        name="visao"
                        onChange={(e) => {
                          setFieldValue("visao", e.target.value === "true");
                        }}
                        error={touched.visao && Boolean(errors.visao)}
                        value={values.visao ? "true" : "false"}
                      >
                        <MenuItem value={"true"}>
                          {i18n.t("announcements.active")}
                        </MenuItem>
                        <MenuItem value={"false"}>
                          {i18n.t("announcements.inactive")}
                        </MenuItem>
                      </Field>
                    </FormControl>
                    {values.visao === true && (
                      <FormControl variant="outlined" margin="dense" fullWidth>
                        <InputLabel id="geral-selection-label">
                          {i18n.t("quickMessages.dialog.geral")}
                        </InputLabel>
                        <Field
                          as={Select}
                          label={i18n.t("quickMessages.dialog.geral")}
                          labelId="novo-item-selection-label"
                          id="geral"
                          name="geral"
                          disabled={disabledByShare}
                          value={values.geral ? "true" : "false"}
                          error={touched.geral && Boolean(errors.geral)}
                        >
                          <MenuItem value={"true"}>
                            {i18n.t("announcements.active")}
                          </MenuItem>
                          <MenuItem value={"false"}>
                            {i18n.t("announcements.inactive")}
                          </MenuItem>
                        </Field>
                      </FormControl>
                    )}
                  </AccordionDetails>
                </Accordion>

                {!(sequenceEnabled && sequenceHasMediaStep(sequenceSteps)) ? (
                  <Accordion
                    expanded={expandedPanel === "attach"}
                    onChange={handleAccordionChange("attach")}
                    elevation={0}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2">
                        {i18n.t("quickMessages.dialog.accordionAttachments")}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails className={classes.accordionDetails}>
                      {(quickemessage.mediaPath || attachment) && (
                        <Grid xs={12} item>
                          <Button startIcon={<AttachFileIcon />}>
                            {attachment ? attachment.name : quickemessage.mediaName}
                          </Button>
                          <IconButton
                            onClick={() => setConfirmationOpen(true)}
                            color="secondary"
                            disabled={disabledByShare}
                          >
                            <DeleteOutlineIcon color="secondary" />
                          </IconButton>
                        </Grid>
                      )}
                      {!attachment && !quickemessage.mediaPath && (
                        <Button
                          color="primary"
                          onClick={() => attachmentFile.current.click()}
                          disabled={isSubmitting || disabledByShare}
                          variant="outlined"
                          startIcon={<AttachFileIcon />}
                        >
                          {i18n.t("quickMessages.buttons.attach")}
                        </Button>
                      )}
                    </AccordionDetails>
                  </Accordion>
                ) : null}

                <Accordion
                  expanded={expandedPanel === "settings"}
                  onChange={handleAccordionChange("settings")}
                  elevation={0}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle2">
                      {i18n.t("quickMessages.dialog.accordionSettings")}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails className={classes.accordionDetails}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={values.autoSend !== false}
                          onChange={(e) =>
                            setFieldValue("autoSend", e.target.checked)
                          }
                          disabled={disabledByShare}
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
                          onChange={(e) =>
                            setFieldValue("useInSlash", e.target.checked)
                          }
                          disabled={disabledByShare}
                          color="primary"
                        />
                      }
                      label={i18n.t("quickMessages.dialog.useInSlash")}
                    />
                    <Typography className={classes.helpText} component="p">
                      {i18n.t("quickMessages.dialog.useInSlashHelp")}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </DialogContent>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("quickMessages.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting || disabledByShare}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {quickemessageId
                    ? `${i18n.t("quickMessages.buttons.edit")}`
                    : `${i18n.t("quickMessages.buttons.add")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
            );
          }}
        </Formik>
      </Dialog>
    </div>
  );
};

export default QuickMessageDialog;
