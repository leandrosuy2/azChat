import QuadroStatus from "../../models/QuadroStatus";

interface StatusResponse {
  label: string;
  value: string;
  color: string;
}

/** Status internos do quadro por área de trabalho (`quadroGroupId`). */
const ListQuadroStatusesService = async (
  companyId: number,
  quadroGroupId: number
): Promise<StatusResponse[]> => {
  const statuses = await QuadroStatus.findAll({
    where: { companyId, quadroGroupId },
    order: [["sortOrder", "ASC"]]
  });

  /** Não semeia o banco: área nova fica sem status até o usuário salvar em "Gerenciar Status". */

  return statuses.map((s) => ({
    label: s.label,
    value: s.value,
    color: s.color
  }));
};

export default ListQuadroStatusesService;
