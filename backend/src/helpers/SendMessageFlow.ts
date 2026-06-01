// src/helpers/SendMessageFlow.ts
import Whatsapp from "../models/Whatsapp";
import GetWhatsappWbot from "./GetWhatsappWbot";
import fs from "fs";
import { getMessageOptions } from "../services/WbotServices/SendWhatsAppMedia";

export type MessageData = {
  number: number | string;
  body: string;
  mediaPath?: string;
};

export const SendMessageFlow = async (
  whatsapp: Whatsapp,
  messageData: MessageData,
  isFlow: boolean = false,
  isRecord: boolean = false
): Promise<any> => {
  try {
    const wbot = await GetWhatsappWbot(whatsapp);
    const chatId = `${messageData.number}@s.whatsapp.net`;

    const body = `\u200e${messageData.body}`;

    // 🔹 Equivalente aos antigos "buttons": usamos List Message
    const sections = [
      {
        title: "Opções",
        rows: [
          { title: "Opção 1", rowId: "btn-1" },
          { title: "Opção 2", rowId: "btn-2" },
          { title: "Opção 3", rowId: "btn-3" }
        ]
      }
    ];

    // Se houver mídia, envia primeiro a mídia
    if (messageData.mediaPath && fs.existsSync(messageData.mediaPath)) {
      const mediaOptions = await getMessageOptions(messageData.mediaPath, body);
      await wbot.sendMessage(chatId, mediaOptions);
    }

    // Envia a lista (compatível com a tipagem nova)
    const message = await wbot.sendMessage(chatId, {
      text: body,
      footer: "Escolha uma opção",
      title: "Menu",
      buttonText: "Ver opções",
      sections
    } as any); // ⚠️ em algumas versões a tipagem exige 'as any' mesmo sendo válido em runtime

    return message;
  } catch (err: any) {
    throw new Error(err);
  }
};
