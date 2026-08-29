import mongoose, { Schema, Document, ObjectId } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export enum UserRole {
  STUDENT = "student",
  SENIOR = "senior",
  ADMIN = "admin",
}
// export interface IUser extends Document {
//   name: string;
//   email: string;
//   password: string;
//   matricNumber?: string;
//   role: UserRole;
//   trustScore: number; // Used to auto-promote students to seniors
//   matchPassword(enteredPassword: string): Promise<boolean>;
//   id: any; // Ensure the 'id' property is included
// }

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  googleId?: string;
  matricNumber?: string;
  role: UserRole;
  trustScore: number;
  matchPassword(enteredPassword: string): Promise<boolean>;
  id: any;
  isEmailVerified: boolean;
  verificationToken?: string;
  verificationTokenExpire?: Date;
  getVerificationToken(): string;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  getResetPasswordToken: () => string;
  _id: mongoose.Types.ObjectId; // Ensure the '_id' property is included
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
    password: { type: String, minlength: 6 }, // Optional for Google Auth users
    googleId: { type: String, sparse: true, unique: true },
    matricNumber: { type: String, trim: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.STUDENT,
    },
    trustScore: { type: Number, default: 0 },
    isEmailVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true },
);

UserSchema.methods.getVerificationToken = function () {
  // Generate random token
  const verificationToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to verificationToken field
  this.verificationToken = crypto
    .createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  // Set expire (e.g., 24 hours)
  this.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

// Generate and hash password token
UserSchema.methods.getResetPasswordToken = function (): string {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire time (10 minutes)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};
// Encrypt password before saving (only if modified/present)
UserSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
