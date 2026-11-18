import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import { corsOrigins } from "./config";
import { authRouter } from "./routes/auth";
import { questionsRouter } from "./routes/questions";

export function createApp() {
  const app = express();

  app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/questions", questionsRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const status =
      typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ message: status === 500 ? "Internal server error" : err.message });
  };
  app.use(errorHandler);

  return app;
}
