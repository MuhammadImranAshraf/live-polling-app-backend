import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config";
import { User, type UserDoc } from "../models/User";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "7d" });
}

// Verifies the Bearer token and reloads the user from MongoDB on every request,
// so the role always reflects the current database value.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(token, jwtSecret);
      if (typeof decoded === "string") throw new Error("bad payload");
      payload = decoded;
    } catch {
      res.status(401).json({ message: "Invalid or expired token" });
      return;
    }

    const user = payload.sub ? await User.findById(payload.sub) : null;
    if (!user) {
      res.status(401).json({ message: "User no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
