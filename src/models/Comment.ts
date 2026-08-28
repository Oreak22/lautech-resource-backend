import mongoose, { Schema, Document, Types } from "mongoose";

export interface IComment extends Document {
  text: string;
  studentId: Types.ObjectId;
  lecturerId: Types.ObjectId;
  likedBy: Types.Array<Types.ObjectId>;
  dislikedBy: Types.Array<Types.ObjectId>;
}

const CommentSchema = new Schema<IComment>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lecturerId: {
      type: Schema.Types.ObjectId,
      ref: "Lecturer",
      required: true,
    },

    // Using arrays of ObjectIds ensures a user can only vote once.
    // We will handle the array manipulation (push/pull) in the controller.
    likedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    dislikedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

// Index to quickly fetch a lecturer's comments sorted by date
CommentSchema.index({ lecturerId: 1, createdAt: -1 });

export const Comment = mongoose.model<IComment>("Comment", CommentSchema);
