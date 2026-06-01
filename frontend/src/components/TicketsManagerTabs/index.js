import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTheme, alpha } from "@material-ui/core/styles";
import useMediaQuery from "@material-ui/core/useMediaQuery";
import { useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  InputBase,
  Tabs,
  Tab,
  Badge,
  Typography,
  Grid,
  Tooltip,
  Switch,
  Box,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
} from "@material-ui/core";
import {
  Group,
  MessageSharp as MessageSharpIcon,
  AccessTime as ClockIcon,
  Search as SearchIcon,
  PersonAdd as PersonAddIcon,
  AddCommentOutlined as NewMessageIcon,
} from "@material-ui/icons";

import api from "../../services/api";
import HelpHint from "../HelpHint";
import NewTicketModal from "../NewTicketModal";

import TicketsList from "../TicketsListCustom";
import TabPanel from "../TabPanel";
import TicketsInboxFilterBar from "../TicketsInboxFilterBar";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { QueueSelectedContext } from "../../context/QueuesSelected/QueuesSelectedContext";

import { TicketsContext } from "../../context/Tickets/TicketsContext";

/** Referência estável: `users={[]}` no JSX gerava array novo a cada render e o `useEffect` do TicketsList fazia RESET apagando os tickets. */
const EMPTY_FILTER_ARRAY = [];
const SEARCH_TICKET_STATUS_FILTER = ["open", "pending"];

/** Console em dev. Desliga: `localStorage.setItem('DEBUG_TICKETS','0'); location.reload()` */
const tdlog = (...args) => {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof window !== "undefined" && localStorage.getItem("DEBUG_TICKETS") === "0") return;
  // eslint-disable-next-line no-console
  console.log("[TicketsDebug]", ...args);
};

/** Estilo estável para a lista preencher a camada absoluta ao redimensionar o painel. */
const INBOX_TICKETS_LIST_PAPER_STYLE = {
  flex: 1,
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const useStyles = makeStyles((theme) => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    flex: "1 1 0%",
    minHeight: 0,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "stretch",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  /** Painel de abas (Atendendo / Resolvidos / Busca): ocupa o espaço vertical restante */
  tabPanelFlex: {
    flex: "1 1 0%",
    minHeight: 0,
    minWidth: 0,
  },

  tabPanelItem: {
    minWidth: 0,
    flex: 1,
    fontSize: 11,
    marginLeft: 0,
    paddingLeft: theme.spacing(0.25),
    paddingRight: theme.spacing(0.25),
    [theme.breakpoints.down("md")]: {
      minWidth: 96,
      flex: "0 0 auto",
    },
    [theme.breakpoints.down("sm")]: {
      paddingLeft: theme.spacing(0.5),
      paddingRight: theme.spacing(0.5),
      minWidth: 88,
    },
  },

  ticketsInnerTabs: {
    minHeight: 40,
    [theme.breakpoints.down("md")]: {
      "& .MuiTabs-scrollButtons": {
        width: 28,
      },
    },
  },

  inboxAndQueuesRow: {
    flexShrink: 0,
    alignSelf: "stretch",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    background: theme.palette.optionsBackground,
    borderRadius: 8,
    border: `1px solid ${theme.palette.divider}`,
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5),
    marginLeft: 0,
    marginRight: 0,
    padding: theme.spacing(0.75, 1.5),
    boxShadow:
      theme.mode === "dark"
        ? "none"
        : `0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0.75, 1.25),
    },
  },

  inboxFiltersCol: {
    minWidth: 0,
    width: "100%",
    maxWidth: "100%",
    paddingLeft: "0 !important",
    paddingRight: "0 !important",
    boxSizing: "border-box",
  },

  ticketSubPanel: {
    flex: "1 1 0%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    marginLeft: 0,
    marginRight: 0,
    marginBottom: theme.spacing(0.5),
  },

  /** Uma única área com altura estável; `1 1 0%` força o flex a reservar espaço mesmo com filhos só em `absolute`. */
  ticketsListsStack: {
    position: "relative",
    flex: "1 1 0%",
    minHeight: 0,
    minWidth: 0,
    width: "100%",
  },

  ticketsListLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minHeight: 0,
    minWidth: 0,
  },

  topSearchRow: {
    flexShrink: 0,
    alignSelf: "stretch",
    minHeight: 36,
    background: theme.palette.total,
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: theme.spacing(0.75),
    borderRadius: 8,
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
    border: "1px solid #aaa",
    marginTop: theme.spacing(0.5),
    marginBottom: theme.spacing(0.25),
    marginLeft: 0,
    marginRight: 0,
    paddingLeft: theme.spacing(1.5),
    paddingRight: theme.spacing(1.5),
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    [theme.breakpoints.down("xs")]: {
      flexWrap: "wrap",
      rowGap: theme.spacing(0.5),
    },
  },
  searchFieldCluster: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
  },
  searchIcon: {
    color: "grey",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },

  searchInput: {
    flex: "1 1 0%",
    minWidth: 0,
    border: "none",
    borderRadius: 30,
  },

  searchSwitchWrap: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  searchModeButton: {
    width: 32,
    height: 32,
    padding: 0,
    flexShrink: 0,
    color: "#25d366",
    borderRadius: 6,
    "&:hover": {
      backgroundColor: alpha("#25d366", 0.12),
      color: "#1fa855",
    },
  },
  searchModeButtonActive: {
    color: "#25d366",
    backgroundColor: alpha("#25d366", 0.16),
  },

  customBadge: {
    right: "-10px",
    backgroundColor: "#f44336",
    color: "#fff",
  },

  searchSectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1.25),
    background: alpha(theme.palette.primary.main, 0.06),
    borderTop: `1px solid ${theme.palette.divider}`,
    borderBottom: `1px solid ${theme.palette.divider}`,
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: theme.palette.text.secondary,
    flexShrink: 0,
  },
  searchContactsBox: {
    flex: "1 1 0%",
    minHeight: 0,
    overflowY: "auto",
    background: theme.palette.background.paper,
  },
  searchContactsEmpty: {
    padding: theme.spacing(1.5, 2),
    textAlign: "center",
  },
  searchContactItem: {
    paddingTop: theme.spacing(0.5),
    paddingBottom: theme.spacing(0.5),
  },
  searchContactSecondary: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },

}));

const TicketsManagerTabs = () => {
  const theme = useTheme();
  const classes = useStyles();
  const history = useHistory();
  const narrowInnerTabs = useMediaQuery(theme.breakpoints.down("md"));

  const [searchParam, setSearchParam] = useState("");
  const [tab, setTab] = useState("open");

  const searchInputRef = useRef();
  const [searchOnMessages, setSearchOnMessages] = useState(false);
  const [searchMode, setSearchMode] = useState("messages");
  const [searchContacts, setSearchContacts] = useState([]);
  const [loadingSearchContacts, setLoadingSearchContacts] = useState(false);
  const [newTicketInitialContact, setNewTicketInitialContact] = useState(undefined);

  const { user } = useContext(AuthContext);
  const { setSelectedQueuesMessage } = useContext(QueueSelectedContext);
  const { tabOpen, setTabOpen } = useContext(TicketsContext);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupingCount, setGroupingCount] = useState(0);

  /** Mesmos ids com nova referência em `user.queues` não disparam RESET nas listas. */
  const queueIdsFingerprint = JSON.stringify((user?.queues || []).map((q) => q.id));
  const selectedQueueIds = useMemo(
    () => (user?.queues || []).map((q) => q.id),
    // Depende só do fingerprint: incluir `user.queues` refaria o memo a cada nova referência.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queueIdsFingerprint]
  );
  const [forceSearch, setForceSearch] = useState(false);

  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

  const [inboxQuickFilter, setInboxQuickFilter] = useState("all");
  const [inboxFolderTagId, setInboxFolderTagId] = useState(null);

  /** Referência estável: sem tag de pasta usa o mesmo `[]` que os filtros vazios. */
  const folderTagsForInbox = useMemo(
    () => (inboxFolderTagId != null ? [inboxFolderTagId] : EMPTY_FILTER_ARRAY),
    [inboxFolderTagId]
  );
  const inboxUnreadOnly =
    tab !== "search" && inboxQuickFilter === "unread" ? "true" : "false";
  /** Filtro "Grupos" removido da UI — lista não restringe por conversas de grupo. */
  const inboxGroupsOnly = "false";

  useEffect(() => {
    setSelectedQueuesMessage(selectedQueueIds);
  }, [selectedQueueIds]);

  useEffect(() => {
    if (tab === "search") {
      searchInputRef.current.focus();
    }
    setForceSearch(!forceSearch);
  }, [tab]);

  useEffect(() => {
    if (tab !== "search" || searchMode !== "contacts") {
      setSearchContacts([]);
      setLoadingSearchContacts(false);
      return;
    }
    const term = (searchParam || "").trim();
    setLoadingSearchContacts(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("contacts", {
          params: { searchParam: term, pageNumber: 1, limit: 50 },
        });
        const list = Array.isArray(data?.contacts) ? data.contacts : [];
        setSearchContacts(list.slice(0, 50));
      } catch (_) {
        setSearchContacts([]);
      }
      setLoadingSearchContacts(false);
    }, 400);
    return () => clearTimeout(t);
  }, [tab, searchMode, searchParam]);

  const handleStartConversationWithContact = (contact) => {
    setNewTicketInitialContact(contact);
    setNewTicketModalOpen(true);
  };

  let searchTimeout;

  const handleSearch = (e) => {
    const searchedTerm = e.target.value.toLowerCase();

    clearTimeout(searchTimeout);

    if (searchedTerm === "") {
      setSearchParam(searchedTerm);
      setForceSearch(!forceSearch);
      if (searchMode === "contacts") {
        setTab("search");
      } else {
        setTab("open");
      }
      return;
    } else if (searchMode === "contacts" && tab !== "search") {
      setTab("search");
    }

    searchTimeout = setTimeout(() => {
      setSearchParam(searchedTerm);
      setForceSearch(!forceSearch);
    }, 500);
  };

  const handleToggleContactSearch = () => {
    if (searchMode === "contacts") {
      setSearchMode("messages");
      setSearchContacts([]);
      setLoadingSearchContacts(false);
      setSearchParam("");
      setTab("open");
      setForceSearch((current) => !current);
      if (searchInputRef.current) {
        searchInputRef.current.value = "";
      }
      return;
    }

    setSearchMode("contacts");
    setTab("search");
  };

  const handleBack = () => {

    history.push("/tickets");
  };

  const handleCloseNewTicketModal = (ticket) => {
    setNewTicketModalOpen(false);
    setNewTicketInitialContact(undefined);
    if (ticket && !ticket.standalone && (ticket.uuid || ticket.id)) {
      history.push(`/tickets/${ticket.uuid != null ? ticket.uuid : ticket.id}`);
    }
  };

  const handleChangeTabOpen = (e, newValue) => {
    // if (newValue === "pending" || newValue === "group") {
    handleBack();
    // }

    setTabOpen(newValue);
  };

  /** Sub-aba da inbox: normaliza valores inválidos e evita `group` se o usuário não tem permissão. */
  const inboxSubTabs = ["open", "pending", "group"];
  const rawInboxTab = inboxSubTabs.includes(tabOpen) ? tabOpen : "open";
  const inboxActiveListTab =
    rawInboxTab === "group" && !user.allowGroup ? "open" : rawInboxTab;

  useEffect(() => {
    tdlog("TicketsManagerTabs: qual lista de conversas está visível", {
      tabOpen,
      rawInboxTab,
      inboxActiveListTab,
      allowGroup: user.allowGroup,
    });
  }, [tabOpen, rawInboxTab, inboxActiveListTab, user.allowGroup]);

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <div className={classes.topSearchRow}>
        <Box className={classes.searchFieldCluster}>
          <SearchIcon className={classes.searchIcon} />
          <InputBase
            className={classes.searchInput}
            inputRef={searchInputRef}
            placeholder={
              searchMode === "contacts"
                ? "Buscar contato por nome ou numero"
                : i18n.t("tickets.search.placeholder")
            }
            type="search"
            onChange={handleSearch}
          />
          {searchMode === "messages" && (
            <Tooltip placement="top" title="Marque para pesquisar também nos conteúdos das mensagens (mais lento)">
              <Box className={classes.searchSwitchWrap}>
                <Switch
                  size="small"
                  checked={searchOnMessages}
                  onChange={(e) => {
                    setSearchOnMessages(e.target.checked);
                  }}
                />
              </Box>
            </Tooltip>
          )}
          <Tooltip
            placement="top"
            title={searchMode === "contacts" ? "Voltar para mensagens" : "Buscar contatos"}
          >
            <IconButton
              size="small"
              className={`${classes.searchModeButton} ${
                searchMode === "contacts" ? classes.searchModeButtonActive : ""
              }`}
              onClick={handleToggleContactSearch}
              aria-label={searchMode === "contacts" ? "Voltar para mensagens" : "Buscar contatos"}
            >
              <NewMessageIcon style={{ fontSize: 26 }} />
            </IconButton>
          </Tooltip>
          <HelpHint areaKey="tickets" />
        </Box>
      </div>

      <Paper elevation={0} variant="outlined" className={classes.inboxAndQueuesRow}>
        <Box className={classes.inboxFiltersCol} width="100%">
          {tab !== "search" || searchMode === "messages" ? (
            <TicketsInboxFilterBar
              quickFilter={inboxQuickFilter}
              onQuickFilterChange={setInboxQuickFilter}
              folderTagId={inboxFolderTagId}
              onFolderTagChange={setInboxFolderTagId}
              onContactTagged={() => setForceSearch((f) => !f)}
            />
          ) : (
            <Box minHeight={36} />
          )}
        </Box>
      </Paper>

      <TabPanel
        value={tab}
        name="open"
        className={`${classes.ticketsWrapper} ${classes.tabPanelFlex}`}
      >
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor="primary"
          textColor="primary"
          variant={narrowInnerTabs ? "scrollable" : "fullWidth"}
          scrollButtons={narrowInnerTabs ? "auto" : "off"}
          className={classes.ticketsInnerTabs}
        >
          {/* ATENDENDO */}
          <Tab
            label={
              <Grid container alignItems="center" justifyContent="center">
                <Grid item>
                  <Badge
                    overlap="rectangular"
                    classes={{ badge: classes.customBadge }}
                    badgeContent={openCount}
                    color="primary"
                  >
                    <MessageSharpIcon
                      style={{
                        fontSize: 18,
                      }}
                    />
                  </Badge>
                </Grid>
                <Grid item>
                  <Typography
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {i18n.t("ticketsList.assignedHeader")}
                  </Typography>
                </Grid>
              </Grid>
            }
            value={"open"}
            name="open"
            classes={{ root: classes.tabPanelItem }}
          />

          {/* AGUARDANDO */}
          <Tab
            label={
              <Grid container alignItems="center" justifyContent="center">
                <Grid item>
                  <Badge
                    overlap="rectangular"
                    classes={{ badge: classes.customBadge }}
                    badgeContent={pendingCount}
                    color="primary"
                  >
                    <ClockIcon
                      style={{
                        fontSize: 18,
                      }}
                    />
                  </Badge>
                </Grid>
                <Grid item>
                  <Typography
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {i18n.t("ticketsList.pendingHeader")}
                  </Typography>
                </Grid>
              </Grid>
            }
            value={"pending"}
            name="pending"
            classes={{ root: classes.tabPanelItem }}
          />

          {/* GRUPOS */}
          {user.allowGroup && (
            <Tab
              label={
                <Grid container alignItems="center" justifyContent="center">
                  <Grid item>
                    <Badge
                      overlap="rectangular"
                      classes={{ badge: classes.customBadge }}
                      badgeContent={groupingCount}
                      color="primary"
                    >
                      <Group
                        style={{
                          fontSize: 18,
                        }}
                      />
                    </Badge>
                  </Grid>
                  <Grid item>
                    <Typography
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {i18n.t("ticketsList.groupingHeader")}
                    </Typography>
                  </Grid>
                </Grid>
              }
              value={"group"}
              name="group"
              classes={{ root: classes.tabPanelItem }}
            />
          )}
        </Tabs>

        <Paper className={classes.ticketSubPanel}>
          <Box className={classes.ticketsListsStack}>
            <Box
              className={classes.ticketsListLayer}
              style={{
                display: inboxActiveListTab === "open" ? "flex" : "none",
              }}
            >
              <TicketsList
                status="open"
                searchParam={searchMode === "messages" ? searchParam : ""}
                searchOnMessages={searchMode === "messages" ? searchOnMessages : false}
                showAll={false}
                sortTickets="DESC"
                selectedQueueIds={selectedQueueIds}
                tags={folderTagsForInbox}
                users={EMPTY_FILTER_ARRAY}
                whatsappIds={EMPTY_FILTER_ARRAY}
                statusFilter={EMPTY_FILTER_ARRAY}
                unreadOnly={inboxUnreadOnly}
                groupsOnly={inboxGroupsOnly}
                forceSearch={forceSearch}
                updateCount={(val) => setOpenCount(val)}
                style={INBOX_TICKETS_LIST_PAPER_STYLE}
                setTabOpen={setTabOpen}
              />
            </Box>
            <Box
              className={classes.ticketsListLayer}
              style={{
                display: inboxActiveListTab === "pending" ? "flex" : "none",
              }}
            >
              <TicketsList
                status="pending"
                searchParam={searchMode === "messages" ? searchParam : ""}
                searchOnMessages={searchMode === "messages" ? searchOnMessages : false}
                selectedQueueIds={selectedQueueIds}
                sortTickets="DESC"
                showAll={false}
                tags={folderTagsForInbox}
                users={EMPTY_FILTER_ARRAY}
                whatsappIds={EMPTY_FILTER_ARRAY}
                statusFilter={EMPTY_FILTER_ARRAY}
                unreadOnly={inboxUnreadOnly}
                groupsOnly={inboxGroupsOnly}
                forceSearch={forceSearch}
                updateCount={(val) => setPendingCount(val)}
                style={INBOX_TICKETS_LIST_PAPER_STYLE}
                setTabOpen={setTabOpen}
              />
            </Box>
            {user.allowGroup && (
              <Box
                className={classes.ticketsListLayer}
                style={{
                  display: inboxActiveListTab === "group" ? "flex" : "none",
                }}
              >
                <TicketsList
                  status="group"
                  searchParam={searchMode === "messages" ? searchParam : ""}
                  searchOnMessages={searchMode === "messages" ? searchOnMessages : false}
                  showAll={false}
                  sortTickets="DESC"
                  selectedQueueIds={selectedQueueIds}
                  tags={folderTagsForInbox}
                  users={EMPTY_FILTER_ARRAY}
                  whatsappIds={EMPTY_FILTER_ARRAY}
                  statusFilter={EMPTY_FILTER_ARRAY}
                  unreadOnly={inboxUnreadOnly}
                  groupsOnly={inboxGroupsOnly}
                  forceSearch={forceSearch}
                  updateCount={(val) => setGroupingCount(val)}
                  style={INBOX_TICKETS_LIST_PAPER_STYLE}
                  setTabOpen={setTabOpen}
                />
              </Box>
            )}
          </Box>
        </Paper>
      </TabPanel>
      <TabPanel
        value={tab}
        name="search"
        className={`${classes.ticketsWrapper} ${classes.tabPanelFlex}`}
      >
        {searchMode === "contacts" ? (
          <>
            <Box className={classes.searchSectionHeader}>
              <PersonAddIcon style={{ fontSize: 14 }} />
              <span>Iniciar conversa com contato</span>
              {loadingSearchContacts && (
                <CircularProgress size={12} style={{ marginLeft: "auto" }} />
              )}
            </Box>
            <Box className={classes.searchContactsBox}>
              {!loadingSearchContacts && searchContacts.length === 0 ? (
                <Typography variant="caption" color="textSecondary" className={classes.searchContactsEmpty} component="div">
                  Nenhum contato encontrado.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {searchContacts.map((c) => {
                    const numLabel = (c.number || "").replace(/@.*/, "");
                    return (
                      <React.Fragment key={c.id}>
                        <ListItem
                          button
                          className={classes.searchContactItem}
                          onClick={() => handleStartConversationWithContact(c)}
                        >
                          <ListItemAvatar>
                            <Avatar src={c.urlPicture || c.profilePicUrl || undefined}>
                              {(c.name || "?").charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={c.name || "(sem nome)"}
                            secondary={numLabel || c.email || ""}
                            secondaryTypographyProps={{ className: classes.searchContactSecondary }}
                          />
                        </ListItem>
                        <Divider component="li" />
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Box>
          </>
        ) : (
          <>
            <Box className={classes.searchSectionHeader}>
              <MessageSharpIcon style={{ fontSize: 14 }} />
              <span>Atendimentos e mensagens</span>
            </Box>
            <Box style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <TicketsList
                statusFilter={SEARCH_TICKET_STATUS_FILTER}
                searchParam={searchParam}
                showAll={false}
                tags={folderTagsForInbox}
                users={EMPTY_FILTER_ARRAY}
                selectedQueueIds={selectedQueueIds}
                whatsappIds={EMPTY_FILTER_ARRAY}
                forceSearch={forceSearch}
                searchOnMessages={searchOnMessages}
                status="search"
                unreadOnly="false"
                groupsOnly="false"
                allowDragToTagFolder={false}
              />
            </Box>
          </>
        )}
      </TabPanel>

      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={handleCloseNewTicketModal}
        initialContact={newTicketInitialContact}
      />
    </Paper >
  );
};

export default TicketsManagerTabs;
