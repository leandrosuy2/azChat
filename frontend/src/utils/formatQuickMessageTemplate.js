function makeid(length) {
  let result = "";
  const characters = "0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function msgsd() {
  const hh = new Date().getHours();
  if (hh >= 6 && hh <= 11) return "Bom dia";
  if (hh > 11 && hh <= 17) return "Boa tarde";
  if (hh > 17 && hh <= 23) return "Boa noite";
  return "Boa madrugada";
}

function control() {
  const Hr = new Date();
  const dd = ("0" + Hr.getDate()).slice(-2);
  const mm = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yyyy = Hr.getFullYear().toString();
  const minute = Hr.getMinutes().toString();
  const second = Hr.getSeconds().toString();
  const millisecond = Hr.getMilliseconds().toString();
  return yyyy + mm + dd + minute + second + millisecond;
}

function dateStr() {
  const Hr = new Date();
  const dd = ("0" + Hr.getDate()).slice(-2);
  const mm = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yy = Hr.getFullYear().toString();
  return dd + "-" + mm + "-" + yy;
}

function hourStr() {
  const Hr = new Date();
  const hh = Hr.getHours();
  const min = ("0" + Hr.getMinutes()).slice(-2);
  const ss = ("0" + Hr.getSeconds()).slice(-2);
  return hh + ":" + min + ":" + ss;
}

function firstName(contact) {
  if (contact && contact.name) {
    return contact.name.split(" ")[0];
  }
  return "";
}

/**
 * Substitui variáveis {{chave}} alinhadas ao Mustache do backend (helpers/Mustache.ts).
 */
const formatQuickMessageTemplate = (body, { ticket, contact, user }) => {
  if (body == null || body === "") return "";
  const view = {
    firstName: firstName(contact),
    name: contact?.name || "",
    nome: contact?.name || "",
    ticket_id: ticket?.id != null ? String(ticket.id) : "",
    userName: user?.name || "",
    ms: msgsd(),
    hour: hourStr(),
    date: dateStr(),
    queue: ticket?.queue?.name || "",
    connection: ticket?.whatsapp?.name || "",
    data_hora: [dateStr(), hourStr()].join(" às "),
    protocol: [control(), ticket?.id != null ? String(ticket.id) : ""].join(""),
    name_company: ticket?.company?.name || "",
    empresa: ticket?.company?.name || "",
    telefone: contact?.number || "",
    email: contact?.email || ""
  };

  return String(body).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const v = view[key];
    return v != null && v !== undefined ? String(v) : "";
  });
};

export default formatQuickMessageTemplate;
