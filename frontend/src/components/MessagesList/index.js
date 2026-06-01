import React, { useContext, useState, useEffect, useReducer, useRef, memo, useCallback, useMemo } from "react";
import { isSameDay, parseISO, format } from "date-fns";
import clsx from "clsx";
import { isNil } from "lodash";
import { blue, green, red } from "@material-ui/core/colors";
import {
  Button,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  makeStyles,
  Badge,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";

import {
  AccessTime,
  Block,
  Done,
  DoneAll,
  ExpandMore,
  GetApp,
  Facebook,
  Instagram,
  Reply,
  Close,
  Search,
  KeyboardArrowUp,
  KeyboardArrowDown,
  UnfoldLess,
} from "@material-ui/icons";

import MarkdownWrapper from "../MarkdownWrapper";
import VcardPreview from "../VcardPreview";
import LocationPreview from "../LocationPreview";
import ModalImageCors from "../ModalImageCors";
import MessageOptionsMenu from "../MessageOptionsMenu";
import whatsBackground from "../../assets/wa-background.png";
import whatsBackgroundDark from "../../assets/wa-background-dark.png";
import YouTubePreview from "../ModalYoutubeCors";

import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import { ForwardMessageContext } from "../../context/ForwarMessage/ForwardMessageContext";

import api from "../../services/api";
import toastError from "../../errors/toastError";
// import { SocketContext } from "../../context/Socket/SocketContext";
import { i18n } from "../../translate/i18n";
import SelectMessageCheckbox from "./SelectMessageCheckbox";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { AuthContext } from "../../context/Auth/AuthContext";
import { isSocketClientReady } from "../../utils/socketClient";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";
import AudioModal from "../AudioModal";
import { messages } from "../../translate/languages";
import { useParams, useHistory } from 'react-router-dom';

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const useStyles = makeStyles((theme) => ({
  messagesListWrapper: {
    overflow: "hidden",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    width: "100%",
    minWidth: 300,
    minHeight: 200,
  },

  currentTick: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "95%",
    backgroundColor: theme.palette.primary.main,
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "1px 5px 10px #b3b3b3",
  },

  currentTicktText: {
    color: theme.palette.primary,
    fontWeight: 'bold',
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  messagesList: {
    backgroundImage: theme.mode === 'light' ? `url(${whatsBackground})` : `url(${whatsBackgroundDark})`,
    backgroundColor: theme.mode === 'light' ? "transparent" : "#0b0b0d",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    padding: "8px 10px 16px 10px",
    overflowY: "scroll",
    position: "relative",
    ...theme.scrollbarStyles,
    [theme.breakpoints.down("sm")]: {
      padding: "6px 8px 12px 8px",
    },
  },

  messagesListLinear: {
    position: "sticky",
    top: 0,
    zIndex: 6,
    width: "calc(100% + 20px)",
    marginLeft: -10,
    marginRight: -10,
    height: 3,
    flexShrink: 0,
    borderRadius: 0,
    [theme.breakpoints.down("sm")]: {
      width: "calc(100% + 16px)",
      marginLeft: -8,
      marginRight: -8,
    },
  },
  dragElement: {
    background: 'rgba(255, 255, 255, 0.8)',
    position: "absolute",
    width: "100%",
    height: "100%",
    zIndex: 999999,
    textAlign: "center",
    fontSize: "3em",
    border: "5px dashed #333",
    color: '#333',
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },
  messageLeft: {
    marginRight: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },

    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === 'light' ? "#ffffff" : "#202c33",
    color: theme.mode === 'light' ? "#303030" : "#ffffff",
    alignSelf: "flex-start",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.mode === 'light' ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000"
  },

  quotedContainerLeft: {
    margin: "-3px -80px 6px -6px",
    overflow: "hidden",
    backgroundColor: theme.mode === 'light' ? "#f0f0f0" : "#1d282f",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsg: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    display: "block",
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  },

  quotedSideColorLeft: {
    flex: "none",
    width: "4px",
    backgroundColor: "#388aff",
  },

  messageRight: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },
    whiteSpace: "pre-wrap",
    backgroundColor: theme.mode === 'light' ? "#dcf8c6" : "#005c4b",
    color: theme.mode === 'light' ? "#303030" : "#ffffff",
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.mode === 'light' ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000"
  },

  messageRightPrivate: {
    marginLeft: 20,
    marginTop: 2,
    minWidth: 100,
    maxWidth: 600,
    height: "auto",
    display: "block",
    position: "relative",
    "&:hover #messageActionsButton": {
      display: "flex",
      position: "absolute",
      top: 0,
      right: 0,
    },
    whiteSpace: "pre-wrap",
    backgroundColor: "#F0E68C",
    color: "#303030",
    alignSelf: "flex-end",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 0,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: theme.mode === 'light' ? "0 1px 1px #b3b3b3" : "0 1px 1px #000000"
  },

  quotedContainerRight: {
    margin: "-3px -80px 6px -6px",
    overflowY: "hidden",
    backgroundColor: theme.mode === 'light' ? "#cfe9ba" : "#025144",
    borderRadius: "7.5px",
    display: "flex",
    position: "relative",
  },

  quotedMsgRight: {
    padding: 10,
    maxWidth: 300,
    height: "auto",
    whiteSpace: "pre-wrap",
  },

  quotedSideColorRight: {
    flex: "none",
    width: "4px",
    backgroundColor: "#35cd96",
  },

  messageActionsButton: {
    display: "none",
    position: "relative",
    color: "#999",
    zIndex: 1,
    backgroundColor: "inherit",
    opacity: "90%",
    "&:hover, &.Mui-focusVisible": { backgroundColor: "inherit" },
  },

  messageContactName: {
    display: "flex",
    color: "#6bcbef",
    fontWeight: 500,
  },

  textContentItem: {
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  textContentItemDeleted: {
    fontStyle: "italic",
    color: "rgba(0, 0, 0, 0.36)",
    overflowWrap: "break-word",
    padding: "3px 80px 6px 6px",
  },

  messageMedia: {
    objectFit: "cover",
    width: 400,
    height: "auto",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },

  timestamp: {
    fontSize: 11,
    position: "absolute",
    bottom: 0,
    right: 5,
    color: "#999",
  },

  forwardMessage: {
    fontSize: 12,
    fontStyle: "italic",
    position: "absolute",
    top: 0,
    left: 5,
    color: "#999",
    display: "flex",
    alignItems: "center"
  },

  dailyTimestamp: {
    alignItems: "center",
    textAlign: "center",
    alignSelf: "center",
    width: "110px",
    backgroundColor: "#e1f3fb",
    margin: "10px",
    borderRadius: "10px",
    boxShadow: "0 1px 1px #b3b3b3",
  },

  dailyTimestampText: {
    color: "#808888",
    padding: 8,
    alignSelf: "center",
    marginLeft: "0px",
  },

  ackIcons: {
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  deletedIcon: {
    fontSize: 18,
    verticalAlign: "middle",
    marginRight: 4,
  },

  ackDoneAllIcon: {
    color: blue[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },

  ackPlayedIcon: {
    color: green[500],
    fontSize: 18,
    verticalAlign: "middle",
    marginLeft: 4,
  },
  downloadMedia: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "inherit",
    padding: 10,
    color: theme.mode === "light" ? theme.palette.light : theme.palette.dark,
  },

  messageCenter: {
    marginTop: 5,
    alignItems: "center",
    verticalAlign: "center",
    alignContent: "center",
    backgroundColor: "#E1F5FEEB",
    fontSize: "12px",
    minWidth: 100,
    maxWidth: 270,
    color: "#272727",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingLeft: 5,
    paddingRight: 5,
    paddingTop: 5,
    paddingBottom: 0,
    boxShadow: "0 1px 1px #b3b3b3",
  },

  deletedMessage: {
    color: '#f55d65'
  },

  conversationSearchBarCollapsed: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexShrink: 0,
    padding: "2px 4px",
    minHeight: 28,
    borderBottom:
      theme.mode === "light" ? "1px solid rgba(0, 0, 0, 0.06)" : `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.mode === "light" ? "#f0f2f5" : "#202c33",
  },

  searchRevealBtn: {
    padding: 4,
  },

  conversationSearchBar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    padding: "2px 4px",
    flexShrink: 0,
    borderBottom:
      theme.mode === "light" ? "1px solid rgba(0, 0, 0, 0.06)" : `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.mode === "light" ? "#f0f2f5" : "#202c33",
    [theme.breakpoints.down("xs")]: {
      padding: "2px",
    },
  },

  conversationSearchField: {
    flex: "1 1 100px",
    minWidth: 0,
    maxWidth: "100%",
    "& .MuiOutlinedInput-root": {
      backgroundColor: theme.mode === "light" ? "#fff" : "#2a3942",
      borderRadius: 6,
      fontSize: 12,
      minHeight: 30,
    },
    "& .MuiOutlinedInput-input": {
      padding: "5px 8px",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.mode === "light" ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.12)",
    },
    "& .MuiInputAdornment-root": {
      marginLeft: 4,
    },
  },

  searchActionsGroup: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    gap: 2,
  },

  searchNavStack: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    "& .MuiIconButton-root": {
      padding: 2,
    },
  },

  searchHistoryHint: {
    fontSize: 10,
    lineHeight: 1.2,
    color: theme.palette.text.secondary,
    maxWidth: 120,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  searchHighlight: {
    backgroundColor: theme.palette.type === "dark" ? "rgba(255, 220, 100, 0.4)" : "rgba(255, 235, 59, 0.85)",
    color: "inherit",
    padding: "0 2px",
    borderRadius: 2,
  },

  messageSearchActive: {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    borderRadius: 8,
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_MESSAGES") {
    const messages = action.payload;
    const newMessages = [];

    messages.forEach((message) => {

      const messageIndex = state.findIndex((m) => m.id === message.id);
      if (messageIndex !== -1) {
        state[messageIndex] = message;
      } else {
        newMessages.push(message);
      }
    });

    return [...newMessages, ...state];
  }

  if (action.type === "ADD_MESSAGE") {
    const newMessage = action.payload;
    const messageIndex = state.findIndex((m) => m.id === newMessage.id);

    if (messageIndex !== -1) {
      state[messageIndex] = newMessage;
    } else {
      state.push(newMessage);
    }

    return [...state];
  }

  if (action.type === "UPDATE_MESSAGE") {
    const messageToUpdate = action.payload;
    const messageIndex = state.findIndex((m) => m.id === messageToUpdate.id);

    if (messageIndex !== -1) {
      state[messageIndex] = messageToUpdate;
    }

    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "DELETE_MESSAGE") {
    return state.filter((m) => m.id !== action.payload);
  }

  return state;
};

const MessagesList = ({
  isGroup,
  onDrop,
  whatsappId,
  queueId,
  channel,
  ticketIdProp,
}) => {
  const classes = useStyles();
  const [messagesList, dispatch] = useReducer(reducer, []);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const history = useHistory();
  const lastMessageRef = useRef();

  const [selectedMessage, setSelectedMessage] = useState({});
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const messageOptionsMenuOpen = Boolean(anchorEl);
  const { ticketId: ticketIdFromParams } = useParams();
  const ticketId = ticketIdProp !== undefined && ticketIdProp !== null ? ticketIdProp : ticketIdFromParams;

  const currentTicketId = useRef(ticketId);
  const { getAll } = useCompanySettings();
  const [dragActive, setDragActive] = useState(false);

  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState(false);
  const { selectedQueuesMessage } = useContext(QueueSelectedContext);

  const { showSelectMessageCheckbox } = useContext(ForwardMessageContext);

  const { user, socket } = useContext(AuthContext);

  const companyId = user.companyId;

  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const [chatSearchExpanded, setChatSearchExpanded] = useState(false);
  const chatSearchInputRef = useRef(null);
  const messageRefsById = useRef({});
  const searchHistoryLoadsRef = useRef(0);

  const assignMessageRef = useCallback((id) => (el) => {
    if (el) {
      messageRefsById.current[id] = el;
    } else {
      delete messageRefsById.current[id];
    }
  }, []);

  const matchesChatSearch = useCallback(
    (message) => {
      const q = chatSearchQuery.trim().toLowerCase();
      if (!q) return false;
      const body = message.body != null ? String(message.body) : "";
      return body.toLowerCase().includes(q);
    },
    [chatSearchQuery]
  );

  const chatSearchMatches = useMemo(
    () => messagesList.filter(matchesChatSearch).map((m) => m.id),
    [messagesList, matchesChatSearch]
  );

  const highlightQuery = chatSearchQuery.trim();

  const safeActiveSearchIndex = useMemo(() => {
    if (chatSearchMatches.length === 0) return 0;
    return Math.min(activeSearchIndex, chatSearchMatches.length - 1);
  }, [activeSearchIndex, chatSearchMatches]);

  const highlightParts = useCallback(
    (text) => {
      if (!highlightQuery || text == null) return text;
      const s = String(text);
      const parts = s.split(new RegExp(`(${escapeRegExp(highlightQuery)})`, "gi"));
      return parts.map((part, i) => {
        if (part.toLowerCase() === highlightQuery.toLowerCase()) {
          return (
            <mark key={i} className={classes.searchHighlight}>
              {part}
            </mark>
          );
        }
        return part;
      });
    },
    [highlightQuery, classes.searchHighlight]
  );

  const goToNextSearchMatch = useCallback(() => {
    if (chatSearchMatches.length === 0) return;
    setActiveSearchIndex((i) => (i + 1) % chatSearchMatches.length);
  }, [chatSearchMatches.length]);

  const goToPrevSearchMatch = useCallback(() => {
    if (chatSearchMatches.length === 0) return;
    setActiveSearchIndex((i) => (i - 1 + chatSearchMatches.length) % chatSearchMatches.length);
  }, [chatSearchMatches.length]);

  useEffect(() => {
    if (chatSearchMatches.length === 0) {
      if (activeSearchIndex !== 0) setActiveSearchIndex(0);
      return;
    }
    if (activeSearchIndex >= chatSearchMatches.length) {
      setActiveSearchIndex(chatSearchMatches.length - 1);
    }
  }, [chatSearchMatches, activeSearchIndex]);

  useEffect(() => {
    if (!highlightQuery || chatSearchMatches.length === 0) return;
    const id = chatSearchMatches[safeActiveSearchIndex];
    const el = messageRefsById.current[id];
    if (el) {
      const t = setTimeout(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 80);
      return () => clearTimeout(t);
    }
  }, [highlightQuery, chatSearchMatches, safeActiveSearchIndex]);

  useEffect(() => {
    if (!chatSearchExpanded) return undefined;
    const t = setTimeout(() => {
      const input = chatSearchInputRef.current;
      if (input) input.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [chatSearchExpanded]);

  useEffect(() => {
    if (!chatSearchExpanded) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setChatSearchExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chatSearchExpanded]);

  useEffect(() => {

    async function fetchData() {

      const settings = await getAll(companyId);

      let settinglgpdDeleteMessage;
      let settingEnableLGPD;

      for (const [key, value] of Object.entries(settings)) {

        if (key === "lgpdDeleteMessage") settinglgpdDeleteMessage = value
        if (key === "enableLGPD") settingEnableLGPD = value
      }
      if (settingEnableLGPD === "enabled" && settinglgpdDeleteMessage === "enabled") {
        setLGPDDeleteMessage(true);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);

    currentTicketId.current = ticketId;
  }, [ticketId, selectedQueuesMessage]);

  useEffect(() => {
    setChatSearchQuery("");
    setActiveSearchIndex(0);
    setChatSearchExpanded(false);
    searchHistoryLoadsRef.current = 0;
  }, [ticketId]);

  useEffect(() => {
    searchHistoryLoadsRef.current = 0;
  }, [highlightQuery]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchMessages = async () => {
        if (ticketId === "undefined" && !ticketIdProp) {
          history.push("/tickets");
          return;
        }
        if (isNil(ticketId)) return;
        try {
          const { data } = await api.get("/messages/" + ticketId, {
            params: { pageNumber, selectedQueues: JSON.stringify(selectedQueuesMessage) },
          });

          if (currentTicketId.current === ticketId) {
            dispatch({ type: "LOAD_MESSAGES", payload: data.messages });
            setHasMore(data.hasMore);
            setLoading(false);
            setLoadingMore(false);
          }

          if (pageNumber === 1 && data.messages.length > 1) {
            scrollToBottom();
          }
        } catch (err) {
          setLoading(false);
          toastError(err);
          setLoadingMore(false);
        }
      };

      fetchMessages();
    }, 500);
    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [pageNumber, ticketId, selectedQueuesMessage]);

  useEffect(() => {
    if (ticketId === "undefined") {
      return;
    }

    if (!user?.companyId || !isSocketClientReady(socket)) {
      return;
    }

    const companyId = user.companyId;

    const connectEventMessagesList = () => {
      socket.emit("joinChatBox", `${ticketId}`);
    };

    const onAppMessageMessagesList = (data) => {
      if (data.action === "create" && data.ticket.uuid === ticketId) {
        dispatch({ type: "ADD_MESSAGE", payload: data.message });
        scrollToBottom();
      }

      if (data.action === "update" && data?.message?.ticket?.uuid === ticketId) {
        dispatch({ type: "UPDATE_MESSAGE", payload: data.message });
      }

      if (data.action == "delete" && data.message.ticket?.uuid === ticketId) {
        dispatch({ type: "DELETE_MESSAGE", payload: data.messageId });
      }
    };
    socket.on("connect", connectEventMessagesList);
    socket.on(`company-${companyId}-appMessage`, onAppMessageMessagesList);

    return () => {
      if (isSocketClientReady(socket)) {
        socket.emit("joinChatBoxLeave", `${ticketId}`);
        socket.off("connect", connectEventMessagesList);
        socket.off(`company-${companyId}-appMessage`, onAppMessageMessagesList);
      }
    };
  }, [ticketId, user?.companyId, socket]);

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    setPageNumber((prevPageNumber) => prevPageNumber + 1);
  }, [loadingMore]);

  useEffect(() => {
    if (!highlightQuery) return;
    if (chatSearchMatches.length > 0) {
      searchHistoryLoadsRef.current = 0;
      return;
    }
    if (!hasMore) return;
    if (loading || loadingMore) return;
    if (searchHistoryLoadsRef.current >= 35) return;

    const timer = setTimeout(() => {
      searchHistoryLoadsRef.current += 1;
      loadMore();
    }, 450);
    return () => clearTimeout(timer);
  }, [
    highlightQuery,
    chatSearchMatches.length,
    hasMore,
    loading,
    loadingMore,
    messagesList.length,
    loadMore,
  ]);

const scrollToBottom = () => {
  setTimeout(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({});
    }
  }, 100);
};

const handleScroll = (e) => {
  if (!hasMore) return;
  const { scrollTop } = e.currentTarget;

  if (scrollTop === 0) {
    document.getElementById("messagesList").scrollTop = 1;
  }

  if (loading) {
    return;
  }

  if (scrollTop < 50) {
    loadMore();
  }
};

const handleOpenMessageOptionsMenu = (e, message) => {
  setAnchorEl(e.currentTarget);
  setSelectedMessage(message);
};

const handleCloseMessageOptionsMenu = (e) => {
  setAnchorEl(null);
};

const handleSaveAsQuickReply = () => {
  const msg = selectedMessage;
  const body = msg.body != null ? String(msg.body).trim() : "";
  if (!body || msg.isDeleted) {
    handleCloseMessageOptionsMenu();
    return;
  }
  handleCloseMessageOptionsMenu();
  history.push({
    pathname: "/quick-messages",
    state: { draftQuickMessage: { message: body } },
  });
};

const hanldeReplyMessage = (e, message) => {
  //if (ticket.status === "open" || ticket.status === "group") {
  setAnchorEl(null);
  setReplyingMessage(message);
  //}
};

const checkMessageMedia = (message) => {
   if (message.mediaType === "locationMessage" && message.body.split('|').length >= 2) {
    let locationParts = message.body.split('|')
    let imageLocation = locationParts[0]
    let linkLocation = locationParts[1]

    let descriptionLocation = null

    if (locationParts.length > 2)
      descriptionLocation = message.body.split('|')[2]

    return <LocationPreview image={imageLocation} link={linkLocation} description={descriptionLocation} />
  } else

    if (message.mediaType === "contactMessage") {
      let array = message.body.split("\n");
      let obj = [];
      let contact = "";
      for (let index = 0; index < array.length; index++) {
        const v = array[index];
        let values = v.split(":");
        for (let ind = 0; ind < values.length; ind++) {
          if (values[ind].indexOf("+") !== -1) {
            obj.push({ number: values[ind] });
          }
          if (values[ind].indexOf("FN") !== -1) {
            contact = values[ind + 1];
          }
        }
      }
      // console.log(message)
      return <VcardPreview contact={contact} numbers={obj[0]?.number} queueId={message?.ticket?.queueId} whatsappId={message?.ticket?.whatsappId} />
    } else

      if (message.mediaType === "image") {
        return <ModalImageCors imageUrl={message.mediaUrl} />;
      } else

        if (message.mediaType === "audio") {
          return (
            <AudioModal url={message.mediaUrl} />
            // <audio controls>
            //   <source src={message.mediaUrl} type="audio/ogg"></source>
            //   {/* <source src={message.mediaUrl} type="audio/mp3"></source> */}
            // </audio>
          );
        } else

          if (message.mediaType === "video") {
            return (
              <video
                className={classes.messageMedia}
                src={message.mediaUrl}
                controls
              />
            );
          } else {
            return (
              <>
                <div className={classes.downloadMedia}>
                  <Button
                    startIcon={<GetApp />}
                    variant="outlined"
                    target="_blank"
                    href={message.mediaUrl}
                  >
                    Download
                  </Button>
                </div>
                <Divider />
              </>
            );
          }
};

const renderMessageAck = (message) => {
  if (message.ack === 0) {
    return <AccessTime fontSize="small" className={classes.ackIcons} />;
  } else
    if (message.ack === 1) {
      return <Done fontSize="small" className={classes.ackIcons} />;
    } else
      if (message.ack === 2) {
        return <DoneAll fontSize="small" className={classes.ackIcons} />;
      } else
        if (message.ack === 3 || message.ack === 4) {
          return <DoneAll fontSize="small" className={message.mediaType === "audio" ? classes.ackPlayedIcon : classes.ackDoneAllIcon} />;
        } else
          if (message.ack === 5) {
            return <DoneAll fontSize="small" className={classes.ackDoneAllIcon} />
          }
};

const renderDailyTimestamps = (message, index) => {
  const today = format(new Date(), "dd/MM/yyyy")

  if (index === 0) {
    return (
      <span
        className={classes.dailyTimestamp}
        key={`timestamp-${message.id}`}
      >
        <div className={classes.dailyTimestampText}>
          {today === format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy") ? "HOJE" : format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
        </div>
      </span>
    );
  } else
    if (index < messagesList.length - 1) {
      let messageDay = parseISO(messagesList[index].createdAt);
      let previousMessageDay = parseISO(messagesList[index - 1].createdAt);

      if (!isSameDay(messageDay, previousMessageDay)) {
        return (
          <span
            className={classes.dailyTimestamp}
            key={`timestamp-${message.id}`}
          >
            <div className={classes.dailyTimestampText}>
              {today === format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy") ? "HOJE" : format(parseISO(messagesList[index].createdAt), "dd/MM/yyyy")}
            </div>
          </span>
        );
      }
    } else
      if (index === messagesList.length - 1) {
        return (
          <div
            key={`ref-${message.id}`}
            ref={lastMessageRef}
            style={{ float: "left", clear: "both" }}
          />
        );
      }
};


const renderTicketsSeparator = (message, index) => {
  let lastTicket = messagesList[index - 1]?.ticketId;
  let currentTicket = message.ticketId;

  if (lastTicket !== currentTicket && lastTicket !== undefined) {
    if (message?.ticket?.queue) {
      return (
        <span
          className={classes.currentTick}
          key={`timestamp-${message.id}a`}
        >
          <div
            className={classes.currentTicktText}
            style={{ backgroundColor: message?.ticket?.queue?.color || "grey" }}
          >
            #{i18n.t("ticketsList.called")} {message?.ticketId} - {message?.ticket?.queue?.name}
          </div>

        </span>
      );
    } else {
      return (
        <span
          className={classes.currentTick}
          key={`timestamp-${message.id}b`}
        >
          <div
            className={classes.currentTicktText}
            style={{ backgroundColor: "grey" }}
          >
            #{i18n.t("ticketsList.called")} {message.ticketId} - {i18n.t("ticketsList.noQueue")}
          </div>

        </span>
      );
    }
  }

};

const renderMessageDivider = (message, index) => {
  if (index < messagesList.length && index > 0) {
    let messageUser = messagesList[index].fromMe;
    let previousMessageUser = messagesList[index - 1].fromMe;
    if (messageUser !== previousMessageUser) {
      return (

        <span style={{ marginTop: 16 }} key={`divider-${message.id}`}></span>
      );
    }
  }
};

const path = require('path');

const renderQuotedMessage = (message) => {

  return (
    <div
      className={clsx(classes.quotedContainerLeft, {
        [classes.quotedContainerRight]: message.fromMe,
      })}
    >
      <span
        className={clsx(classes.quotedSideColorLeft, {
          [classes.quotedSideColorRight]: message.quotedMsg?.fromMe,
        })}
      ></span>
      <div className={classes.quotedMsg}>
        {!message.quotedMsg?.fromMe && (
          <span className={classes.messageContactName}>
            {message.quotedMsg?.contact?.name}
          </span>
        )}

        {message.quotedMsg.mediaType === "audio"
          && (
            <div className={classes.downloadMedia}>
              <AudioModal url={message.quotedMsg.mediaUrl} />

              {/* <audio controls>
                  <source src={message.quotedMsg.mediaUrl} type="audio/mp3"></source>
                  {/* <source src={message.quotedMsg.mediaUrl} type="audio/ogg"></source> 
                </audio> */}
            </div>
          )
        }
        {message.quotedMsg.mediaType === "video"
          && (
            <video
              className={classes.messageMedia}
              src={message.quotedMsg.mediaUrl}
              controls
            />
          )
        }
        {message.quotedMsg.mediaType === "contactMessage"
          && (
            "Contato"
          )
        }
        {message.quotedMsg.mediaType === "application"
          && (
            <div className={classes.downloadMedia}>
              <Button
                startIcon={<GetApp />}
                // color="primary"
                variant="outlined"
                target="_blank"
                href={message.quotedMsg.mediaUrl}
              >
                Download
              </Button>
            </div>
          )
        }

        {message.quotedMsg.mediaType === "image"
          && (
            <ModalImageCors imageUrl={message.quotedMsg.mediaUrl} />)
          || message.quotedMsg?.body}

        {!message.quotedMsg.mediaType === "image" && message.quotedMsg?.body}


      </div>
    </div>
  );
};

const handleDrag = event => {
  event.preventDefault();
  event.stopPropagation();
  if (event.type === "dragenter" || event.type === "dragover") {
    setDragActive(true);
  } else if (event.type === "dragleave") {
    setDragActive(false);
  }
}

const isYouTubeLink = (url) => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
};

const handleDrop = event => {
  event.preventDefault();
  event.stopPropagation();
  setDragActive(false);
  if (event.dataTransfer.files && event.dataTransfer.files[0]) {
    if (onDrop) {
      onDrop(event.dataTransfer.files);
    }
  }
}
const xmlRegex = /<([^>]+)>/g;
const boldRegex = /\*(.*?)\*/g;

const formatXml = (xmlString) => {
  // Verifica se o XML contém a assinatura com nome do atendente
  if (boldRegex.test(xmlString)) {
    // Formata o texto dentro da assinatura em negrito
    xmlString = xmlString.replace(boldRegex, "**$1**");
  }
  return xmlString;
};

const renderMessages = () => {

  if (messagesList.length > 0) {
    const viewMessagesList = messagesList.map((message, index) => {
      if (message.mediaType === "call_log") {
        return (
          <React.Fragment key={message.id}>
            {renderDailyTimestamps(message, index)}
            {renderTicketsSeparator(message, index)}
            {renderMessageDivider(message, index)}
            <div className={classes.messageCenter}>
              <IconButton
                variant="contained"
                size="small"
                id="messageActionsButton"
                disabled={message.isDeleted}
                className={classes.messageActionsButton}
                onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
              >
                <ExpandMore />
              </IconButton>
              {isGroup && (
                <span className={classes.messageContactName}>
                  {message.contact?.name}
                </span>
              )}

              {/* {isGroup && (
                  <span className={classes.messageContactName}>
                    {JSON.parse(message.dataJson).pushName} #{message.contact?.name}
                  </span>
                )} */}
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 17" width="20" height="17">
                  <path fill="#df3333" d="M18.2 12.1c-1.5-1.8-5-2.7-8.2-2.7s-6.7 1-8.2 2.7c-.7.8-.3 2.3.2 2.8.2.2.3.3.5.3 1.4 0 3.6-.7 3.6-.7.5-.2.8-.5.8-1v-1.3c.7-1.2 5.4-1.2 6.4-.1l.1.1v1.3c0 .2.1.4.2.6.1.2.3.3.5.4 0 0 2.2.7 3.6.7.2 0 1.4-2 .5-3.1zM5.4 3.2l4.7 4.6 5.8-5.7-.9-.8L10.1 6 6.4 2.3h2.5V1H4.1v4.8h1.3V3.2z"></path>
                </svg> <span>{i18n.t("ticketsList.missedCall")} {format(parseISO(message.createdAt), "HH:mm")}</span>
              </div>
            </div>
          </React.Fragment>
        );
      }

      if (!message.fromMe) {
        return (
          <React.Fragment key={message.id}>
            {renderDailyTimestamps(message, index)}
            {renderTicketsSeparator(message, index)}
            {renderMessageDivider(message, index)}
            <div
              ref={assignMessageRef(message.id)}
              className={clsx(classes.messageLeft, {
                [classes.messageSearchActive]:
                  highlightQuery && chatSearchMatches[safeActiveSearchIndex] === message.id,
              })}
              title={message.queueId && message.queue?.name}
              onDoubleClick={(e) => hanldeReplyMessage(e, message)}
            >
              {showSelectMessageCheckbox && (
                <SelectMessageCheckbox
                  // showSelectMessageCheckbox={showSelectMessageCheckbox}
                  message={message}
                // selectedMessagesList={selectedMessagesList}
                // setSelectedMessagesList={setSelectedMessagesList}
                />
              )}
              <IconButton
                variant="contained"
                size="small"
                id="messageActionsButton"
                disabled={message.isDeleted}
                className={classes.messageActionsButton}
                onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
              >
                <ExpandMore />
              </IconButton>

              {message.isForwarded && (
                <div>
                  <span className={classes.forwardMessage}
                  ><Reply style={{ color: "grey", transform: 'scaleX(-1)' }} /> Encaminhada
                  </span>
                  <br />
                </div>
              )}
              {isGroup && (
                <span className={classes.messageContactName}>
                  {message.contact?.name}
                </span>
              )}
              {isYouTubeLink(message.body) && (
                <>
                  <YouTubePreview videoUrl={message.body} />
                </>
              )}
              {/* {isGroup && (
                  <span className={classes.messageContactName}>
                    {JSON.parse(message.dataJson).pushName} #{message.contact?.name}
                  </span>
                )} */}

              {/* aviso de mensagem apagado pelo contato */}

              {!lgpdDeleteMessage && message.isDeleted && (
                <div>
                  <span className={classes.deletedMessage}
                  >🚫 Essa mensagem foi apagada pelo contato &nbsp;
                  </span>
                </div>
              )}

              {(message.mediaUrl || message.mediaType === "locationMessage" || message.mediaType === "contactMessage"
                //|| message.mediaType === "multi_vcard" 
              ) && checkMessageMedia(message)}

              <div className={clsx(classes.textContentItem, {
                [classes.textContentItemDeleted]: message.isDeleted,
              })}>
                {message.quotedMsg && renderQuotedMessage(message)}
                {
                  (
                    (message.mediaUrl !== null && (message.mediaType === "image" || message.mediaType === "video") && path.basename(message.mediaUrl).trim() !== message.body.trim()) ||
                    message.mediaType !== "audio" &&
                    message.mediaType !== "image" &&
                    message.mediaType !== "video" &&
                    message.mediaType != "reactionMessage" &&
                    message.mediaType != "locationMessage" && message.mediaType !== "contactMessage") && (
                    <>
                      {xmlRegex.test(message.body) && (
                        <span>{highlightQuery ? highlightParts(message.body) : message.body}</span>

                      )}
                      {!xmlRegex.test(message.body) && (
                        highlightQuery && !(lgpdDeleteMessage && message.isDeleted) ? (
                          highlightParts(message.body)
                        ) : (
                          <MarkdownWrapper>{(lgpdDeleteMessage && message.isDeleted) ? "🚫 _Mensagem apagada_ " :
                            message.body
                          }</MarkdownWrapper>)
                      )}

                    </>

                  )}

                {message.quotedMsg && message.mediaType === "reactionMessage" && (
                  <>
                    <span style={{ marginLeft: "0px" }}>
                      {highlightQuery ? (
                        highlightParts("" + message?.contact?.name + " reagiu... " + message.body)
                      ) : (
                        <MarkdownWrapper>
                          {"" + message?.contact?.name + " reagiu... " + message.body}
                        </MarkdownWrapper>
                      )}
                    </span>
                  </>
                )}

                <span className={classes.timestamp}>
                  {message.isEdited ? "Editada " + format(parseISO(message.createdAt), "HH:mm") : format(parseISO(message.createdAt), "HH:mm")}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      } else {
        return (
          <React.Fragment key={message.id}>
            {renderDailyTimestamps(message, index)}
            {renderTicketsSeparator(message, index)}
            {renderMessageDivider(message, index)}
            <div
              ref={assignMessageRef(message.id)}
              className={clsx(message.isPrivate ? classes.messageRightPrivate : classes.messageRight, {
                [classes.messageSearchActive]:
                  highlightQuery && chatSearchMatches[safeActiveSearchIndex] === message.id,
              })}
              title={message.queueId && message.queue?.name}
              onDoubleClick={(e) => hanldeReplyMessage(e, message)}
            >
              {showSelectMessageCheckbox && (
                <SelectMessageCheckbox
                  // showSelectMessageCheckbox={showSelectMessageCheckbox}
                  message={message}
                // selectedMessagesList={selectedMessagesList}
                // setSelectedMessagesList={setSelectedMessagesList}
                />
              )}

              <IconButton
                variant="contained"
                size="small"
                id="messageActionsButton"
                disabled={message.isDeleted}
                className={classes.messageActionsButton}
                onClick={(e) => handleOpenMessageOptionsMenu(e, message)}
              >
                <ExpandMore />
              </IconButton>
              {message.isForwarded && (
                <div>
                  <span className={classes.forwardMessage}
                  ><Reply style={{ color: "grey", transform: 'scaleX(-1)' }} /> Encaminhada
                  </span>
                  <br />
                </div>
              )}
              {isYouTubeLink(message.body) && (
                <>
                  <YouTubePreview videoUrl={message.body} />
                </>
              )}
              {!lgpdDeleteMessage && message.isDeleted && (
                <div>
                  <span className={classes.deletedMessage}
                  >🚫 Essa mensagem foi apagada &nbsp;
                  </span>
                </div>
              )}
              {(message.mediaUrl || message.mediaType === "locationMessage" || message.mediaType === "contactMessage"
                //|| message.mediaType === "multi_vcard" 
              ) && checkMessageMedia(message)}
              <div
                className={clsx(classes.textContentItem, {
                  [classes.textContentItemDeleted]: message.isDeleted,
                })}
              >

                {/* {message.isDeleted && (`🚫`)} */}



                {message.quotedMsg && renderQuotedMessage(message)}

                {
                  ((message.mediaType === "image" || message.mediaType === "video") && path.basename(message.mediaUrl) === message.body) ||
                  (message.mediaType !== "audio" && message.mediaType != "reactionMessage" && message.mediaType != "locationMessage" && message.mediaType !== "contactMessage") && (
                    <>
                      {xmlRegex.test(message.body) && (
                        <div>
                          {highlightQuery
                            ? highlightParts(formatXml(String(message.body)))
                            : formatXml(message.body)}
                        </div>

                      )}
                      {!xmlRegex.test(message.body) && (
                        highlightQuery ? (
                          highlightParts(message.body)
                        ) : (
                          <MarkdownWrapper>{message.body}</MarkdownWrapper>
                        ))}

                    </>
                  )}

                {message.quotedMsg && message.mediaType === "reactionMessage" && (
                  <>
                    <span style={{ marginLeft: "0px" }}>
                      {highlightQuery ? (
                        highlightParts("Você reagiu... " + message.body)
                      ) : (
                        <MarkdownWrapper>
                          {"Você reagiu... " + message.body}
                        </MarkdownWrapper>
                      )}
                    </span>
                  </>
                )}

                <span className={classes.timestamp}>
                  {message.isEdited ? "Editada " + format(parseISO(message.createdAt), "HH:mm") : format(parseISO(message.createdAt), "HH:mm")}
                  {renderMessageAck(message)}
                </span>
              </div>
            </div>
          </React.Fragment>
        );
      }
    });
    return viewMessagesList;
  } else {
    return <div>Diga olá para seu novo contato!</div>;
  }
};

return (
  <div className={classes.messagesListWrapper} onDragEnter={handleDrag}>
    {dragActive && <div className={classes.dragElement} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>Solte o arquivo aqui</div>}

    <MessageOptionsMenu
      message={selectedMessage}
      anchorEl={anchorEl}
      menuOpen={messageOptionsMenuOpen}
      handleClose={handleCloseMessageOptionsMenu}
      onSaveAsQuickReply={handleSaveAsQuickReply}
      isGroup={isGroup}
      whatsappId={whatsappId}
      queueId={queueId}
    />
    {!chatSearchExpanded ? (
      <div className={classes.conversationSearchBarCollapsed}>
        <Tooltip title="Buscar na conversa (mensagens já carregadas)">
          <IconButton
            size="small"
            className={classes.searchRevealBtn}
            aria-label="Abrir busca na conversa"
            onClick={() => setChatSearchExpanded(true)}
          >
            <Badge color="secondary" variant="dot" invisible={!highlightQuery}>
              <Search style={{ color: "#8696a0" }} fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>
      </div>
    ) : (
      <div
        className={classes.conversationSearchBar}
        title="Busca nas mensagens já carregadas. Suba o histórico para carregar mais mensagens, se disponível. Esc para recolher."
      >
        <Tooltip title="Recolher busca (Esc)">
          <IconButton
            size="small"
            aria-label="Recolher busca na conversa"
            onClick={() => setChatSearchExpanded(false)}
          >
            <UnfoldLess style={{ color: "#8696a0" }} fontSize="small" />
          </IconButton>
        </Tooltip>
        <TextField
          inputRef={chatSearchInputRef}
          className={classes.conversationSearchField}
          size="small"
          variant="outlined"
          placeholder="Buscar na conversa..."
          value={chatSearchQuery}
          onChange={(e) => {
            setChatSearchQuery(e.target.value);
            setActiveSearchIndex(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search style={{ color: "#8696a0" }} fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: chatSearchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => {
                    setChatSearchQuery("");
                    setActiveSearchIndex(0);
                  }}
                >
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        <div className={classes.searchActionsGroup}>
          {highlightQuery && chatSearchMatches.length === 0 && hasMore && loadingMore && (
            <Typography className={classes.searchHistoryHint} component="span" title="Buscando em mensagens mais antigas">
              Carregando histórico…
            </Typography>
          )}
          {highlightQuery && chatSearchMatches.length === 0 && !hasMore && !loading && !loadingMore && (
            <Typography className={classes.searchHistoryHint} component="span" title="Todas as mensagens disponíveis foram verificadas">
              Sem resultado
            </Typography>
          )}
          <Typography variant="caption" color="textSecondary" component="span" style={{ minWidth: 36, textAlign: "center", fontSize: 11, lineHeight: 1.2 }}>
            {chatSearchMatches.length > 0
              ? `${safeActiveSearchIndex + 1}/${chatSearchMatches.length}`
              : highlightQuery
                ? "0"
                : ""}
          </Typography>
          <div className={classes.searchNavStack}>
            <IconButton
              size="small"
              disabled={chatSearchMatches.length === 0}
              onClick={goToPrevSearchMatch}
              aria-label="Mensagem anterior (mais antiga)"
            >
              <KeyboardArrowUp fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              disabled={chatSearchMatches.length === 0}
              onClick={goToNextSearchMatch}
              aria-label="Próxima mensagem (mais recente)"
            >
              <KeyboardArrowDown fontSize="small" />
            </IconButton>
          </div>
        </div>
      </div>
    )}
    <div
      id="messagesList"
      className={classes.messagesList}
      onScroll={handleScroll}
    >
      {(loading || loadingMore) && (
        <LinearProgress color="primary" className={classes.messagesListLinear} />
      )}
      {messagesList.length > 0 ?
        renderMessages()
        : []}
    </div>

    {(channel !== "whatsapp" && channel !== undefined) && (
      <div
        style={{
          width: "100%",
          display: "flex",
          padding: "10px",
          alignItems: "center",
          backgroundColor: "#E1F3FB",
        }}
      >
        {channel === "facebook" ? (
          <Facebook />
        ) : (
          <Instagram />
        )}

        <span>
          Você tem 24h para responder após receber uma mensagem, de acordo
          com as políticas do Facebook.
        </span>
      </div>
    )}
  </div>
);
};

export default MessagesList;