import React, { useState, useEffect, useRef, useContext, useCallback } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format } from "date-fns";
import clsx from "clsx";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import { green, grey } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import {
    Tooltip,
    Box,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    IconButton,
    Paper,
    Divider,
    Avatar,
} from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import toastError from "../../errors/toastError";
import { v4 as uuidv4 } from "uuid";

import GroupIcon from "@material-ui/icons/Group";
import ConnectionIcon from "../ConnectionIcon";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import ShowTicketOpen from "../ShowTicketOpenModal";
import { isNil } from "lodash";
import { toast } from "react-toastify";
import { Done, HighlightOff, Replay, SwapHoriz } from "@material-ui/icons";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { blue } from "@material-ui/core/colors";
import VisibilityIcon from "@material-ui/icons/Visibility";
import CloseIcon from "@material-ui/icons/Close";
import MessageIcon from "@material-ui/icons/Message";

const useStyles = makeStyles((theme) => ({
    listItem: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        listStyle: "none",
        padding: theme.spacing(1, 1.25),
        margin: theme.spacing(0.35, 1),
        borderRadius: 10,
        minHeight: 64,
        cursor: "pointer",
        transition: "background-color 0.15s ease, box-shadow 0.15s ease",
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        "&:hover": {
            backgroundColor: theme.mode === "light" ? "#f0f2f5" : theme.palette.action.hover,
            boxShadow: theme.mode === "light" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
        },
        "&:hover $hoverActions": {
            opacity: 1,
        },
    },
    itemSelected: {
        backgroundColor: theme.mode === "light" ? "#e8f4fc" : "rgba(255,255,255,0.08)",
        borderColor: theme.palette.primary.light,
    },
    pendingTicket: {
        cursor: "unset",
    },
    rowMain: {
        display: "flex",
        alignItems: "center",
        flex: 1,
        minWidth: 0,
        gap: theme.spacing(1.25),
    },
    avatar: {
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: "50%",
    },
    textColumn: {
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        justifyContent: "center",
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: "50%",
        flexShrink: 0,
        boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
    },
    statusOn: {
        backgroundColor: "#22c55e",
    },
    statusOff: {
        backgroundColor: "#ef4444",
    },
    displayName: {
        minWidth: 0,
        fontWeight: 600,
        fontSize: "0.9375rem",
        letterSpacing: "-0.01em",
        color: theme.mode === "light" ? "#1a1a1a" : theme.palette.text.primary,
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(0.5),
    },
    lastMessage: {
        fontSize: "0.8125rem",
        lineHeight: 1.35,
        color: theme.mode === "light" ? grey[600] : grey[400],
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        "& p": { margin: 0 },
    },
    lastMessageUnread: {
        fontWeight: 600,
        color: theme.mode === "light" ? "#1a1a1a" : theme.palette.text.primary,
    },
    groupIcon: {
        color: grey[600],
        fontSize: 18,
        flexShrink: 0,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        backgroundColor: green[600],
        flexShrink: 0,
    },
    rowEnd: {
        display: "flex",
        alignItems: "center",
        alignSelf: "stretch",
        flexShrink: 0,
        gap: theme.spacing(0.75),
    },
    channelIconInTitle: {
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        marginRight: 4,
        verticalAlign: "middle",
    },
    /** Ícone do canal à direita da linha (sempre visível; não depende só do nome). */
    platformIconWrap: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 30,
        minHeight: 28,
        flexShrink: 0,
    },
    hoverActions: {
        display: "flex",
        alignItems: "center",
        gap: 2,
        opacity: 0,
        transition: "opacity 0.15s ease",
        [theme.breakpoints.down("sm")]: {
            opacity: 1,
        },
    },
    iconBtn: {
        padding: 6,
    },
    dialogTitle: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: theme.palette.primary.main,
        color: "white",
        paddingBottom: theme.spacing(1),
    },
    closeButton: {
        color: "white",
    },
    messagesContainer: {
        height: "60vh",
        maxHeight: "600px",
        overflowY: "auto",
        padding: theme.spacing(2),
        scrollBehavior: "smooth",
    },
    messageItem: {
        padding: theme.spacing(1),
        margin: theme.spacing(1, 0),
        borderRadius: theme.spacing(1),
        maxWidth: "80%",
        position: "relative",
    },
    fromMe: {
        backgroundColor: "#dcf8c6",
        marginLeft: "auto",
    },
    fromThem: {
        backgroundColor: "#f5f5f5",
    },
    messageTime: {
        fontSize: "0.75rem",
        color: grey[500],
        position: "absolute",
        bottom: "2px",
        right: "8px",
    },
    messageText: {
        marginBottom: theme.spacing(2),
        wordBreak: "break-word",
    },
    emptyMessages: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: grey[500],
    },
    messagesHeader: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(1, 2),
        backgroundColor: theme.palette.grey[100],
    },
    messageAvatar: {
        marginRight: theme.spacing(1),
    },
    loadingMessages: {
        display: "flex",
        justifyContent: "center",
        padding: theme.spacing(3),
    },
}));

const TicketListItemCustom = ({ setTabOpen, ticket, allowDragToTagFolder }) => {
    const classes = useStyles();
    const theme = useTheme();
    const history = useHistory();
    const [loading, setLoading] = useState(false);
    const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
    const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);

    const [openAlert, setOpenAlert] = useState(false);
    const [userTicketOpen, setUserTicketOpen] = useState("");
    const [queueTicketOpen, setQueueTicketOpen] = useState("");
    const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);

    const [ticketMessages, setTicketMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [contactAvatarSrc, setContactAvatarSrc] = useState(
        () => ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl || undefined
    );

    const { ticketId } = useParams();
    const isMounted = useRef(true);
    const { setCurrentTicket } = useContext(TicketsContext);
    const { user } = useContext(AuthContext);

    const { get: getSetting } = useCompanySettings();

    const isConnectionOnline = ticket?.whatsapp?.status === "CONNECTED";

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        setContactAvatarSrc(
            ticket?.contact?.urlPicture || ticket?.contact?.profilePicUrl || undefined
        );
    }, [ticket?.id, ticket?.contact?.urlPicture, ticket?.contact?.profilePicUrl]);

    const handleContactAvatarError = useCallback(() => {
        const c = ticket?.contact;
        if (!c) return;
        setContactAvatarSrc((prev) => {
            if (prev && c.urlPicture && prev === c.urlPicture && c.profilePicUrl && c.profilePicUrl !== c.urlPicture) {
                return c.profilePicUrl;
            }
            return undefined;
        });
    }, [ticket?.contact]);

    const handleOpenAcceptTicketWithouSelectQueue = useCallback(() => {
        setAcceptTicketWithouSelectQueueOpen(true);
    }, []);

    const handleCloseTicket = async (id) => {
        const setting = await getSetting({
            column: "requiredTag",
        });

        if (setting.requiredTag === "enabled") {
            try {
                const contactTags = await api.get(`/contactTags/${ticket.contact.id}`);
                if (!contactTags.data.tags) {
                    toast.warning(i18n.t("messagesList.header.buttons.requiredTag"));
                } else {
                    await api.put(`/tickets/${id}`, {
                        status: "closed",
                        userId: user?.id || null,
                    });

                    if (isMounted.current) {
                        setLoading(false);
                    }

                    history.push(`/tickets/`);
                }
            } catch (err) {
                setLoading(false);
                toastError(err);
            }
        } else {
            setLoading(true);
            try {
                await api.put(`/tickets/${id}`, {
                    status: "closed",
                    userId: user?.id || null,
                });
            } catch (err) {
                setLoading(false);
                toastError(err);
            }
            if (isMounted.current) {
                setLoading(false);
            }

            history.push(`/tickets/`);
        }
    };

    const handleCloseIgnoreTicket = async (id) => {
        setLoading(true);
        try {
            await api.put(`/tickets/${id}`, {
                status: "closed",
                userId: user?.id || null,
                sendFarewellMessage: false,
                amountUsedBotQueues: 0,
            });
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
        if (isMounted.current) {
            setLoading(false);
        }

        history.push(`/tickets/`);
    };

    const truncate = (str, len) => {
        if (!isNil(str)) {
            if (str.length > len) {
                return str.substring(0, len) + "...";
            }
            return str;
        }
    };

    const handleCloseTransferTicketModal = useCallback(() => {
        if (isMounted.current) {
            setTransferTicketModalOpen(false);
        }
    }, []);

    const handleOpenTransferModal = () => {
        setLoading(true);
        setTransferTicketModalOpen(true);
        if (isMounted.current) {
            setLoading(false);
        }
        handleSelectTicket(ticket);
        history.push(`/tickets/${ticket.uuid}`);
    };

    const handleAcepptTicket = async (id) => {
        setLoading(true);
        try {
            const otherTicket = await api.put(`/tickets/${id}`, {
                status: ticket.isGroup && ticket.channel === "whatsapp" ? "group" : "open",
                userId: user?.id,
            });

            if (otherTicket.data.id !== ticket.id) {
                if (otherTicket.data.userId !== user?.id) {
                    setOpenAlert(true);
                    setUserTicketOpen(otherTicket.data.user.name);
                    setQueueTicketOpen(otherTicket.data.queue.name);
                } else {
                    setLoading(false);
                    setTabOpen(ticket.isGroup ? "group" : "open");
                    handleSelectTicket(otherTicket.data);
                    history.push(`/tickets/${otherTicket.uuid}`);
                }
            } else {
                let setting;

                try {
                    setting = await getSetting({
                        column: "sendGreetingAccepted",
                    });
                } catch (err) {
                    toastError(err);
                }

                if (setting.sendGreetingAccepted === "enabled" && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")) {
                    handleSendMessage(ticket.id);
                }
                if (isMounted.current) {
                    setLoading(false);
                }

                setTabOpen(ticket.isGroup ? "group" : "open");
                handleSelectTicket(ticket);
                history.push(`/tickets/${ticket.uuid}`);
            }
        } catch (err) {
            setLoading(false);
            toastError(err);
        }
    };

    const handleSendMessage = async (id) => {
        let setting;

        try {
            setting = await getSetting({
                column: "greetingAcceptedMessage",
            });
        } catch (err) {
            toastError(err);
        }

        const msg = `${setting?.greetingAcceptedMessage ?? ""}`.trim();
        if (!msg) return;
        const message = {
            read: 1,
            fromMe: true,
            mediaUrl: "",
            body: msg,
        };
        try {
            await api.post(`/messages/${id}`, message);
        } catch (err) {
            toastError(err);
        }
    };

    const handleCloseAlert = useCallback(() => {
        setOpenAlert(false);
        setLoading(false);
    }, []);

    const handleSelectTicket = (ticketRow) => {
        const code = uuidv4();
        const { id, uuid } = ticketRow;
        setCurrentTicket({ id, uuid, code });
    };

    const fetchTicketMessages = async (ticketRowId) => {
        if (!ticketRowId) return;

        setLoadingMessages(true);
        try {
            const { data } = await api.get(`/messages/${ticketRowId}`);
            if (isMounted.current) {
                setTicketMessages(data.messages);
            }
        } catch (err) {
            toastError(err);
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleOpenMessageDialog = (e) => {
        e.stopPropagation();
        setOpenTicketMessageDialog(true);
        fetchTicketMessages(ticket.id);
    };

    const displayName = truncate(ticket.contact?.name, 48) || "—";

    const lastMessagePreview = () => {
        const lm = ticket.lastMessage;
        if (!lm?.trim()) {
            return (
                <span style={{ opacity: 0.65, fontStyle: "italic" }}>
                    {i18n.t("ticketsList.noMessages")}
                </span>
            );
        }
        if (lm.includes("data:image/png;base64")) {
            return <MarkdownWrapper>Localização</MarkdownWrapper>;
        }
        if (lm.includes("BEGIN:VCARD")) {
            return <MarkdownWrapper>Contato</MarkdownWrapper>;
        }
        return <MarkdownWrapper>{truncate(lm, 52)}</MarkdownWrapper>;
    };

    const iconBtnStyle = {
        backgroundColor: "transparent",
        boxShadow: "none",
        border: "none",
        color: theme.mode === "light" ? "#0872B9" : "#FFF",
        padding: 0,
        borderRadius: "50%",
        minWidth: "2em",
        width: "auto",
    };

    const channelListTooltip = () => {
        const ch = (ticket?.channel || "").toLowerCase();
        let label = "";
        if (ch === "whatsapp") label = "WhatsApp";
        else if (ch === "instagram") label = "Instagram";
        else if (ch === "facebook") label = "Facebook";
        else if (ch === "standalone") label = "Interno / Kanban";
        else if (ticket?.channel) label = String(ticket.channel);
        else return "Canal";
        if (ticket?.isGroup && ch === "whatsapp") {
            return `${label} · Grupo`;
        }
        return label;
    };

    return (
        <React.Fragment key={ticket.id}>
            {openAlert && (
                <ShowTicketOpen
                    isOpen={openAlert}
                    handleClose={handleCloseAlert}
                    user={userTicketOpen}
                    queue={queueTicketOpen}
                />
            )}
            {acceptTicketWithouSelectQueueOpen && (
                <AcceptTicketWithouSelectQueue
                    modalOpen={acceptTicketWithouSelectQueueOpen}
                    onClose={(e) => setAcceptTicketWithouSelectQueueOpen(false)}
                    ticketId={ticket.id}
                    ticket={ticket}
                />
            )}
            {transferTicketModalOpen && (
                <TransferTicketModalCustom
                    modalOpen={transferTicketModalOpen}
                    onClose={handleCloseTransferTicketModal}
                    ticketid={ticket.id}
                    ticket={ticket}
                />
            )}

            <Dialog open={openTicketMessageDialog} onClose={() => setOpenTicketMessageDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle disableTypography className={classes.dialogTitle}>
                    <Typography variant="h6">Espiando a conversa</Typography>
                    <IconButton aria-label="close" className={classes.closeButton} onClick={() => setOpenTicketMessageDialog(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <div className={classes.messagesHeader}>
                    <Avatar
                        src={contactAvatarSrc || undefined}
                        className={classes.messageAvatar}
                        alt={ticket?.contact?.name || ""}
                        onError={handleContactAvatarError}
                    >
                        {(ticket?.contact?.name || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                        <Typography variant="subtitle1">{ticket.contact?.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                            {ticket.whatsapp?.name || ticket.channel}
                        </Typography>
                    </div>
                </div>

                <Divider />

                <DialogContent className={classes.messagesContainer}>
                    {loadingMessages ? (
                        <div className={classes.loadingMessages}>
                            <Typography>Carregando mensagens...</Typography>
                        </div>
                    ) : ticketMessages.length === 0 ? (
                        <div className={classes.emptyMessages}>
                            <MessageIcon fontSize="large" />
                            <Typography variant="body1">{i18n.t("ticketsList.noMessages")}</Typography>
                        </div>
                    ) : (
                        ticketMessages.map((message) => (
                            <Paper key={message.id} className={clsx(classes.messageItem, message.fromMe ? classes.fromMe : classes.fromThem)} elevation={0}>
                                <Typography className={classes.messageText}>
                                    {message.body.includes("data:image/png;base64") ? (
                                        <MarkdownWrapper>Localização</MarkdownWrapper>
                                    ) : message.body.includes("BEGIN:VCARD") ? (
                                        <MarkdownWrapper>Contato</MarkdownWrapper>
                                    ) : (
                                        <MarkdownWrapper>{message.body}</MarkdownWrapper>
                                    )}
                                </Typography>
                                <Typography variant="caption" className={classes.messageTime}>
                                    {format(parseISO(message.createdAt), "HH:mm")}
                                </Typography>
                            </Paper>
                        ))
                    )}
                </DialogContent>
            </Dialog>

            <Box
                component="li"
                role="button"
                tabIndex={0}
                draggable={Boolean(allowDragToTagFolder && ticket?.contact?.id)}
                onDragStart={(e) => {
                    if (!allowDragToTagFolder || !ticket?.contact?.id) return;
                    e.dataTransfer.setData(
                        "application/json",
                        JSON.stringify({
                            contactId: ticket.contact.id,
                            ticketId: ticket.id,
                        })
                    );
                    e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={(e) => {
                    const t = e.target;
                    if (t && typeof t.closest === "function" && t.closest("button")) return;
                    const tag = (t && t.tagName && t.tagName.toLowerCase()) || "";
                    if (tag === "input") return;
                    handleSelectTicket(ticket);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectTicket(ticket);
                    }
                }}
                className={clsx(classes.listItem, {
                    [classes.pendingTicket]: ticket.status === "pending",
                    [classes.itemSelected]: ticketId && ticketId === ticket.uuid,
                })}
            >
                <Box className={classes.rowMain}>
                    <Tooltip title={isConnectionOnline ? "Conectado" : "Desconectado"}>
                        <span className={clsx(classes.statusDot, isConnectionOnline ? classes.statusOn : classes.statusOff)} />
                    </Tooltip>

                    <Avatar
                        className={classes.avatar}
                        src={contactAvatarSrc || undefined}
                        alt={ticket?.contact?.name || ""}
                        onError={handleContactAvatarError}
                    >
                        {(ticket?.contact?.name || "?").charAt(0).toUpperCase()}
                    </Avatar>

                    <Box className={classes.textColumn}>
                        <Typography className={classes.displayName} noWrap component="div" variant="body2">
                            <Tooltip title={channelListTooltip()}>
                                <span className={classes.channelIconInTitle}>
                                    <ConnectionIcon connectionType={ticket?.channel} fontSize="default" />
                                </span>
                            </Tooltip>
                            {ticket.isGroup && ticket.channel === "whatsapp" && <GroupIcon className={classes.groupIcon} />}
                            {displayName}
                            {Number(ticket.unreadMessages) > 0 && <span className={classes.unreadDot} title="" />}
                        </Typography>
                        <Typography
                            component="div"
                            variant="body2"
                            noWrap
                            className={clsx(
                                classes.lastMessage,
                                Number(ticket.unreadMessages) > 0 && classes.lastMessageUnread
                            )}
                        >
                            {lastMessagePreview()}
                        </Typography>
                    </Box>

                    <Box className={classes.rowEnd}>
                        <Box className={classes.hoverActions}>
                            <Tooltip title="Espiar conversa">
                                <IconButton size="small" className={classes.iconBtn} onClick={handleOpenMessageDialog}>
                                    <VisibilityIcon fontSize="small" style={{ color: blue[700] }} />
                                </IconButton>
                            </Tooltip>
                            {ticket.status === "pending" && (ticket.queueId === null || ticket.queueId === undefined) && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAcceptTicketWithouSelectQueue();
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.accept")}`}>
                                        <Done />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                            {ticket.status === "pending" && ticket.queueId !== null && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcepptTicket(ticket.id);
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.accept")}`}>
                                        <Done />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                            {(ticket.status === "pending" || ticket.status === "open" || ticket.status === "group") && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenTransferModal();
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.transfer")}`}>
                                        <SwapHoriz />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                            {(ticket.status === "open" || ticket.status === "group") && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseTicket(ticket.id);
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.closed")}`}>
                                        <HighlightOff />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                            {((ticket.status === "pending" || ticket.status === "lgpd") &&
                                (user.userClosePendingTicket === "enabled" || user.profile === "admin")) && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseIgnoreTicket(ticket.id);
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.ignore")}`}>
                                        <HighlightOff />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                            {ticket.status === "closed" && (ticket.queueId === null || ticket.queueId === undefined) && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAcceptTicketWithouSelectQueue();
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.reopen")}`}>
                                        <Replay />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                            {ticket.status === "closed" && ticket.queueId !== null && (
                                <ButtonWithSpinner
                                    style={iconBtnStyle}
                                    variant="contained"
                                    size="small"
                                    loading={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAcepptTicket(ticket.id);
                                    }}
                                >
                                    <Tooltip title={`${i18n.t("ticketsList.buttons.reopen")}`}>
                                        <Replay />
                                    </Tooltip>
                                </ButtonWithSpinner>
                            )}
                        </Box>

                        <Tooltip title={channelListTooltip()}>
                            <span className={classes.platformIconWrap}>
                                <ConnectionIcon connectionType={ticket?.channel} fontSize="default" />
                            </span>
                        </Tooltip>
                    </Box>
                </Box>
            </Box>
        </React.Fragment>
    );
};

export default TicketListItemCustom;
