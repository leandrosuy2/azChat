export const SCHEDULE_CATEGORIES = [
  {
    id: "scheduled_message",
    label: "Mensagens agendadas",
    color: "#1976d2",
  },
  {
    id: "contact",
    label: "Contatos",
    color: "#00897b",
  },
  {
    id: "installation",
    label: "Instalações",
    color: "#7b1fa2",
  },
  {
    id: "technical_visit",
    label: "Visitas técnicas",
    color: "#f57c00",
  },
];

export const getScheduleCategoryMeta = (id) =>
  SCHEDULE_CATEGORIES.find((c) => c.id === id) || SCHEDULE_CATEGORIES[0];

export const inferScheduleCategory = (schedule) => {
  if (schedule?.scheduleCategory) return schedule.scheduleCategory;
  if (schedule?.openTicket === "enabled") return "contact";
  return "scheduled_message";
};

export default SCHEDULE_CATEGORIES;
