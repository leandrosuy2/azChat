/**
 * Build WHERE clause for Ticket by UUID or numeric ID.
 * When the route param is "8" (ticket id), PostgreSQL fails on uuid = '8'.
 * Use id when the param looks like a number, otherwise uuid.
 */
export function buildTicketWhereUuidOrId(
  uuidOrId: string,
  companyId: number
): { id: number; companyId: number } | { uuid: string; companyId: number } {
  const param = String(uuidOrId).trim();
  if (/^\d+$/.test(param)) {
    return { id: parseInt(param, 10), companyId };
  }
  return { uuid: param, companyId };
}
