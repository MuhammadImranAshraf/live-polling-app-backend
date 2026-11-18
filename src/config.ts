import dotenv from "dotenv";

dotenv.config();

export const port = Number(process.env.PORT) || 5001;

export const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://polling_db_user:polling_db_password@polling.omanrjh.mongodb.net/polling_db";

export const jwtSecret = process.env.JWT_SECRET || "dev-only-insecure-secret";

export const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
