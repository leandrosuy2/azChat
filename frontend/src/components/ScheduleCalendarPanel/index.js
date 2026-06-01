import React, { useMemo, useCallback } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
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

const ScheduleEventCard = ({ event, onEdit, onDelete }) => {
  const classes = useStyles();
  const sch = event.resource;
  const cat = getScheduleCategoryMeta(inferScheduleCategory(sch));
  const pic = sch?.contact?.urlPicture || sch?.contact?.profilePicUrl;

  return (
    <Box
      className={classes.eventCard}
      style={{ borderLeftColor: cat.color }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(sch);
      }}
    >
      <Avatar src={pic || undefined} style={{ width: 28, height: 28, fontSize: 12 }}>
        {(sch?.contact?.name || "?").charAt(0)}
      </Avatar>
      <Box className={classes.eventBody}>
        <Typography className={classes.eventTitle}>
          {sch?.contact?.name || "Sem contato"}
        </Typography>
        <Typography className={classes.eventSub}>
          {cat.label} · {moment(sch.sendAt).format("HH:mm")}
        </Typography>
        <Typography className={classes.eventSub}>
          {(sch?.body || "").slice(0, 60)}
        </Typography>
      </Box>
      <Box className={classes.eventActions}>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(sch);
          }}
        >
          <EditIcon style={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(sch);
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
  categoryTab,
  onEdit,
  onDelete,
  onReschedule,
  messages,
  calendarClassName,
}) => {
  const filtered = useMemo(
    () =>
      schedules.filter(
        (s) => inferScheduleCategory(s) === categoryTab
      ),
    [schedules, categoryTab]
  );

  const events = useMemo(
    () =>
      filtered.map((sch) => ({
        id: sch.id,
        title: sch.contact?.name || "Agendamento",
        start: new Date(sch.sendAt),
        end: new Date(sch.sendAt),
        resource: sch,
      })),
    [filtered]
  );

  const EventComponent = useCallback(
    ({ event }) => (
      <ScheduleEventCard event={event} onEdit={onEdit} onDelete={onDelete} />
    ),
    [onEdit, onDelete]
  );

  const handleEventDrop = async ({ event, start }) => {
    const sch = event.resource;
    if (!sch?.id) return;
    try {
      await api.put(`/schedules/${sch.id}`, {
        ...sch,
        sendAt: moment(start).format("YYYY-MM-DDTHH:mm:ss"),
        scheduleCategory: inferScheduleCategory(sch),
      });
      toast.success("Agendamento reagendado.");
      if (typeof onReschedule === "function") onReschedule();
    } catch (err) {
      toastError(err);
    }
  };

  if (events.length === 0) {
    return (
      <Box p={3} textAlign="center" color="textSecondary">
        <Typography variant="body2">
          Nenhum agendamento nesta categoria no período.
        </Typography>
      </Box>
    );
  }

  return (
    <Calendar
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
      onSelectEvent={(ev) => onEdit(ev.resource)}
    />
  );
};

export { SCHEDULE_CATEGORIES };
export default ScheduleCalendarPanel;
