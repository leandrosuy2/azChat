import React from "react";
import { Box, Button, IconButton, Typography, makeStyles } from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { i18n } from "../../translate/i18n";
import formatQuickMessageTemplate from "../../utils/formatQuickMessageTemplate";
import {
  parseQuickMessageSequence,
  parseAttachmentsList,
  buildQuickMessageAttachmentPublicUrl,
  mediaOrdinalAtStepIndex,
} from "../../utils/quickMessageSequence";

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
  title: { fontSize: "0.9rem", lineHeight: 1.3 },
  textBody: { fontSize: "0.8125rem", lineHeight: 1.35 },
  previewMedia: {
    maxWidth: "100%",
    maxHeight: 280,
    marginTop: theme.spacing(1),
  },
  seqStep: {
    marginBottom: theme.spacing(1.25),
    padding: theme.spacing(1),
    borderRadius: 4,
    border: `1px solid ${theme.palette.divider}`,
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

const inferKind = (mediaPath) => {
  if (!mediaPath) return "text";
  const u = String(mediaPath).toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u)) return "image";
  if (/\.(mp4|webm|3gp|mov)(\?|$)/i.test(u)) return "video";
  if (/\.(mp3|ogg|opus|wav|m4a|aac|flac)(\?|$)/i.test(u)) return "audio";
  if (/\.pdf(\?|$)/i.test(u)) return "pdf";
  return "file";
};

const previewUrlForMediaIndex = (preview, mediaIndex) => {
  const list = parseAttachmentsList(preview?.attachments);
  const row = mediaIndex != null ? list[mediaIndex] : null;
  if (row?.path) {
    return buildQuickMessageAttachmentPublicUrl(
      { companyId: preview?.companyId, mediaPath: preview?.mediaPath },
      row.path
    );
  }
  if (mediaIndex === 0 && preview?.mediaPath) return preview.mediaPath;
  return null;
};

/** Pré-visualização só dentro do painel (sem Dialog). */
const SidebarQuickReplyPreviewModal = ({
  open,
  onClose,
  preview,
  ticket,
  contact,
  user,
  onSend,
}) => {
  const classes = useStyles();
  const mediaPath = preview?.mediaPath;
  const kind = inferKind(mediaPath);
  const ctx = { ticket, contact, user };

  const seq = preview?.message ? parseQuickMessageSequence(preview.message) : null;

  const formattedPlain = !seq
    ? formatQuickMessageTemplate(preview?.message || "", ctx)
    : "";

  if (!open) return null;

  return (
    <Box className={classes.root}>
      <Box className={classes.header}>
        <Typography className={classes.title} component="span" variant="subtitle1" style={{ fontWeight: 700 }}>
          {preview?.shortcode ? `/${preview.shortcode}` : ""}
        </Typography>
        <IconButton size="small" onClick={onClose} aria-label="close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box className={classes.body}>
        {seq ? (
          <>
            <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
              {i18n.t("messagesInput.quickReplies.sequencePreviewLabel")}
            </Typography>
            {seq.steps.map((st, idx) => {
              if (st.type === "text") {
                const t = formatQuickMessageTemplate(String(st.body || ""), ctx);
                if (!String(t).trim()) return null;
                return (
                  <Box key={idx} className={classes.seqStep}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {i18n.t("messagesInput.quickReplies.sequenceStepText")}
                    </Typography>
                    <Typography variant="body2" className={classes.textBody} style={{ whiteSpace: "pre-wrap" }}>
                      {t}
                    </Typography>
                  </Box>
                );
              }
              if (st.type === "delay") {
                return (
                  <Box key={idx} className={classes.seqStep}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {i18n.t("messagesInput.quickReplies.sequenceStepDelay")}
                    </Typography>
                    <Typography variant="body2">{st.seconds}s</Typography>
                  </Box>
                );
              }
              if (st.type === "media") {
                const cap = formatQuickMessageTemplate(String(st.caption || ""), ctx);
                const mi =
                  typeof st.mediaIndex === "number"
                    ? st.mediaIndex
                    : mediaOrdinalAtStepIndex(seq.steps, idx);
                const stepMediaUrl = previewUrlForMediaIndex(preview, mi);
                const stepKind = inferKind(stepMediaUrl || "");
                const attList = parseAttachmentsList(preview?.attachments);
                const row = mi != null ? attList[mi] : null;
                const attachLabel = row?.name || (mi === 0 ? preview?.mediaName : null);
                return (
                  <Box key={idx} className={classes.seqStep}>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {i18n.t("messagesInput.quickReplies.sequenceStepMedia")}
                    </Typography>
                    {String(cap).trim() ? (
                      <Typography variant="body2" className={classes.textBody} style={{ whiteSpace: "pre-wrap" }}>
                        {cap}
                      </Typography>
                    ) : null}
                    {stepMediaUrl && stepKind === "image" && (
                      <img className={classes.previewMedia} src={stepMediaUrl} alt="" />
                    )}
                    {stepMediaUrl && stepKind === "video" && (
                      <video className={classes.previewMedia} src={stepMediaUrl} controls />
                    )}
                    {stepMediaUrl && stepKind === "audio" && (
                      <audio className={classes.previewMedia} src={stepMediaUrl} controls />
                    )}
                    {stepMediaUrl && (stepKind === "pdf" || stepKind === "file") && (
                      <Typography variant="caption" color="textSecondary" display="block">
                        {attachLabel || i18n.t("messagesInput.quickReplies.attachment")}
                      </Typography>
                    )}
                  </Box>
                );
              }
              return null;
            })}
          </>
        ) : (
          <>
            <Typography variant="body2" className={classes.textBody} style={{ whiteSpace: "pre-wrap" }}>
              {formattedPlain}
            </Typography>
            {mediaPath && kind === "image" && (
              <img className={classes.previewMedia} src={mediaPath} alt="" />
            )}
            {mediaPath && kind === "video" && (
              <video className={classes.previewMedia} src={mediaPath} controls />
            )}
            {mediaPath && kind === "audio" && (
              <audio className={classes.previewMedia} src={mediaPath} controls />
            )}
            {mediaPath && (kind === "pdf" || kind === "file") && (
              <Typography variant="caption" color="textSecondary" display="block">
                {preview?.mediaName || i18n.t("messagesInput.quickReplies.attachment")}
              </Typography>
            )}
          </>
        )}
      </Box>
      <Box className={classes.footer}>
        <Button onClick={onClose}>{i18n.t("quickMessages.buttons.cancel")}</Button>
        <Button color="primary" variant="contained" onClick={onSend}>
          {i18n.t("messagesInput.quickReplies.send")}
        </Button>
      </Box>
    </Box>
  );
};

export default SidebarQuickReplyPreviewModal;
