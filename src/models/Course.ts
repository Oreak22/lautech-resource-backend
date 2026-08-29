import mongoose, { Schema, Document } from "mongoose";

export interface ICourse extends Document {
  courseCode: string;
  title: string;
  department: string;
}

const courseSchema: Schema = new Schema(
  {
    courseCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // e.g., "CSE 301"
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

// const Course = mongoose.model<ICourse>("Course", courseSchema);

const Course = mongoose.model<ICourse>("Course", courseSchema);
export default Course;
