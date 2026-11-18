import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/app";
import { connectDb } from "../src/db";

// VERCEL entry point: no listen() and no in-memory fallback.
const app = createApp() as unknown as (req: IncomingMessage, res: ServerResponse) => void;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await connectDb({ timeoutMs: 5000 });
  } catch (error) {
    console.error("Database connection failed:", (error as Error).message);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Database unavailable" }));
    return;
  }
  return app(req, res);
}
