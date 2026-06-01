import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import { BufferJSON, initAuthCreds, proto } from "@whiskeysockets/baileys";
import Whatsapp from "../models/Whatsapp";

const KEY_MAP: { [T in keyof SignalDataTypeMap]: string } = {
  "pre-key": "pre-key",
  session: "session",
  "sender-key": "sender-key",
  "sender-key-memory": "sender-key-memory",
  "app-state-sync-key": "app-state-sync-key",
  "app-state-sync-version": "app-state-sync-version",
  // 🔥 Novos tipos adicionados na v7 — mapeia pra arquivos próprios
  "lid-mapping": "lid-mapping",
  "device-list": "device-list",
  tctoken: "tctoken",
};

const authState = async (
  whatsapp: Whatsapp
): Promise<{ state: AuthenticationState; saveState: () => void }> => {
  let creds: AuthenticationCreds;
  let keys: any = {};

  const saveState = async () => {
    try {
      await whatsapp.update({
        session: JSON.stringify({ creds, keys }, BufferJSON.replacer, 0),
      });
    } catch (error) {
      console.log(error);
    }
  };

  // const getSessionDatabase = await whatsappById(whatsapp.id);

  if (whatsapp.session && whatsapp.session !== null) {
    const result = JSON.parse(whatsapp.session, BufferJSON.reviver);
    creds = result.creds;
    keys = result.keys;
  } else {
    creds = initAuthCreds();
    keys = {};
  }

  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const key = KEY_MAP[type];
          return ids.reduce((dict: any, id) => {
            let value = keys[key]?.[id];
            if (value) {
              if (type === "app-state-sync-key") {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              dict[id] = value;
            }
            return dict;
          }, {});
        },
        set: (data: any) => {
          // eslint-disable-next-line no-restricted-syntax, guard-for-in
          for (const i in data) {
            const key = KEY_MAP[i as keyof SignalDataTypeMap];
            keys[key] = keys[key] || {};
            Object.assign(keys[key], data[i]);
          }
          saveState();
        },
      },
    },
    saveState,
  };
};

export default authState;
