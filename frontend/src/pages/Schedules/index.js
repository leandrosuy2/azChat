import React, {
  useState,
  useEffect,
  useReducer,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";
import { makeStyles, alpha } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import Box from "@material-ui/core/Box";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import ScheduleModal from "../../components/ScheduleModal";
import MessageModal from "../../components/MessageModal";
import HelpHint from "../../components/HelpHint";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import moment from "moment";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import "moment/locale/pt-br";
import "react-big-calendar/lib/css/react-big-calendar.css";
import ScheduleCalendarPanel, {
  SCHEDULE_CATEGORIES,
} from "../../components/ScheduleCalendarPanel";
import { inferScheduleCategory } from "../../utils/scheduleCategories";
import SearchIcon from "@material-ui/icons/Search";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import "./Schedules.css";

function getUrlParam(paramName) {
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get(paramName);
}

function parseContactIdFromUrl() {
  const cid = getUrlParam("contactId");
  if (!cid || String(cid).trim() === "") return "";
  const n = parseInt(cid, 10);
  return Number.isFinite(n) && n > 0 ? n : "";
}

const eventTitleStyle = {
  fontSize: "14px",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

const defaultMessages = {
  date: "Data",
  time: "Hora",
  event: "Evento",
  allDay: "Dia Todo",
  week: "Semana",
  work_week: "Agendamentos",
  day: "Dia",
  month: "Mês",
  previous: "Anterior",
  next: "Próximo",
  yesterday: "Ontem",
  tomorrow: "Amanhã",
  today: "Hoje",
  agenda: "Agenda",
  noEventsInRange: "Não há agendamentos no período.",
  showMore: function showMore(total) {
    return "+" + total + " mais";
  },
};

const reducer = (state, action) => {
  if (action.type === "LOAD_SCHEDULES") {
    const schedules = action.payload;
    const newSchedules = [];

    schedules.forEach((schedule) => {
      const scheduleIndex = state.findIndex((s) => s.id === schedule.id);
      if (scheduleIndex !== -1) {
        state[scheduleIndex] = schedule;
      } else {
        newSchedules.push(schedule);
      }
    });

    return [...state, ...newSchedules];
  }

  if (action.type === "UPDATE_SCHEDULES") {
    const schedule = action.payload;
    const scheduleIndex = state.findIndex((s) => s.id === schedule.id);

    if (scheduleIndex !== -1) {
      state[scheduleIndex] = schedule;
      return [...state];
    }
    return [schedule, ...state];
  }

  if (action.type === "DELETE_SCHEDULE") {
    const scheduleId = action.payload;

    const scheduleIndex = state.findIndex((s) => s.id === scheduleId);
    if (scheduleIndex !== -1) {
      state.splice(scheduleIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
  return state;
};


const useStyles = makeStyles((theme) => ({
  toolbarPaper: {
    flexShrink: 0,
    padding: theme.spacing(1, 1.5),
    marginBottom: theme.spacing(1),
    borderRadius: theme.spacing(1),
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.grey[900]
        : theme.palette.grey[50],
    boxShadow:
      theme.palette.type === "dark"
        ? "none"
        : `0 1px 3px ${alpha(theme.palette.common.black, 0.06)}`,
  },
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "auto",
    borderRadius: theme.spacing(1),
    ...theme.scrollbarStyles,
  },
  tableHeadCell: {
    fontWeight: 600,
    fontSize: "0.8125rem",
    backgroundColor:
      theme.palette.type === "dark"
        ? alpha(theme.palette.common.white, 0.04)
        : alpha(theme.palette.common.black, 0.03),
  },
  calendarToolbar: {
    "& .rbc-toolbar-label": {
      color: theme.mode === "light" ? theme.palette.light : "white",
    },
    "& .rbc-btn-group button": {
      color: theme.mode === "light" ? theme.palette.light : "white",
      "&:hover": {
        color: theme.palette.mode === "dark" ? "#fff" : "#000",
      },
      "&:active": {
        color: theme.palette.mode === "dark" ? "#fff" : "#000",
      },
      "&:focus": {
        color: theme.palette.mode === "dark" ? "#fff" : "#000",
      },
      "&.rbc-active": {
        color: theme.palette.mode === "dark" ? "#fff" : "#000",
      },
    },
  },
}));

function scheduleStatusLabel(status) {
  const u = String(status || "").toUpperCase();
  const key = `schedules.statusLabels.${u}`;
  const t = i18n.t(key);
  return t !== key ? t : status || "—";
}

const Schedules = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user, socket } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [deletingSchedule, setDeletingSchedule] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [schedules, dispatch] = useReducer(reducer, []);
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [selectedScheduledMessage, setSelectedScheduledMessage] = useState(null);
  const [contactId, setContactId] = useState(parseContactIdFromUrl);

  const [mainViewTab, setMainViewTab] = useState("calendar");
  const [scheduleKindFilter, setScheduleKindFilter] = useState("");
  const [categoryTab, setCategoryTab] = useState("scheduled_message");

  const { getPlanCompany } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useSchedules) {
        toast.error(
          "Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando."
        );
        setTimeout(() => {
          history.push(`/`);
        }, 1000);
      }
    }
    fetchData();
  }, [user, history, getPlanCompany]);

  const fetchSchedules = useCallback(async () => {
    try {
      const params = {
        searchParam,
        pageNumber: mainViewTab === "calendar" ? "all" : pageNumber,
        contactId: contactId !== "" && contactId != null ? contactId : undefined,
      };
      if (scheduleKindFilter === "withTicket") {
        params.scheduleKind = "withTicket";
      } else if (scheduleKindFilter === "directOnly") {
        params.scheduleKind = "directOnly";
      }
      const { data } = await api.get("/schedules", { params });

      dispatch({ type: "LOAD_SCHEDULES", payload: data.schedules });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err);
    }
  }, [searchParam, pageNumber, contactId, scheduleKindFilter, mainViewTab]);

  const fetchScheduledMessages = useCallback(async () => {
    try {
      const { data } = await api.get("/schedules-message", {
        params: { searchParam, pageNumber: "all" },
      });
      setScheduledMessages(Array.isArray(data.schedules) ? data.schedules : []);
    } catch (err) {
      toastError(err);
      setScheduledMessages([]);
    }
  }, [searchParam]);

  useEffect(() => {
    const id = parseContactIdFromUrl();
    if (id !== "") {
      setSelectedSchedule(null);
      setScheduleModalOpen(true);
    }
  }, []);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, scheduleKindFilter]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchSchedules();
      fetchScheduledMessages();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [
    searchParam,
    pageNumber,
    contactId,
    scheduleKindFilter,
    fetchSchedules,
    fetchScheduledMessages,
  ]);

  useEffect(() => {
    const onCompanySchedule = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_SCHEDULES", payload: data.schedule });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_SCHEDULE", payload: +data.scheduleId });
      }
    };

    socket.on(`company${user.companyId}-schedule`, onCompanySchedule);

    return () => {
      socket.off(`company${user.companyId}-schedule`, onCompanySchedule);
    };
  }, [socket, user.companyId]);

  const cleanContact = () => {
    setContactId("");
  };

  const handleOpenScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setSelectedSchedule(null);
    setScheduleModalOpen(false);
  };

  const handleEditScheduledMessage = (message) => {
    setSelectedScheduledMessage(message);
    setMessageModalOpen(true);
  };

  const handleCloseMessageModal = () => {
    setSelectedScheduledMessage(null);
    setMessageModalOpen(false);
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleEditSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setScheduleModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (scheduleId == null) return;
    try {
      await api.delete(`/schedules/${scheduleId}`);
      toast.success(i18n.t("schedules.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingSchedule(null);
    setConfirmModalOpen(false);
    setSearchParam("");
    setPageNumber(1);
    dispatch({ type: "RESET" });
    await fetchSchedules();
  };

  const handleDeleteScheduledMessage = async (messageId) => {
    if (messageId == null) return;
    try {
      await api.delete(`/schedules-message/${messageId}`);
      toast.success(i18n.t("schedules.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingSchedule(null);
    setConfirmModalOpen(false);
    await fetchScheduledMessages();
  };

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

  const truncate = (str, len) => {
    if (!str) return "";
    if (str.length > len) {
      return str.substring(0, len) + "...";
    }
    return str;
  };

  const scheduleTypeLabel = (sch) =>
    sch.openTicket === "enabled"
      ? i18n.t("schedules.type.withTicket")
      : i18n.t("schedules.type.direct");

  const schedulesSortedBySendAt = useMemo(
    () =>
      [...schedules].sort((a, b) => {
        const ta = a.sendAt ? new Date(a.sendAt).getTime() : 0;
        const tb = b.sendAt ? new Date(b.sendAt).getTime() : 0;
        return tb - ta;
      }),
    [schedules]
  );

  const categoriesWithData = useMemo(() => {
    const counts = {};
    schedulesSortedBySendAt.forEach((s) => {
      const c = inferScheduleCategory(s);
      counts[c] = (counts[c] || 0) + 1;
    });
    if (scheduledMessages.length > 0) {
      counts.scheduled_message =
        (counts.scheduled_message || 0) + scheduledMessages.length;
    }
    return SCHEDULE_CATEGORIES.filter((cat) => (counts[cat.id] || 0) > 0);
  }, [schedulesSortedBySendAt, scheduledMessages]);

  useEffect(() => {
    if (
      categoriesWithData.length > 0 &&
      !categoriesWithData.find((c) => c.id === categoryTab)
    ) {
      setCategoryTab(categoriesWithData[0].id);
    }
  }, [categoriesWithData, categoryTab]);

  const listForCategory = useMemo(
    () =>
      schedulesSortedBySendAt.filter((s) => inferScheduleCategory(s) === categoryTab),
    [schedulesSortedBySendAt, categoryTab]
  );

  const scheduledMessagesSorted = useMemo(
    () =>
      [...scheduledMessages].sort((a, b) => {
        const ta = a.data_mensagem_programada
          ? new Date(a.data_mensagem_programada).getTime()
          : 0;
        const tb = b.data_mensagem_programada
          ? new Date(b.data_mensagem_programada).getTime()
          : 0;
        return tb - ta;
      }),
    [scheduledMessages]
  );

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingSchedule &&
          `${i18n.t("schedules.confirmationModal.deleteTitle")}`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() =>
          deletingSchedule?.id != null &&
          (deletingSchedule.source === "scheduled-message"
            ? handleDeleteScheduledMessage(deletingSchedule.id)
            : handleDeleteSchedule(deletingSchedule.id))
        }
      >
        {i18n.t("schedules.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      {scheduleModalOpen && (
        <ScheduleModal
          open={scheduleModalOpen}
          onClose={handleCloseScheduleModal}
          reload={fetchSchedules}
          scheduleId={selectedSchedule ? selectedSchedule.id : null}
          contactId={contactId}
          cleanContact={cleanContact}
        />
      )}
      {messageModalOpen && (
        <MessageModal
          open={messageModalOpen}
          onClose={handleCloseMessageModal}
          reload={fetchScheduledMessages}
          messageId={selectedScheduledMessage ? selectedScheduledMessage.id : null}
        />
      )}
      <MainHeader>
        <Box>
          <span style={{ display: "flex", alignItems: "center" }}>
            <Title>
              {i18n.t("schedules.title")} ({schedules.length})
            </Title>
            <HelpHint areaKey="schedules" />
          </span>
          <Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
            {i18n.t("schedules.subtitle")}
          </Typography>
        </Box>
        <MainHeaderButtonsWrapper>
          <Box
            className={classes.toolbarPaper}
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TextField
              placeholder={i18n.t("contacts.searchPlaceholder")}
              type="search"
              variant="outlined"
              size="small"
              value={searchParam}
              onChange={handleSearch}
              style={{ minWidth: 200, flex: "1 1 200px" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon style={{ color: "#888" }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" color="primary" onClick={handleOpenScheduleModal}>
              {i18n.t("schedules.buttons.add")}
            </Button>
          </Box>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.toolbarPaper} elevation={0} variant="outlined">
        <Tabs
          value={mainViewTab}
          onChange={(_e, v) => setMainViewTab(v)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab value="calendar" label={i18n.t("schedules.tabs.calendar")} />
          <Tab value="list" label={i18n.t("schedules.tabs.list")} />
        </Tabs>
        {mainViewTab === "list" && (
          <Box mt={1.5} display="flex" flexWrap="wrap" style={{ gap: 8 }}>
            <Chip
              size="small"
              label={i18n.t("schedules.filters.all")}
              onClick={() => setScheduleKindFilter("")}
              color={scheduleKindFilter === "" ? "primary" : "default"}
              clickable
            />
            <Chip
              size="small"
              label={i18n.t("schedules.filters.withTicket")}
              onClick={() => setScheduleKindFilter("withTicket")}
              color={scheduleKindFilter === "withTicket" ? "primary" : "default"}
              clickable
            />
            <Chip
              size="small"
              label={i18n.t("schedules.filters.directOnly")}
              onClick={() => setScheduleKindFilter("directOnly")}
              color={scheduleKindFilter === "directOnly" ? "primary" : "default"}
              clickable
            />
          </Box>
        )}
      </Paper>

      <Paper className={classes.mainPaper} variant="outlined" onScroll={handleScroll}>
        {mainViewTab === "calendar" && (
          <>
            {categoriesWithData.length > 0 ? (
              <Tabs
                value={categoryTab}
                onChange={(_e, v) => setCategoryTab(v)}
                indicatorColor="primary"
                textColor="primary"
                variant="scrollable"
                scrollButtons="auto"
                style={{ marginBottom: 8 }}
              >
                {categoriesWithData.map((cat) => (
                  <Tab key={cat.id} value={cat.id} label={cat.label} />
                ))}
              </Tabs>
            ) : null}
            <ScheduleCalendarPanel
              schedules={schedulesSortedBySendAt}
              scheduledMessages={scheduledMessagesSorted}
              categoryTab={categoryTab}
              onEdit={handleEditSchedule}
              onDelete={(sch) => {
                setDeletingSchedule(sch);
                setConfirmModalOpen(true);
              }}
              onEditScheduledMessage={handleEditScheduledMessage}
              onDeleteScheduledMessage={(msg) => {
                setDeletingSchedule({ ...msg, source: "scheduled-message" });
                setConfirmModalOpen(true);
              }}
              onReschedule={fetchSchedules}
              onRescheduleScheduledMessage={fetchScheduledMessages}
              messages={defaultMessages}
              calendarClassName={classes.calendarToolbar}
            />
          </>
        )}

        {mainViewTab === "list" && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell className={classes.tableHeadCell}>
                  {i18n.t("schedules.table.sendAt")}
                </TableCell>
                <TableCell className={classes.tableHeadCell}>
                  {i18n.t("schedules.table.contact")}
                </TableCell>
                <TableCell className={classes.tableHeadCell}>
                  {i18n.t("schedules.table.type")}
                </TableCell>
                <TableCell className={classes.tableHeadCell}>
                  {i18n.t("schedules.table.body")}
                </TableCell>
                <TableCell className={classes.tableHeadCell}>
                  {i18n.t("schedules.table.status")}
                </TableCell>
                <TableCell align="right" className={classes.tableHeadCell}>
                  {i18n.t("schedules.table.actions")}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categoryTab === "scheduled_message" &&
                scheduledMessagesSorted.map((msg) => (
                  <TableRow key={`scheduled-message-${msg.id}`}>
                    <TableCell>
                      {msg.data_mensagem_programada
                        ? moment(msg.data_mensagem_programada).format("DD/MM/YYYY HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>{msg.nome || "Mensagem agendada"}</TableCell>
                    <TableCell>
                      <Chip size="small" label="Mensagem agendada" variant="outlined" />
                    </TableCell>
                    <TableCell>{truncate(String(msg.mensagem || ""), 80)}</TableCell>
                    <TableCell>
                      <Chip size="small" label="Programada" />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => handleEditScheduledMessage(msg)}
                        aria-label="edit"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDeletingSchedule({ ...msg, source: "scheduled-message" });
                          setConfirmModalOpen(true);
                        }}
                        aria-label="delete"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {listForCategory.map((sch) => (
                <TableRow key={sch.id}>
                  <TableCell>
                    {sch.sendAt ? moment(sch.sendAt).format("DD/MM/YYYY HH:mm") : "—"}
                  </TableCell>
                  <TableCell>{sch.contact?.name || "—"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={scheduleTypeLabel(sch)} variant="outlined" />
                  </TableCell>
                  <TableCell>{truncate(String(sch.body || ""), 80)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={scheduleStatusLabel(sch.status)}
                      color={
                        sch.status === "ENVIADA"
                          ? "primary"
                          : sch.status === "ERRO"
                            ? "secondary"
                            : "default"
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEditSchedule(sch)} aria-label="edit">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setDeletingSchedule(sch);
                        setConfirmModalOpen(true);
                      }}
                      aria-label="delete"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
    </MainContainer>
  );
};

export default Schedules;
