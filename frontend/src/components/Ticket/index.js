import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";

import clsx from "clsx";

import { makeStyles, Paper, Box, Drawer, Typography } from "@material-ui/core";

import ContactDrawer from "../ContactDrawer";
import MessageInput from "../MessageInput";
import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtonsCustom";
import MessagesList from "../MessagesList";
import TicketFloatingActions from "../TicketFloatingActions";
import QuickRepliesSidebar from "../QuickRepliesSidebar";
import api from "../../services/api";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageProvider } from "../../context/ForwarMessage/ForwardMessageContext";

import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TagsContainer } from "../TagsContainer";
import { isNil } from 'lodash';
import { EditMessageProvider } from "../../context/EditingMessage/EditingMessageContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import { isSocketClientReady } from "../../utils/socketClient";
import canPerform, { isUiHidden } from "../../utils/permissions";

const drawerWidth = 450;

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    height: "100%",
    position: "relative",
    overflow: "hidden",
  },

  mainWrapper: {
    flex: 1,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeft: "0",
    marginRight: -drawerWidth,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },

  mainWrapperShift: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: 0,
  },
  contentWithFloating: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    overflow: "hidden",
  },
  quickRepliesDrawerPaper: {
    width: 320,
    maxWidth: "min(320px, 92vw)",
    display: "flex",
    flexDirection: "column",
  },
  /** Respostas rápidas à direita; z-index acima de pais com overflow:hidden */
  quickRepliesModal: {
    zIndex: 1400,
  },
}));

const Ticket = () => {
  const { ticketId } = useParams();
  const classes = useStyles();

  const { user, socket } = useContext(AuthContext);
  const hideQuickReplies =
    isUiHidden(user, "showQuickReplies") || !canPerform(user, "quickMessages:view");
  const { setTabOpen } = useContext(TicketsContext);

  const rootRef = useRef(null);
  /** Com painel estreito, marginRight:-450 “come” o chat; usa layout sem margem negativa. */
  const [panelTooNarrowForDrawerMargin, setPanelTooNarrowForDrawerMargin] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [contact, setContact] = useState({});
  const [ticket, setTicket] = useState({});
  const [dragDropFiles, setDragDropFiles] = useState([]);
  const { companyId } = user;
  const quickReplyHandlersRef = useRef({});
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [quickReplyDraft, setQuickReplyDraft] = useState(null);

  const refreshTicket = useCallback(async () => {
    if (isNil(ticketId) || ticketId === "undefined") return;
    try {
      const { data } = await api.get("/tickets/u/" + ticketId);
      setContact(data.contact);
      setTicket(data);
      setNotFound(false);
    } catch (err) {
      setNotFound(true);
      toastError(err);
    }
  }, [ticketId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const minComfort = drawerWidth + 200;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      setPanelTooNarrowForDrawerMargin(w > 0 && w < minComfort);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchTicket = async () => {
        try {

          if (!isNil(ticketId) && ticketId !== "undefined") {

            const { data } = await api.get("/tickets/u/" + ticketId);

            setContact(data.contact);
            // setWhatsapp(data.whatsapp);
            // setQueueId(data.queueId);
            setTicket(data);
            setNotFound(false);
            if (["pending", "open", "group"].includes(data.status)) {
              setTabOpen(data.status);
            }
            setLoading(false);
          }
        } catch (err) {
          setNotFound(true);
          setTicket({});
          setContact({});
          setLoading(false);
          toastError(err);
        }
      };
      fetchTicket();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [ticketId]);

  const ticketIdRef = useRef(ticket.id);
  ticketIdRef.current = ticket.id;

  useEffect(() => {
    if (!ticket.id || ticketId === "undefined") {
      return;
    }

    if (!user.companyId || !isSocketClientReady(socket)) {
      return;
    }

    const onConnectTicket = () => {
      socket.emit("joinChatBox", `${ticket.id}`);
    };

    const onCompanyTicket = (data) => {
      if (data.action === "update" && data.ticket.id === ticketIdRef.current) {
        setTicket(data.ticket);
      }

      if (data.action === "delete" && data.ticketId === ticketIdRef.current) {
        setNotFound(true);
        setTicket({});
        setContact({});
      }
    };

    const onCompanyContactTicket = (data) => {
      if (data.action === "update") {
        setContact((prevState) => {
          if (prevState.id === data.contact?.id) {
            return { ...prevState, ...data.contact };
          }
          return prevState;
        });
      }
    };

    socket.on("connect", onConnectTicket);
    socket.on(`company-${companyId}-ticket`, onCompanyTicket);
    socket.on(`company-${companyId}-contact`, onCompanyContactTicket);

    return () => {
      if (isSocketClientReady(socket)) {
        socket.emit("joinChatBoxLeave", `${ticket.id}`);
        socket.off("connect", onConnectTicket);
        socket.off(`company-${companyId}-ticket`, onCompanyTicket);
        socket.off(`company-${companyId}-contact`, onCompanyContactTicket);
      }
    };
  }, [ticketId, ticket.id, user.companyId, companyId, socket]);

  const handleDrawerOpen = useCallback(() => {
    setQuickRepliesOpen(false);
    setDrawerOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  /** Um único drawer visível: respostas rápidas fecham o painel do contato (e vice-versa ao abrir o contato). */
  const handleToggleQuickReplies = useCallback(() => {
    setQuickRepliesOpen((v) => {
      const next = !v;
      if (next) setDrawerOpen(false);
      return next;
    });
  }, []);

  const handleDraftQuickReply = useCallback((messageBody) => {
    setQuickReplyDraft({ message: messageBody });
    setDrawerOpen(false);
    setQuickRepliesOpen(true);
  }, []);

  const renderMessagesList = () => {
    if (notFound) {
      return (
        <Box
          display="flex"
          flex={1}
          minHeight={0}
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          p={3}
        >
          <Box>
            <Typography variant="h6">Conversa nao encontrada</Typography>
            <Typography variant="body2" color="textSecondary">
              A conversa pode ter sido removida, finalizada ou nao esta mais disponivel para o seu usuario.
            </Typography>
          </Box>
        </Box>
      );
    }

    return (
      <Box display="flex" flexDirection="column" flex={1} minHeight={0} minWidth={0}>
        <MessagesList
          isGroup={ticket.isGroup}
          onDrop={setDragDropFiles}
          whatsappId={ticket.whatsappId}
          queueId={ticket.queueId}
          channel={ticket.channel}
          onDraftQuickReply={handleDraftQuickReply}
        >
        </MessagesList>
        {ticketId && ticketId !== "undefined" && (
          <TicketFloatingActions ticketId={ticketId} />
        )}
        <MessageInput
          ticketId={ticket.id}
          ticketStatus={ticket.status}
          ticketChannel={ticket.channel}
          droppedFiles={dragDropFiles}
          contactId={contact.id}
          ticket={ticket}
          contact={contact}
          quickReplyHandlersRef={quickReplyHandlersRef}
          quickRepliesOpen={quickRepliesOpen}
          onToggleQuickReplies={handleToggleQuickReplies}
        />
      </Box>
    );
  };


  return (
    <div ref={rootRef} className={classes.root} id="drawer-container">
      <Paper
        variant="outlined"
        elevation={0}
        className={clsx(classes.mainWrapper, {
          [classes.mainWrapperShift]: drawerOpen || panelTooNarrowForDrawerMargin,
        })}
      >
        <div className={classes.contentWithFloating}>
          <TicketHeader loading={loading}>
            <Box
              display="flex"
              flexWrap="wrap"
              alignItems="center"
              flex={1}
              minWidth={0}
              style={{ gap: 8 }}
            >
              {ticket.contact !== undefined && (
                <Box id="TicketHeader" flex="1 1 200px" minWidth={0}>
                  <TicketInfo
                    contact={contact}
                    ticket={ticket}
                    onClick={handleDrawerOpen}
                  />
                </Box>
              )}
              <Box flexShrink={0}>
                <TicketActionButtons
                  ticket={ticket}
                  contact={contact}
                />
              </Box>
            </Box>
          </TicketHeader>
          <Box
            component={Paper}
            elevation={0}
            square
            style={{ padding: "2px 6px", margin: 0, flexShrink: 0 }}
          >
            <TagsContainer contact={contact} />
          </Box>
          <ReplyMessageProvider>
            <ForwardMessageProvider>
              <EditMessageProvider>
                {renderMessagesList()}
              </EditMessageProvider>
            </ForwardMessageProvider>
          </ReplyMessageProvider>
        </div>
      </Paper>

      {!hideQuickReplies && (
      <Drawer
        variant="temporary"
        anchor="right"
        open={quickRepliesOpen}
        onClose={() => setQuickRepliesOpen(false)}
        classes={{
          paper: classes.quickRepliesDrawerPaper,
          modal: classes.quickRepliesModal,
        }}
        ModalProps={{
          container: typeof document !== "undefined" ? document.body : undefined,
        }}
      >
        <QuickRepliesSidebar
          open
          ticket={ticket}
          contact={contact}
          quickReplyHandlersRef={quickReplyHandlersRef}
          onClose={() => setQuickRepliesOpen(false)}
          draftQuickMessage={quickReplyDraft}
          onDraftQuickMessageConsumed={() => setQuickReplyDraft(null)}
        />
      </Drawer>
      )}

      <ContactDrawer
        open={drawerOpen}
        handleDrawerClose={handleDrawerClose}
        contact={contact}
        loading={loading}
        ticket={ticket}
        refreshTicket={refreshTicket}
        quickRepliesOpen={quickRepliesOpen}
        onToggleQuickReplies={hideQuickReplies ? undefined : handleToggleQuickReplies}
      />

    </div>
  );
};

export default Ticket;
