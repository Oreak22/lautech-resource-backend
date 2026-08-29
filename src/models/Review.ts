import mongoose, { Schema, Document } from "mongoose";

export interface IReview extends Document {
  lecturer: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  authorAlias: string;
  courseCode: string;
  content: string;
  upvotes: number;
  downvotes: number;
  upvotedBy: mongoose.Types.ObjectId[];
  downvotedBy: mongoose.Types.ObjectId[];
}

const reviewSchema: Schema = new Schema(
  {
    lecturer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecturer",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    authorAlias: {
      type: String,
      required: true,
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

export default mongoose.model<IReview>("Review", reviewSchema);
