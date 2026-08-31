import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

export const Department = mongoose.model<IDepartment>("Department", DepartmentSchema);
