import { WebhookModel } from "../../models/Webhook";
import User from "../../models/User";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import { Op } from "sequelize";

interface Request {
  companyId: number;
  channel?: string;
}

interface Response {
  flows: FlowBuilderModel[];
}

const ListFlowBuilderService = async ({
  companyId,
  channel,
}: Request): Promise<Response> => {
  
    try {
    
        // Realiza a consulta com paginação usando findAndCountAll
        const whereCondition: any = { company_id: companyId };
        if (channel) {
          whereCondition.channels = { [Op.contains]: [channel] };
        }

        const { count, rows } = await FlowBuilderModel.findAndCountAll({
          where: whereCondition
        });
    
        const flowResult = []
        rows.forEach((flow) => {
          flowResult.push(flow.toJSON());
        });

        return {
            flows: flowResult,
        }
      } catch (error) {
        console.error('Erro ao consultar usuários:', error);
      }
};

export default ListFlowBuilderService;
