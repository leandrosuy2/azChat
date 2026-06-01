import path from "path";
import multer from "multer";
import fs from "fs";
import { resolveQuadroContext } from "../helpers/ResolveQuadroFromPublicParam";
import { quadroAttachmentDiskDir } from "../helpers/QuadroAttachmentPaths";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const ticketUuid = req.params.ticketUuid;
    const companyId = req.user?.companyId;
    if (!companyId || !ticketUuid) {
      return cb(new Error("ERR_NO_TICKET_OR_COMPANY"), "");
    }
    try {
      const ctx = await resolveQuadroContext(String(ticketUuid).trim(), companyId);
      let folder: string;
      if (ctx.mode === "ticket") {
        folder = quadroAttachmentDiskDir(companyId, { ticketId: ctx.ticket.id, ticketQuadroId: null });
        (req as any).ticketIdQuadro = ctx.ticket.id;
        (req as any).ticketQuadroIdQuadro = null;
      } else {
        folder = quadroAttachmentDiskDir(companyId, {
          ticketId: null,
          ticketQuadroId: ctx.quadro.id
        });
        (req as any).ticketIdQuadro = null;
        (req as any).ticketQuadroIdQuadro = ctx.quadro.id;
      }
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }
      return cb(null, folder);
    } catch (e) {
      return cb(e as Error, "");
    }
  },
  filename(req, file, cb) {
    const name = file.originalname.replace(/\//g, "-").replace(/ /g, "_");
    return cb(null, name);
  }
});

export default {
  directory: publicFolder,
  storage
};
