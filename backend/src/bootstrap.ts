import dotenv from "dotenv";

const envPath =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.DOTENV_PATH || ".env";

dotenv.config({ path: envPath });
