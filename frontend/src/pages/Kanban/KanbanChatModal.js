import React, { useState, useEffect, useRef, useContext } from "react";
import {
  IconButton,
  Typography,
  makeStyles,
  Paper,
  CircularProgress,
  Box,
  Button,
} from "@material-ui/core";
import Close from "@material-ui/icons/Close";
import Visibility from "@material-ui/icons/Visibility";
import Minimize from "@material-ui/icons/Minimize";
import Fullscreen from "@material-ui/icons/Fullscreen";
import { AuthContext } from "../../context/Auth/AuthContext";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { QueueSelectedProvider } from "../../context/QueuesSelected/QueuesSelectedContext";
import MessagesList from "../../components/MessagesList";
import MessageInput from "../../components/MessageInput";
import TicketInfo from "../../components/TicketInfo";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  floating: {
    position: "fixed",
    width: 520,
    height: "min(720px, 85vh)",
    minWidth: 320,
    minHeight: 400,
    maxWidth: "calc(100vw - 24px)",
    maxHeight: "calc(100vh - 24px)",
    borderRadius: 12,
    boxShadow: theme.shadows[8],
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    zIndex: 1300,
    [theme.breakpoints.down("sm")]: {
      width: "calc(100vw - 16px)",
      height: "calc(100vh - 16px)",
      minWidth: "unset",
      minHeight: "unset",
      left: "8px !important",
      top: "8px !important",
    },
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0.75, 1),
    borderBottom: "1px solid rgba(0,0,0,0.12)",
    backgroundColor: theme.palette.background.paper,
    flexShrink: 0,
    cursor: "move",
    "&:active": { cursor: "grabbing" },
  },
  headerTitle: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
    padding: theme.spacing(2),
  },
  minimizedBar: {
    position: "fixed",
    height: 48,
    minWidth: 280,
    borderRadius: "12px 12px 0 0",
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0, 1),
    borderBottom: "none",
    boxShadow: theme.shadows[4],
    cursor: "move",
    zIndex: 1300,
    backgroundColor: theme.palette.background.paper,
  },
}));

/** Alinha o painel flutuante ao centro da viewport (largura/altura iguais às do CSS do modal). */
function getCenteredChatPosition() {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const modalW = vw <= 600 ? vw - 16 : Math.min(520, vw - 24);
  const modalH = vw <= 600 ? vh - 16 : Math.min(720, vh * 0.85);
  return {
    x: Math.round(Math.max(8, (vw - modalW) / 2)),
    y: Math.round(Math.max(8, (vh - modalH) / 2)),
  };
}

export default function KanbanChatModal({ open, onClose, ticketUuid, onVerQuadro }) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [contact, setContact] = useState(null);
  const [dragDropFiles, setDragDropFiles] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState(() => getCenteredChatPosition());
  const [dragStart, setDragStart] = useState(null);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open || !ticketUuid) {
      setTicket(null);
      setContact(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setMinimized(false);
    setPosition(getCenteredChatPosition());
    const fetchTicket = async () => {
      try {
        const { data } = await api.get("/tickets/u/" + ticketUuid);
        setContact(data.contact || {});
        setTicket(data);
      } catch (err) {
        const st = err?.response?.status;
        if (st === 404) {
          toast.info(
            "Não foi possível carregar este atendimento no sistema (ticket não encontrado). Se for quadro livre, use o WhatsApp no quadro ou verifique o cadastro."
          );
        } else {
          toastError(err);
        }
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [open, ticketUuid, onClose]);

  const handlePointerDown = (e) => {
    if (e.target.closest("button") || e.target.closest("[data-no-drag]")) return;
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handlePointerMove = (e) => {
    if (dragStart === null) return;
    let x = e.clientX - dragStart.x;
    let y = e.clientY - dragStart.y;
    const el = boxRef.current;
    const bw = el?.offsetWidth ?? 520;
    const bh = el?.offsetHeight ?? 480;
    x = Math.max(0, Math.min(x, window.innerWidth - bw));
    y = Math.max(0, Math.min(y, window.innerHeight - bh));
    setPosition({ x, y });
  };

  const handlePointerUp = () => setDragStart(null);

  useEffect(() => {
    if (dragStart === null) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragStart]);

  const handleVerQuadroClick = () => {
    if (onVerQuadro && ticketUuid) {
      onVerQuadro(ticketUuid);
      setMinimized(true);
    }
  };

  if (!open) return null;

  if (minimized) {
    return (
      <Paper
        className={classes.minimizedBar}
        style={{ left: position.x, top: position.y }}
        onPointerDown={handlePointerDown}
        ref={boxRef}
      >
        <div className={classes.headerTitle}>
          <Typography variant="body2" noWrap>
            💬 {contact?.name || "Chat"}
          </Typography>
        </div>
        <IconButton size="small" onClick={() => setMinimized(false)} title="Expandir">
          <Fullscreen fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose} title="Fechar">
          <Close fontSize="small" />
        </IconButton>
      </Paper>
    );
  }

  return (
    <Paper
      className={classes.floating}
      style={{ left: position.x, top: position.y }}
      ref={boxRef}
    >
      <div
        className={classes.header}
        onPointerDown={handlePointerDown}
      >
        <div className={classes.headerTitle}>
          {!loading && ticket && contact && (
            <TicketInfo contact={contact} ticket={ticket} onClick={onClose} />
          )}
          {loading && (
            <Typography variant="body2" color="textSecondary">Carregando...</Typography>
          )}
        </div>
        {onVerQuadro && (
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={handleVerQuadroClick}
            style={{ marginRight: 4 }}
            data-no-drag
          >
            Ver Quadro
          </Button>
        )}
        <IconButton size="small" onClick={() => setMinimized(true)} title="Minimizar" data-no-drag>
          <Minimize fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onClose} aria-label="Fechar" data-no-drag>
          <Close fontSize="small" />
        </IconButton>
      </div>

      <div className={classes.content}>
        {loading && (
          <Box className={classes.loadingBox}>
            <CircularProgress />
          </Box>
        )}

        {!loading && ticket && contact && (
          <QueueSelectedProvider>
            <ReplyMessageProvider>
              <ForwardMessageProvider>
                <EditMessageProvider>
                  <Paper elevation={0} className={classes.chatArea}>
                    <MessagesList
                      isGroup={ticket.isGroup}
                      onDrop={setDragDropFiles}
                      whatsappId={ticket.whatsappId}
                      queueId={ticket.queueId}
                      channel={ticket.channel}
                      ticketIdProp={ticket.uuid}
                    />
                    <MessageInput
                      ticketId={ticket.id}
                      ticketStatus={ticket.status}
                      ticketChannel={ticket.channel}
                      droppedFiles={dragDropFiles}
                      contactId={contact.id}
                    />
                  </Paper>
                </EditMessageProvider>
              </ForwardMessageProvider>
            </ReplyMessageProvider>
          </QueueSelectedProvider>
        )}
      </div>
    </Paper>
  );
}
