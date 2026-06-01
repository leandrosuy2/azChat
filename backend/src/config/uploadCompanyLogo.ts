import path from "path";
import multer from "multer";
import fs from "fs";

const publicFolder = path.resolve(__dirname, "..", "..", "public");

export default {
  directory: publicFolder,
  storage: multer.diskStorage({
    destination: function (req, _file, cb) {
      const companyId = req.params?.id;
      if (!companyId) {
        return cb(new Error("companyId ausente."), "");
      }
      const folder = path.resolve(
        publicFolder,
        `company${companyId}`,
        "companyLogo"
      );
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        try {
          fs.chmodSync(folder, 0o777);
        } catch (_e) {
          /* noop */
        }
      }
      return cb(null, folder);
    },
    filename(_req, file, cb) {
      const safe = file.originalname.replace(/[^\w.\-]/g, "_");
      const fileName = `${Date.now()}_${safe}`;
      return cb(null, fileName);
    }
  }),
  fileFilter: (_req, file, cb) => {
    if (!/^image\//.test(file.mimetype || "")) {
      return cb(new Error("Arquivo precisa ser uma imagem."));
    }
    return cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024
  }
};
