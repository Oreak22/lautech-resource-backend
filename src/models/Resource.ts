import mongoose, { Schema, Document, Types } from "mongoose";

export enum ResourceCategory {
  PAST_QUESTION = "Past Question",
  TEXTBOOK = "Textbook",
  HANDOUT = "Handout",
  PROJECT = "Project Report",
}

export enum ResourceStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export interface IResource extends Document {
  title: string;
  category: ResourceCategory;
  fileUrl: string;
  fileFormat: string;
  fileSize: number;
  cloudinaryPublicId: string;
  uploaderId: Types.ObjectId;
  courseId: Types.ObjectId;
  lecturerId: Types.ObjectId;
  status: ResourceStatus;
  moderatedBy?: Types.ObjectId;

  // New AI Fields
  keywords: string[];
  aiSummary: string;
  aiConfidenceScore: number;
  rejectReason: String;
}

const ResourceSchema = new Schema<IResource>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(ResourceCategory),
      required: true,
    },
    fileUrl: { type: String, required: true },
    fileFormat: { type: String, required: true },
    fileSize: { type: Number, required: true },
    cloudinaryPublicId: { type: String, required: true },
    uploaderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lecturerId: {
      type: Schema.Types.ObjectId,
      ref: "Lecturer",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ResourceStatus),
      default: ResourceStatus.PENDING,
    },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // New AI Fields mapping
    keywords: [{ type: String, trim: true }],
    aiSummary: { type: String },
    aiConfidenceScore: { type: Number },
    rejectReason: { type: String },
  },
  { timestamps: true },
);

// Text index for blazing fast autocomplete search
ResourceSchema.index({ keywords: "text", title: "text" });
ResourceSchema.index({ courseId: 1, category: 1, status: 1 });

export const Resource = mongoose.model<IResource>("Resource", ResourceSchema);
