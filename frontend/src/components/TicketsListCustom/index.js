import React, { useState, useEffect, useReducer, useContext, useRef, useMemo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";

import TicketListItem from "../TicketListItemCustom";
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { isSocketClientReady } from "../../utils/socketClient";

/** Logs no console (só em dev). Desliga: `localStorage.setItem('DEBUG_TICKETS','0'); location.reload()` */
const tdlog = (...args) => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window !== "undefined" && localStorage.getItem("DEBUG_TICKETS") === "0") return;
    // eslint-disable-next-line no-console
    console.log("[TicketsDebug]", ...args);
};

const useStyles = makeStyles((theme) => ({
    ticketsListWrapper: {
        position: "relative",
        display: "flex",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        alignSelf: "stretch",
        flexDirection: "column",
        overflow: "hidden",
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
        backgroundColor: theme.mode === "dark" ? theme.palette.background.default : "#f5f6f8",
    },

    ticketsList: {
        flex: 1,
        minHeight: 0,
        maxHeight: "100%",
        overflowY: "auto",
        ...theme.scrollbarStyles,
        borderTop: "none",
        backgroundColor: "transparent",
        boxShadow: "none",
    },

    ticketsListHeader: {
        color: "rgb(67, 83, 105)",
        zIndex: 2,
        backgroundColor: "white",
        borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },

    ticketsCount: {
        fontWeight: "normal",
        color: "rgb(104, 121, 146)",
        marginLeft: "8px",
        fontSize: "14px",
    },

    noTicketsText: {
        textAlign: "center",
        color: "rgb(104, 121, 146)",
        fontSize: "14px",
        lineHeight: "1.4",
    },

    noTicketsTitle: {
        textAlign: "center",
        fontSize: "16px",
        fontWeight: "600",
        margin: "0px",
    },

    noTicketsDiv: {
        display: "flex",
        // height: "190px",
        margin: 40,
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
}));

const ticketSortAsc = (a, b) => {
    
    if (a.updatedAt < b.updatedAt) {
        return -1;
    }
    if (a.updatedAt > b.updatedAt) {
        return 1;
    }
    return 0;
}

const ticketSortDesc = (a, b) => {
   
    if (a.updatedAt > b.updatedAt) {
        return -1;
    }
    if (a.updatedAt < b.updatedAt) {
        return 1;
    }
    return 0;
}

/** IDs podem vir como string (socket) ou number (API) — comparação estrita gerava duplicatas. */
const ticketIdKey = (ticketOrId) => {
    const raw =
        ticketOrId != null && typeof ticketOrId === "object"
            ? ticketOrId.id
            : ticketOrId;
    const id = Number(raw);
    return Number.isFinite(id) ? id : null;
};

const findTicketIndexById = (list, ticketOrId) => {
    const key = ticketIdKey(ticketOrId);
    if (key == null) return -1;
    return list.findIndex((t) => ticketIdKey(t) === key);
};

const dedupeTicketsById = (list) => {
    const seen = new Set();
    const out = [];
    for (const ticket of list) {
        const key = ticketIdKey(ticket);
        if (key == null || seen.has(key)) continue;
        seen.add(key);
        out.push(ticket);
    }
    return out;
};

const applySort = (list, sortDir) => {
    if (!sortDir || !["ASC", "DESC"].includes(sortDir)) return list;
    const next = [...list];
    next.sort(sortDir === "ASC" ? ticketSortAsc : ticketSortDesc);
    return next;
};

const reducer = (state, action) => {
    const sortDir = action.sortDir;
    
    if (action.type === "LOAD_TICKETS") {
        const newTickets = Array.isArray(action.payload) ? action.payload : [];
        const pageNumber = Number(action.pageNumber) || 1;

        let next;
        if (pageNumber <= 1) {
            next = [...newTickets];
        } else {
            next = [...state];
            newTickets.forEach((ticket) => {
                const ticketIndex = findTicketIndexById(next, ticket);
                if (ticketIndex !== -1) {
                    next[ticketIndex] = ticket;
                    if (ticket.unreadMessages > 0) {
                        const [item] = next.splice(ticketIndex, 1);
                        next.unshift(item);
                    }
                } else {
                    next.push(ticket);
                }
            });
        }

        return dedupeTicketsById(applySort(next, sortDir));
    }

    if (action.type === "RESET_UNREAD") {
        const ticketId = action.payload;
        const next = [...state];
        const ticketIndex = findTicketIndexById(next, ticketId);

        if (ticketIndex !== -1) {
            next[ticketIndex] = { ...next[ticketIndex], unreadMessages: 0 };
        }

        return dedupeTicketsById(applySort(next, sortDir));
    }

    if (action.type === "UPDATE_TICKET") {
        const ticket = action.payload;
        const next = [...state];
        const ticketIndex = findTicketIndexById(next, ticket);

        if (ticketIndex !== -1) {
            next[ticketIndex] = ticket;
        } else {
            next.unshift(ticket);
        }

        return dedupeTicketsById(applySort(next, sortDir));
    }

    if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
        const ticket = action.payload;
        const next = [...state];
        const ticketIndex = findTicketIndexById(next, ticket);

        if (ticketIndex !== -1) {
            next[ticketIndex] = ticket;
            const [item] = next.splice(ticketIndex, 1);
            next.unshift(item);
        } else if (action.status === action.payload?.status) {
            next.unshift(ticket);
        }

        return dedupeTicketsById(applySort(next, sortDir));
    }

    if (action.type === "UPDATE_TICKET_CONTACT") {
        const contact = action.payload;
        const contactKey = Number(contact?.id);
        if (!Number.isFinite(contactKey)) return state;

        const next = state.map((t) =>
            Number(t.contactId) === contactKey ? { ...t, contact } : t
        );
        return dedupeTicketsById(next);
    }

    if (action.type === "DELETE_TICKET") {
        const key = ticketIdKey(action.payload);
        if (key == null) return state;

        const next = state.filter((t) => ticketIdKey(t) !== key);
        return dedupeTicketsById(applySort(next, sortDir));
    }

    if (action.type === "RESET") {
        return [];
    }

    return state;
};

const TicketsListCustom = (props) => {
    const {
        setTabOpen,
        status,
        searchParam,
        searchOnMessages,
        tags,
        users,
        showAll,
        selectedQueueIds,
        updateCount,
        style,
        whatsappIds,
        forceSearch,
        statusFilter,
        userFilter,
        sortTickets,
        unreadOnly,
        groupsOnly,
        allowDragToTagFolder,
    } = props;

    const classes = useStyles();
    const [pageNumber, setPageNumber] = useState(1);
    const [ticketsList, dispatch] = useReducer(reducer, []);
    //   const socketManager = useContext(SocketContext);
    const { user, socket } = useContext(AuthContext);

    const { companyId } = user;
    const showTicketWithoutQueue =
        user.allTicket === "enable" || user.allTicket === "enabled";
    const tagsParam = useMemo(() => JSON.stringify(tags || []), [tags]);
    const usersParam = useMemo(() => JSON.stringify(users || []), [users]);
    const queueIdsParam = useMemo(
        () => JSON.stringify(selectedQueueIds || []),
        [selectedQueueIds]
    );
    const whatsappIdsParam = useMemo(
        () => JSON.stringify(whatsappIds || []),
        [whatsappIds]
    );
    const statusFilterParam = useMemo(
        () => JSON.stringify(statusFilter || []),
        [statusFilter]
    );

    const { tickets, hasMore, loading } = useTickets({
        pageNumber,
        searchParam,
        status,
        showAll,
        searchOnMessages: searchOnMessages ? "true" : "false",
        tags: tagsParam,
        users: usersParam,
        queueIds: queueIdsParam,
        whatsappIds: whatsappIdsParam,
        statusFilter: statusFilterParam,
        userFilter,
        sortTickets,
        unreadOnly,
        groupsOnly,
        forceSearch,
    });

    useEffect(() => {
        tdlog("TicketsListCustom: RESET reducer (filtros mudaram) → lista zera e aguarda API nova", {
            status,
            searchParam: searchParam || null,
            tags: tagsParam,
            selectedQueueIds: queueIdsParam,
        });
        dispatch({ type: "RESET" });
        setPageNumber(1);
    }, [
        status,
        searchParam,
        showAll,
        tagsParam,
        usersParam,
        forceSearch,
        queueIdsParam,
        whatsappIdsParam,
        statusFilterParam,
        sortTickets,
        searchOnMessages,
        unreadOnly,
        groupsOnly,
        user?.id
    ]);

    useEffect(() => {
        if (user?.id == null) return;
        // Evita repopular a lista com o lote anterior da API enquanto o RESET aguarda o novo GET.
        if (pageNumber === 1 && loading) return;

        tdlog("TicketsListCustom: LOAD_TICKETS (API/socket → reducer)", {
            status,
            pageNumber,
            qtdDaApi: Array.isArray(tickets) ? tickets.length : null,
            sortTickets,
        });
        dispatch({
            type: "LOAD_TICKETS",
            payload: tickets,
            pageNumber,
            status,
            sortDir: sortTickets
        });
    }, [tickets, user?.id, status, sortTickets, pageNumber, loading]);

    const userIdRef = useRef(user?.id);
    userIdRef.current = user?.id;

    const showAllRef = useRef(showAll);
    showAllRef.current = showAll;

    const selectedQueueIdsRef = useRef(selectedQueueIds);
    selectedQueueIdsRef.current = selectedQueueIds;

    const showTicketWithoutQueueRef = useRef(showTicketWithoutQueue);
    showTicketWithoutQueueRef.current = showTicketWithoutQueue;

    const sortTicketsRef = useRef(sortTickets);
    sortTicketsRef.current = sortTickets;

    useEffect(() => {
        const shouldUpdateTicket = ticket => {
            if (!ticket) return false;

            const isAssignedToCurrentUser = ticket.userId === userIdRef.current;
            const canSeeByUser = !ticket.userId || isAssignedToCurrentUser || showAllRef.current;
            const selectedQueueIds = selectedQueueIdsRef.current || [];
            const canSeeByQueue =
                isAssignedToCurrentUser ||
                selectedQueueIds.length === 0 ||
                (!ticket.queueId && showTicketWithoutQueueRef.current) ||
                selectedQueueIds.indexOf(ticket.queueId) > -1;

            return canSeeByUser && canSeeByQueue;
        }

        const notBelongsToUserQueues = (ticket) =>
            ticket.queueId &&
            ticket.userId !== userIdRef.current &&
            !showAllRef.current &&
            (selectedQueueIdsRef.current || []).length > 0 &&
            selectedQueueIdsRef.current.indexOf(ticket.queueId) === -1;

        const onCompanyTicketTicketsList = (data) => {
            if (data.action === "updateUnread") {
                dispatch({
                    type: "RESET_UNREAD",
                    payload: data.ticketId,
                    status: status,
                    sortDir: sortTicketsRef.current
                });
            }
            if (data.action === "update" &&
                shouldUpdateTicket(data.ticket) && data.ticket.status === status) {
                dispatch({
                    type: "UPDATE_TICKET",
                    payload: data.ticket,
                    status: status,
                    sortDir: sortTicketsRef.current
                });
            }

            if (data.action === "update" && notBelongsToUserQueues(data.ticket)) {
                dispatch({
                    type: "DELETE_TICKET", payload: data.ticket?.id, status: status,
                    sortDir: sortTicketsRef.current
                });
            }

            if (data.action === "delete") {
                dispatch({
                    type: "DELETE_TICKET", payload: data?.ticketId, status: status,
                    sortDir: sortTicketsRef.current
                });

            }
        };

        const onCompanyAppMessageTicketsList = (data) => {
            if (data.action === "create" &&
                shouldUpdateTicket(data.ticket) && data.ticket.status === status) {
                dispatch({
                    type: "UPDATE_TICKET_UNREAD_MESSAGES",
                    payload: data.ticket,
                    status: status,
                    sortDir: sortTicketsRef.current
                });
            }
        };

        const onCompanyContactTicketsList = (data) => {
            if (data.action === "update" && data.contact) {
                dispatch({
                    type: "UPDATE_TICKET_CONTACT",
                    payload: data.contact,
                    status: status,
                    sortDir: sortTicketsRef.current
                });
            }
        };

        const onConnectTicketsList = () => {
            if (status) {
                socket.emit("joinTickets", status);
            } else {
                socket.emit("joinNotification");
            }
        }

        if (isSocketClientReady(socket)) {
            socket.on("connect", onConnectTicketsList)
            socket.on(`company-${companyId}-ticket`, onCompanyTicketTicketsList);
            socket.on(`company-${companyId}-appMessage`, onCompanyAppMessageTicketsList);
            socket.on(`company-${companyId}-contact`, onCompanyContactTicketsList);
        }

        return () => {
            if (isSocketClientReady(socket)) {
                if (status) {
                    socket.emit("leaveTickets", status);
                } else {
                    socket.emit("leaveNotification");
                }
                socket.off("connect", onConnectTicketsList);
                socket.off(`company-${companyId}-ticket`, onCompanyTicketTicketsList);
                socket.off(`company-${companyId}-appMessage`, onCompanyAppMessageTicketsList);
                socket.off(`company-${companyId}-contact`, onCompanyContactTicketsList);
            }
        };

    }, [status, companyId, socket]);

    useEffect(() => {
        if (typeof updateCount === "function") {
            updateCount(ticketsList.length);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketsList]);

    const ticketsForRender =
        status && status !== "search"
            ? ticketsList.filter((ticket) => ticket.status === status)
            : ticketsList;

    useEffect(() => {
        tdlog("TicketsListCustom: conversas listadas (o que vai no <List>)", {
            status,
            noReducer: ticketsList.length,
            aposFiltroStatus: ticketsForRender.length,
            loading,
            temStyleInline: Boolean(style),
        });
    }, [ticketsList.length, ticketsForRender.length, status, loading, style]);

    const loadMore = () => {
        setPageNumber((prevState) => prevState + 1);
    };

    const handleScroll = (e) => {
        if (!hasMore || loading) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

        if (scrollHeight - (scrollTop + 100) < clientHeight) {
            loadMore();
        }
    };

    return (
        <Paper className={classes.ticketsListWrapper} style={style}>
            <Paper
                square
                name="closed"
                elevation={0}
                className={classes.ticketsList}
                onScroll={handleScroll}
            >
                <List component="ul" disablePadding style={{ paddingTop: 4, paddingBottom: 8 }} >
                    {ticketsForRender.length === 0 && !loading ? (
                        <div className={classes.noTicketsDiv}>
                            <span className={classes.noTicketsTitle}>
                                {i18n.t("ticketsList.noTicketsTitle")}
                            </span>
                            <p className={classes.noTicketsText}>
                                {i18n.t("ticketsList.noTicketsMessage")}
                            </p>
                        </div>
                    ) : (
                        <>
                            {ticketsForRender.map((ticket) => (
                                // <List key={ticket.id}>
                                //     {console.log(ticket)}
                                <TicketListItem
                                    ticket={ticket}
                                    key={ticket.id}
                                    setTabOpen={setTabOpen}
                                    allowDragToTagFolder={allowDragToTagFolder !== false}
                                />
                                // </List>
                            ))}
                        </>
                    )}
                    {loading && <TicketsListSkeleton />}
                </List>
            </Paper>
        </Paper>
    );
};

export default TicketsListCustom;
