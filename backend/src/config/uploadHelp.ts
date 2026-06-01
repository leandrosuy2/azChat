import path from "path";
import multer from "multer";
import fs from "fs";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

// Tutoriais (Helps) são globais do sistema (não por empresa).
// Arquivos ficam em public/helps/{id}/. Vídeo é sempre embed URL,
// nunca upload — aqui só PDF.
const ALLOWED_MIMETYPES = [
  "application/pdf"
];

export const MAX_HELP_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

export default {
  directory: publicFolder,
  limits: {
    fileSize: MAX_HELP_ATTACHMENT_BYTES
  },
  fileFilter: (
    _req: any,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("ERR_HELP_INVALID_FILE_TYPE"));
    }
  },
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const { id } = req.params;
      const folder = path.resolve(publicFolder, "helps", String(id));
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, 0o777);
      }
      cb(null, folder);
    },
    filename(_req, file, cb) {
      const safeName = file.originalname
        .replace(/\//g, "-")
        .replace(/ /g, "_");
      cb(null, `${new Date().getTime()}_${safeName}`);
    }
  })
};
