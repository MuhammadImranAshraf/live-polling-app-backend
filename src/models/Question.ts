import { Schema, model } from "mongoose";

const optionSchema = new Schema(
  {
    key: { type: String, required: true },
    emoji: { type: String, required: true },
    label: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { _id: false },
);

const voterRecordSchema = new Schema(
  {
    studentId: { type: String, required: true },
    fullName: { type: String, required: true },
    optionKey: { type: String, required: true },
    votedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const questionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    options: {
      type: [optionSchema],
      validate: {
        validator: (value: unknown[]) => Array.isArray(value) && value.length >= 2,
        message: "A question needs at least 2 options",
      },
    },
    voterRecords: { type: [voterRecordSchema], default: [] },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true },
);

export const Question = model("Question", questionSchema);

export interface QuestionLean {
  _id: { toString(): string };
  title: string;
  options: { key: string; emoji: string; label: string; count: number }[];
  voterRecords: { studentId: string; fullName: string; optionKey: string; votedAt: Date }[];
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeQuestion(q: QuestionLean) {
  return {
    id: q._id.toString(),
    title: q.title,
    options: q.options.map(({ key, emoji, label, count }) => ({ key, emoji, label, count })),
    voterRecords: q.voterRecords.map(({ studentId, fullName, optionKey, votedAt }) => ({
      studentId,
      fullName,
      optionKey,
      votedAt,
    })),
    isActive: q.isActive,
    createdBy: q.createdBy,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}
