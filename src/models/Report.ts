import mongoose, { Document, Schema, Types } from "mongoose";

export enum ReportTargetType {
  RESOURCE = "resource",
  REVIEW = "review",
}

export enum ReportStatus {
  PENDING = "pending",
  RESOLVED = "resolved",
  DISMISSED = "dismissed",
}

export interface IReport extends Document {
  targetType: ReportTargetType;
  targetId: Types.ObjectId;
  targetLabel: string;
  targetContext: string;
  reporterId: Types.ObjectId;
  reason: string;
  details?: string;
  status: ReportStatus;
  resolutionNote?: string;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
}

const reportSchema = new Schema<IReport>(
  {
    targetType: {
      type: String,
      enum: Object.values(ReportTargetType),
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    targetLabel: { type: String, required: true, trim: true },
    targetContext: { type: String, trim: true, default: "" },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 80 },
    details: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PENDING,
      index: true,
    },
    resolutionNote: { type: String, trim: true, maxlength: 500 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: Date,
  },
  { timestamps: true },
);

reportSchema.index({ targetType: 1, targetId: 1, reporterId: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>("Report", reportSchema);
