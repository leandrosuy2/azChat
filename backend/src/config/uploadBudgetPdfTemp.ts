import multer from "multer";
import os from "os";
import path from "path";

/** Upload temporário só para envio de PDF de orçamento via WhatsApp (apagado após o envio). */
const uploadBudgetPdfTemp = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, os.tmpdir());
    },
    filename: (_req, file, cb) => {
      const base = path.basename(file.originalname || "orcamento.pdf").replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `budget-${Date.now()}-${base}`);
    }
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => {
    cb(null, true);
  }
});

export default uploadBudgetPdfTemp;
