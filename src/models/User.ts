import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export enum UserRole {
  STUDENT = "student",
  SENIOR = "senior", // Trusted users who bypass moderation
  ADMIN = "admin",
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  matricNumber?: string;
  role: UserRole;
  trustScore: number; // Used to auto-promote students to seniors
  matchPassword(enteredPassword: string): Promise<boolean>;
  id: any; // Ensure the 'id' property is included
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    matricNumber: { type: String, trim: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    trustScore: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Encrypt password before saving
UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
