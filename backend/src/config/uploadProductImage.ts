import path from "path";
import multer from "multer";
import fs from "fs";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination(req, _file, cb) {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return cb(new Error("companyId ausente."), "");
      }
      const folder = path.resolve(
        publicFolder,
        `company${companyId}`,
        "products"
      );
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
      return cb(null, folder);
    },
    filename(_req, file, cb) {
      const safe = file.originalname.replace(/[^\w.\-]/g, "_");
      cb(null, `${Date.now()}_${safe}`);
    }
  }),
  fileFilter(_req, file, cb) {
    if (!/^image\//.test(file.mimetype || "")) {
      return cb(new Error("Arquivo precisa ser uma imagem."));
    }
    return cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
};
