import { Schema, model, type InferSchemaType, type HydratedDocument } from "mongoose";

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    studentId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },
  },
  { timestamps: true },
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDoc = HydratedDocument<UserAttrs>;

export const User = model("User", userSchema);

export function toPublicUser(user: UserDoc) {
  return {
    id: user._id.toString(),
    fullName: user.fullName,
    email: user.email,
    studentId: user.studentId,
    role: user.role,
  };
}
