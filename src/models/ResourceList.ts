import mongoose, { Schema, Document, Types } from "mongoose";

export interface IResourceList extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  isPublic: boolean;
  resources: Types.ObjectId[];
}

const ResourceListSchema = new Schema<IResourceList>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 300 },
    isPublic: { type: Boolean, default: false, index: true },
    resources: [{ type: Schema.Types.ObjectId, ref: "Resource" }],
  },
  { timestamps: true },
);

ResourceListSchema.index({ ownerId: 1, updatedAt: -1 });

export const ResourceList = mongoose.model<IResourceList>(
  "ResourceList",
  ResourceListSchema,
);
