import path from "path";
import multer from "multer";
import fs from "fs";
import Ticket from "../models/Ticket";
import { buildTicketWhereUuidOrId } from "../helpers/FindTicketByUuidOrId";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const ticketId = req.params.ticketId;
    const companyId = req.user?.companyId;
    if (!companyId || !ticketId) {
      return cb(new Error("ERR_NO_TICKET_OR_COMPANY"), "");
    }
    const ticket = await Ticket.findOne({
      where: buildTicketWhereUuidOrId(String(ticketId), companyId),
      attributes: ["id"]
    });
    if (!ticket) {
      return cb(new Error("ERR_NO_TICKET_FOUND"), "");
    }
    const folder = path.resolve(
      publicFolder,
      `company${companyId}`,
      "anotacoes",
      String(ticket.id)
    );
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      fs.chmodSync(folder, 0o777);
    }
    return cb(null, folder);
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
