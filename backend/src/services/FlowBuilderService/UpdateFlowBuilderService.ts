import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";
import { Op } from "sequelize";

interface Request {
  companyId: number;
  name: string;
  flowId: number;
  channels?: string[];
  active?: boolean;
}

const UpdateFlowBuilderService = async ({
  companyId,
  name,
  flowId,
  channels,
  active
}: Request): Promise<String> => {
  try {

    const nameExist = await FlowBuilderModel.findOne({
      where: {
        name,
        company_id: companyId,
        id: { [Op.ne]: flowId }
      }
    })

    console.log({ nameExist })
    
    if(nameExist){
      return 'exist'
    }

    const updateData: any = { name };
    if (channels !== undefined) updateData.channels = channels;
    if (active !== undefined) updateData.active = active;

    const flow = await FlowBuilderModel.update(updateData, {
      where: {id: flowId, company_id: companyId}
    });

    return 'ok';
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default UpdateFlowBuilderService;
