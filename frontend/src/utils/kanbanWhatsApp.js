/**
 * Abre web.whatsapp.com / wa.me com o número do contato (DDI 55 se faltar).
 * @returns {boolean} true se abriu
 */
export function openWhatsAppWebFromContact(contact, onMissing) {
  const raw = contact?.number || "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) {
    if (typeof onMissing === "function") onMissing();
    return false;
  }
  let intl = digits;
  if (!intl.startsWith("55") || intl.length < 12) {
    intl = intl.startsWith("55") ? intl : `55${intl}`;
  }
  window.open(`https://wa.me/${intl}`, "_blank", "noopener,noreferrer");
  return true;
}
