import React, { useMemo, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import moment from "moment";
import { Box, Avatar, IconButton, Typography, makeStyles } from "@material-ui/core";
import EditIcon from "@material-ui/icons/Edit";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import {
  SCHEDULE_CATEGORIES,
  getScheduleCategoryMeta,
  inferScheduleCategory,
} from "../../utils/scheduleCategories";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";

const localizer = momentLocalizer(moment);
const DragAndDropCalendar = withDragAndDrop(Calendar);

const useStyles = makeStyles((theme) => ({
  eventCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 6,
    padding: "4px 6px",
    borderRadius: 6,
    borderLeft: "4px solid",
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
    minHeight: 52,
    cursor: "pointer",
  },
  eventBody: { flex: 1, minWidth: 0 },
  eventTitle: {
    fontWeight: 700,
    fontSize: "0.75rem",
    lineHeight: 1.2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  eventSub: {
    fontSize: "0.65rem",
    color: theme.palette.text.secondary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  eventActions: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
}));

const isScheduledMessage = (item) => item?.source === "scheduled-message";

const eventDate = (item) =>
  isScheduledMessage(item) ? item.data_mensagem_programada : item.sendAt;

const eventBody = (item) =>
  isScheduledMessage(item) ? item.mensagem : item.body;

const eventTitle = (item) => {
  if (isScheduledMessage(item)) return item.nome || "Mensagem agendada";
  return item.contact?.name || "Sem contato";
};

const ScheduleEventCard = ({ event, onEdit, onDelete }) => {
  const classes = useStyles();
  const item = event.resource;
  const categoryId = isScheduledMessage(item)
    ? "scheduled_message"
    : inferScheduleCategory(item);
  const cat = getScheduleCategoryMeta(categoryId);
  const pic = item?.contact?.urlPicture || item?.contact?.profilePicUrl;
  const title = eventTitle(item);

  return (
    <Box
      className={classes.eventCard}
      style={{ borderLeftColor: cat.color }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(item);
      }}
    >
      <Avatar src={pic || undefined} style={{ width: 28, height: 28, fontSize: 12 }}>
        {(title || "?").charAt(0)}
      </Avatar>
      <Box className={classes.eventBody}>
        <Typography className={classes.eventTitle}>{title}</Typography>
        <Typography className={classes.eventSub}>
          {cat.label} - {moment(eventDate(item)).format("HH:mm")}
        </Typography>
        <Typography className={classes.eventSub}>
          {String(eventBody(item) || "").slice(0, 60)}
        </Typography>
      </Box>
      <Box className={classes.eventActions}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}
        >
          <EditIcon style={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item);
          }}
        >
          <DeleteOutlineIcon style={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
};

const ScheduleCalendarPanel = ({
  schedules,
  scheduledMessages = [],
  categoryTab,
  onEdit,
  onDelete,
  onEditScheduledMessage,
  onDeleteScheduledMessage,
  onReschedule,
  onRescheduleScheduledMessage,
  messages,
  calendarClassName,
}) => {
  const filtered = useMemo(() => {
    const regular = schedules
      .filter((item) => inferScheduleCategory(item) === categoryTab)
      .map((item) => ({ ...item, source: "schedule" }));

    if (categoryTab !== "scheduled_message") return regular;

    return [
      ...regular,
      ...scheduledMessages.map((item) => ({
        ...item,
        source: "scheduled-message",
      })),
    ];
  }, [schedules, scheduledMessages, categoryTab]);

  const events = useMemo(
    () =>
      filtered
        .filter((item) => eventDate(item))
        .map((item) => ({
          id: `${item.source}-${item.id}`,
          title: eventTitle(item),
          start: new Date(eventDate(item)),
          end: new Date(eventDate(item)),
          resource: item,
        })),
    [filtered]
  );

  const editItem = useCallback(
    (item) => {
      if (isScheduledMessage(item)) {
        if (typeof onEditScheduledMessage === "function") onEditScheduledMessage(item);
        return;
      }
      onEdit(item);
    },
    [onEdit, onEditScheduledMessage]
  );

  const deleteItem = useCallback(
    (item) => {
      if (isScheduledMessage(item)) {
        if (typeof onDeleteScheduledMessage === "function") onDeleteScheduledMessage(item);
        return;
      }
      onDelete(item);
    },
    [onDelete, onDeleteScheduledMessage]
  );

  const EventComponent = useCallback(
    ({ event }) => (
      <ScheduleEventCard event={event} onEdit={editItem} onDelete={deleteItem} />
    ),
    [editItem, deleteItem]
  );

  const handleEventDrop = async ({ event, start }) => {
    const item = event.resource;
    if (!item?.id) return;

    try {
      if (isScheduledMessage(item)) {
        await api.put(`/schedules-message/${item.id}`, {
          ...item,
          data_mensagem_programada: moment(start).format("YYYY-MM-DD HH:mm:ss"),
        });
        if (typeof onRescheduleScheduledMessage === "function") {
          onRescheduleScheduledMessage();
        }
      } else {
        await api.put(`/schedules/${item.id}`, {
          ...item,
          sendAt: moment(start).format("YYYY-MM-DDTHH:mm:ss"),
          scheduleCategory: inferScheduleCategory(item),
        });
        if (typeof onReschedule === "function") onReschedule();
      }
      toast.success("Agendamento reagendado.");
    } catch (err) {
      toastError(err);
    }
  };

  if (events.length === 0) {
    return (
      <Box p={3} textAlign="center" color="textSecondary">
        <Typography variant="body2">
          Nenhum agendamento nesta categoria no periodo.
        </Typography>
      </Box>
    );
  }

  return (
    <DragAndDropCalendar
      localizer={localizer}
      events={events}
      startAccessor="start"
      endAccessor="end"
      messages={messages}
      style={{ height: 520 }}
      className={calendarClassName}
      components={{ event: EventComponent }}
      draggableAccessor={() => true}
      resizable={false}
      onEventDrop={handleEventDrop}
      onSelectEvent={(ev) => editItem(ev.resource)}
    />
  );
};

export { SCHEDULE_CATEGORIES };
export default ScheduleCalendarPanel;
