export interface KanbanLembreteTemplateVars {
  nomeCard: string;
  coluna?: string;
  status?: string;
  data?: string;
  contato?: string;
  responsavel?: string;
  arquivo?: string;
  areaTrabalho?: string;
  nomeKanban?: string;
  etapa?: string;
  areaOrigem?: string;
  areaDestino?: string;
  dataMovimentacao?: string;
}

const DEFAULTS: Record<string, string> = {
  movimentacao:
    "O card {{nome_card}} foi movido para a etapa {{nome_coluna}}. Clique para ver mais detalhes.",
  mudanca_status: "O status do card {{nome_card}} foi alterado para {{status}}.",
  prazo_proximo:
    "O prazo do card {{nome_card}} está se esgotando (data: {{data}}).",
  prazo_vencido: "O prazo do card {{nome_card}} venceu ou está atrasado (data: {{data}}).",
  anexo_adicionado: "Novo anexo no card {{nome_card}}: {{arquivo}}.",
  agendado:
    "Lembrete agendado: o card {{nome_card}} — horário: {{data}}. Clique para ver mais detalhes.",
  compartilhamento:
    "O card {{nome_card}} foi compartilhado de {{area_origem}} para {{area_destino}}.",
  alteracao_responsavel:
    "O responsável do card {{nome_card}} foi alterado para {{responsavel}}."
};

export function getDefaultKanbanTemplate(tipoGatilho: string): string {
  return DEFAULTS[tipoGatilho] || DEFAULTS.movimentacao;
}

/** Substitui {{chave}} e {chave} com aliases (nome_card / nomeCard, etc.). */
function applyVar(
  tpl: string,
  aliases: string[],
  value: string
): string {
  let out = tpl;
  for (const key of aliases) {
    const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\{\\{${esc}\\}\\}`, "gi"), value);
    out = out.replace(new RegExp(`\\{${esc}\\}`, "gi"), value);
  }
  return out;
}

export function formatKanbanLembreteTemplate(
  template: string | null | undefined,
  tipoGatilho: string,
  vars: KanbanLembreteTemplateVars
): string {
  const base =
    (template && String(template).trim()) ||
    getDefaultKanbanTemplate(tipoGatilho);
  let out = base;

  const nomeCard = vars.nomeCard || "—";
  out = applyVar(out, ["nomeCard", "nome_card", "NOMECARD"], nomeCard);

  const coluna = vars.coluna || "—";
  out = applyVar(out, ["coluna", "nome_coluna", "NOMECOLUNA"], coluna);

  const status = vars.status || "—";
  out = applyVar(out, ["status", "STATUS"], status);

  const data = vars.data || "—";
  out = applyVar(out, ["data", "DATA"], data);

  const contato = vars.contato || "—";
  out = applyVar(out, ["contato", "nome_contato", "NOMECONTATO"], contato);

  const responsavel = vars.responsavel || "—";
  out = applyVar(out, ["responsavel", "responsável", "RESPONSAVEL"], responsavel);

  const arquivo = vars.arquivo || "—";
  out = applyVar(out, ["arquivo", "ARQUIVO", "anexo"], arquivo);

  const areaTrabalho = vars.areaTrabalho || vars.nomeKanban || "—";
  out = applyVar(
    out,
    ["area_trabalho", "areaTrabalho", "nome_kanban", "nomeKanban", "AREA_TRABALHO"],
    areaTrabalho
  );

  const etapa = vars.etapa || vars.coluna || "—";
  out = applyVar(out, ["etapa", "ETAPA", "nome_etapa", "nomeEtapa"], etapa);

  const areaOrigem = vars.areaOrigem || "—";
  out = applyVar(out, ["area_origem", "areaOrigem", "AREA_ORIGEM"], areaOrigem);

  const areaDestino = vars.areaDestino || "—";
  out = applyVar(out, ["area_destino", "areaDestino", "AREA_DESTINO"], areaDestino);

  const dataMov = vars.dataMovimentacao || vars.data || "—";
  out = applyVar(
    out,
    ["data_movimentacao", "dataMovimentacao", "DATA_MOVIMENTACAO"],
    dataMov
  );

  return out;
}
