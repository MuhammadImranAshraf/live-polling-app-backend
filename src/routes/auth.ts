import { Router } from "express";
import bcrypt from "bcryptjs";
import { User, toPublicUser } from "../models/User";
import { requireAuth, signToken } from "../middleware/auth";

export const authRouter = Router();

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");

authRouter.post("/signup", async (req, res, next) => {
  try {
    const fullName = str(req.body?.fullName);
    const email = str(req.body?.email).toLowerCase();
    const studentId = str(req.body?.studentId).toUpperCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!fullName || !email || !studentId || !password) {
      res.status(400).json({ message: "fullName, email, studentId and password are required" });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      res.status(400).json({ message: "Please enter a valid email address" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: "Password must be at least 6 characters" });
      return;
    }

    const existing = await User.findOne({ $or: [{ email }, { studentId }] });
    if (existing) {
      res.status(409).json({
        message:
          existing.email === email
            ? "An account with this email already exists"
            : "An account with this Student ID already exists",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Role is always "student": it is never read from the request body.
    const user = await User.create({ fullName, email, studentId, passwordHash, role: "student" });

    res.status(201).json({ token: signToken(user._id.toString()), user: toPublicUser(user) });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({ message: "Email or Student ID already exists" });
      return;
    }
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = str(req.body?.email).toLowerCase();
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      res.status(400).json({ message: "email and password are required" });
      return;
    }

    const user = await User.findOne({ email });
    const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!user || !valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    res.json({ token: signToken(user._id.toString()), user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(401).json({ message: "User no longer exists" });
      return;
    }
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
});
