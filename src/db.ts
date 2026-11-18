import mongoose from "mongoose";
import { mongoUri } from "./config";

// Cached on globalThis so warm serverless invocations reuse one connection.
const globalCache = globalThis as unknown as {
  __mongoosePromise?: Promise<typeof mongoose>;
};

export function connectDb({ timeoutMs }: { timeoutMs?: number } = {}): Promise<typeof mongoose> {
  if (!globalCache.__mongoosePromise) {
    globalCache.__mongoosePromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: timeoutMs ?? 2500,
        maxPoolSize: 5,
      })
      .catch((error) => {
        // Clear the cache so the next request retries.
        globalCache.__mongoosePromise = undefined;
        throw error;
      });
  }
  return globalCache.__mongoosePromise;
}
