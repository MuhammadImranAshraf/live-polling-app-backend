import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import mongoose from "mongoose";
import { createApp } from "./app";
import { port } from "./config";
import { connectDb } from "./db";
import { User } from "./models/User";

// LOCAL entry point only. On Vercel the entry point is api/index.ts.
async function startInMemoryFallback() {
  if (process.env.VERCEL) {
    throw new Error("In-memory fallback must never run on Vercel");
  }
  // Dynamic import so mongodb-memory-server is only needed locally.
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const memory = await MongoMemoryServer.create();
  await mongoose.connect(memory.getUri("polling_db"));

  const password = crypto.randomBytes(9).toString("base64url");
  await User.create({
    fullName: "Admin",
    email: "admin@example.com",
    studentId: "ADMIN-001",
    passwordHash: await bcrypt.hash(password, 10),
    role: "admin",
  });
  console.log("\n  Throwaway admin account for this in-memory database:");
  console.log("    email:    admin@example.com");
  console.log(`    password: ${password}\n`);
}

async function main() {
  try {
    await connectDb({ timeoutMs: 2500 });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.warn(
      `MongoDB unreachable (${(error as Error).message}). Falling back to an in-memory database.`,
    );
    await startInMemoryFallback();
  }

  createApp().listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
