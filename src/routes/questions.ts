import { Router } from "express";
import mongoose from "mongoose";
import { Question, serializeQuestion, type QuestionLean } from "../models/Question";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const questionsRouter = Router();

questionsRouter.use(requireAuth);

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function toKey(label: string, index: number, taken: Set<string>): string {
  let base = label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = `option_${index + 1}`;
  let key = base;
  let n = 2;
  while (taken.has(key)) key = `${base}_${n++}`;
  taken.add(key);
  return key;
}

questionsRouter.get("/", async (_req, res, next) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 }).lean<QuestionLean[]>();
    res.json({ questions: questions.map(serializeQuestion) });
  } catch (error) {
    next(error);
  }
});

questionsRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const rawOptions: unknown = req.body?.options;

    if (!title) {
      res.status(400).json({ message: "title is required" });
      return;
    }
    if (!Array.isArray(rawOptions)) {
      res.status(400).json({ message: "options must be an array" });
      return;
    }

    const cleaned = rawOptions
      .map((o: { emoji?: unknown; label?: unknown }) => ({
        emoji: typeof o?.emoji === "string" ? o.emoji.trim() : "",
        label: typeof o?.label === "string" ? o.label.trim() : "",
      }))
      .filter((o) => o.emoji && o.label);

    if (cleaned.length < 2) {
      res.status(400).json({ message: "At least 2 options with an emoji and a label are required" });
      return;
    }

    const taken = new Set<string>();
    const options = cleaned.map((o, i) => ({ ...o, key: toKey(o.label, i, taken), count: 0 }));

    const question = await Question.create({ title, options });
    res.status(201).json({ question: serializeQuestion(question.toObject() as unknown as QuestionLean) });
  } catch (error) {
    next(error);
  }
});

questionsRouter.patch("/:id/vote", async (req, res, next) => {
  try {
    const { id } = req.params;
    const optionKey = typeof req.body?.optionKey === "string" ? req.body.optionKey : "";
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ message: "Question not found" });
      return;
    }

    const user = req.user!;
    const studentId = user.studentId;
    const voterMatch = { $regex: `^${escapeRegex(studentId)}$`, $options: "i" };

    // Retry a few times: the guarded atomic updates below can lose a race with the
    // same student voting twice at once, in which case we re-read and decide again.
    for (let attempt = 0; attempt < 5; attempt++) {
      const question = await Question.findById(id).lean<QuestionLean>();
      if (!question) {
        res.status(404).json({ message: "Question not found" });
        return;
      }
      if (!question.options.some((o) => o.key === optionKey)) {
        res.status(400).json({ message: "Invalid optionKey" });
        return;
      }
      if (!question.isActive) {
        res.status(409).json({ message: "This question is closed" });
        return;
      }

      const existing = question.voterRecords.find(
        (r) => r.studentId.toLowerCase() === studentId.toLowerCase(),
      );

      if (existing && existing.optionKey === optionKey) {
        res.json({ question: serializeQuestion(question) });
        return;
      }

      let matched: number;
      if (!existing) {
        const result = await Question.updateOne(
          { _id: id, voterRecords: { $not: { $elemMatch: { studentId: voterMatch } } } },
          {
            $inc: { "options.$[opt].count": 1 },
            $push: {
              voterRecords: { studentId, fullName: user.fullName, optionKey, votedAt: new Date() },
            },
          },
          { arrayFilters: [{ "opt.key": optionKey }] },
        );
        matched = result.matchedCount;
      } else {
        const previousKey = existing.optionKey;
        const result = await Question.updateOne(
          { _id: id, voterRecords: { $elemMatch: { studentId: voterMatch, optionKey: previousKey } } },
          {
            $inc: { "options.$[prev].count": -1, "options.$[next].count": 1 },
            $set: {
              "voterRecords.$[rec].optionKey": optionKey,
              "voterRecords.$[rec].fullName": user.fullName,
              "voterRecords.$[rec].votedAt": new Date(),
            },
          },
          {
            arrayFilters: [
              { "prev.key": previousKey },
              { "next.key": optionKey },
              { "rec.studentId": voterMatch, "rec.optionKey": previousKey },
            ],
          },
        );
        matched = result.matchedCount;
      }

      if (matched > 0) {
        const updated = await Question.findById(id).lean<QuestionLean>();
        res.json({ question: serializeQuestion(updated!) });
        return;
      }
    }

    res.status(409).json({ message: "Could not record vote, please try again" });
  } catch (error) {
    next(error);
  }
});

questionsRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404).json({ message: "Question not found" });
      return;
    }
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ message: "Question not found" });
      return;
    }
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
