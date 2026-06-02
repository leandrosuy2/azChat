import ScheduledMessages from "../../models/ScheduledMessages";
import ShowService from "./ShowService";

interface ScheduleData {
  data_mensagem_programada?: Date | string;
  id_conexao?: string;
  intervalo?: string;
  valor_intervalo?: string;
  mensagem?: string;
  tipo_dias_envio?: string;
  mostrar_usuario_mensagem?: string | boolean;
  criar_ticket?: boolean;
  contatos?: unknown[] | string;
  tags?: unknown[] | string;
  companyId?: number;
  nome?: string;
  tipo_arquivo?: string;
  usuario_envio?: string;
  enviar_quantas_vezes?: string;
  mediaName?: string;
  mediaPath?: string;
}

interface Request {
  scheduleData: ScheduleData;
  id: string | number;
  companyId: number;
  mediaPath: string | null,
  mediaName: string | null,
}

const UpdateUserService = async ({
  scheduleData,
  id,
  companyId,
  mediaPath,
  mediaName,
}: Request): Promise<ScheduledMessages | undefined> => {
  const schedule = await ShowService(id, companyId);

  const {
    data_mensagem_programada,
    id_conexao,
    intervalo,
    valor_intervalo,
    mensagem,
    tipo_dias_envio,
    mostrar_usuario_mensagem,
    criar_ticket,
    contatos,
    tags,
    nome,
    tipo_arquivo,
    usuario_envio,
    enviar_quantas_vezes,
  } = scheduleData;

  const normalizeList = (value: unknown): unknown[] => {
    if (Array.isArray(value)) return value;
    if (value == null || value === "") return [];
    return String(value).split(",").filter((item) => item !== "");
  };

  let data = {
    data_mensagem_programada:
      data_mensagem_programada || schedule.data_mensagem_programada,
    id_conexao: id_conexao ?? schedule.id_conexao,
    intervalo: intervalo ?? schedule.intervalo,
    valor_intervalo: valor_intervalo ?? schedule.valor_intervalo,
    mensagem: mensagem ?? schedule.mensagem,
    tipo_dias_envio: tipo_dias_envio ?? schedule.tipo_dias_envio,
    mostrar_usuario_mensagem:
      mostrar_usuario_mensagem ?? schedule.mostrar_usuario_mensagem,
    criar_ticket: criar_ticket ?? schedule.criar_ticket,
    contatos: contatos !== undefined ? normalizeList(contatos) : schedule.contatos,
    tags: tags !== undefined ? normalizeList(tags) : schedule.tags,
    nome: nome ?? schedule.nome,
    tipo_arquivo: tipo_arquivo ?? schedule.tipo_arquivo,
    usuario_envio:
      mostrar_usuario_mensagem == 'true' || mostrar_usuario_mensagem === true
        ? usuario_envio ?? schedule.usuario_envio
        : null,
    enviar_quantas_vezes:
      enviar_quantas_vezes ?? schedule.enviar_quantas_vezes
  };


  if (!!mediaName && !!mediaPath) {
    data.mediaName = mediaName;
    data.mediaPath = mediaPath;
  }

  await schedule.update(data);

  await schedule.reload();
  return schedule;
};

export default UpdateUserService;
