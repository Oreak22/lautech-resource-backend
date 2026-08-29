import mongoose, { Schema, Document, Types } from "mongoose";

export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  MERGED = "merged",
}

export interface ILecturer extends Document {
  name: string;
  departmentId: Types.ObjectId;
  status: ApprovalStatus;
  submittedBy: Types.ObjectId;
  moderatedBy?: Types.ObjectId;
  mergeTarget?: Types.ObjectId;
}

const LecturerSchema = new Schema<ILecturer>(
  {
    name: { type: String, required: true, trim: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ApprovalStatus),
      default: ApprovalStatus.PENDING,
    },
    submittedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    mergeTarget: { type: Schema.Types.ObjectId, ref: "Lecturer" },
  },
  { timestamps: true },
);

// Text index to power the "Search-First" UI autocomplete
LecturerSchema.index({ name: "text" });

export const Lecturer = mongoose.model<ILecturer>("Lecturer", LecturerSchema);
