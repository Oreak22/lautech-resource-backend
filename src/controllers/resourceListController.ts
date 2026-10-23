import { Request, Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Resource, ResourceStatus } from "../models/Resource";
import { ResourceList } from "../models/ResourceList";

const resourcePopulation = {
  path: "resources",
  match: { status: ResourceStatus.APPROVED },
  populate: [
    { path: "courseId", select: "courseCode title" },
    { path: "lecturerId", select: "name" },
    { path: "uploaderId", select: "name" },
  ],
};

const sendList = (res: Response, list: any, status = 200) => {
  const data = typeof list?.toObject === "function" ? list.toObject() : list;
  data.resources = (data.resources || []).filter(Boolean);
  return res.status(status).json({ success: true, data });
};

const validId = (value: unknown): value is string =>
  typeof value === "string" && Types.ObjectId.isValid(value);

export const getMyResourceLists = async (req: AuthRequest, res: Response) => {
  try {
    const lists = await ResourceList.find({ ownerId: req.user!._id })
      .populate(resourcePopulation)
      .sort({ updatedAt: -1 })
      .lean();
    const data = lists.map((list: any) => ({
      ...list,
      resources: (list.resources || []).filter(Boolean),
    }));
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Could not load resource lists:", error);
    return res.status(500).json({ success: false, error: "Could not load your lists" });
  }
};

export const getMyResourceList = async (req: AuthRequest, res: Response) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ success: false, error: "List not found" });
    }
    const list = await ResourceList.findOne({
      _id: req.params.id,
      ownerId: req.user!._id,
    }).populate(resourcePopulation);
    if (!list) return res.status(404).json({ success: false, error: "List not found" });
    return sendList(res, list);
  } catch (error) {
    console.error("Could not load resource list:", error);
    return res.status(500).json({ success: false, error: "Could not load this list" });
  }
};

export const getPublicResourceList = async (req: Request, res: Response) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ success: false, error: "List not found" });
    }
    const list = await ResourceList.findOne({
      _id: req.params.id,
      isPublic: true,
    })
      .populate("ownerId", "name")
      .populate(resourcePopulation);
    if (!list) return res.status(404).json({ success: false, error: "List not found" });
    return sendList(res, list);
  } catch (error) {
    console.error("Could not load public resource list:", error);
    return res.status(500).json({ success: false, error: "Could not load this list" });
  }
};

export const createResourceList = async (req: AuthRequest, res: Response) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const description = typeof req.body?.description === "string" ? req.body.description.trim() : "";
    if (req.body?.isPublic !== undefined && typeof req.body.isPublic !== "boolean") {
      return res.status(400).json({ success: false, error: "List visibility must be public or private" });
    }
    if (req.body?.description !== undefined && typeof req.body.description !== "string") {
      return res.status(400).json({ success: false, error: "Description must be text" });
    }
    const isPublic = req.body?.isPublic ?? false;
    const resourceIds = req.body?.resourceIds;

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ success: false, error: "List name must be between 2 and 80 characters" });
    }
    if (description.length > 300) {
      return res.status(400).json({ success: false, error: "Description must be 300 characters or fewer" });
    }

    if (!Array.isArray(resourceIds) || resourceIds.some((id) => typeof id !== "string" || !validId(id))) {
      return res.status(400).json({ success: false, error: "Select at least 2 valid resources" });
    }
    const distinctResourceIds = [...new Set<string>(resourceIds.map((id: string) => id.toLowerCase()))];
    if (distinctResourceIds.length < 2) {
      return res.status(400).json({ success: false, error: "Select at least 2 different resources" });
    }
    const resources = await Resource.find({
      _id: { $in: distinctResourceIds },
      status: ResourceStatus.APPROVED,
    }).select("_id");
    if (resources.length !== distinctResourceIds.length) {
      return res.status(404).json({ success: false, error: "One or more approved resources could not be found" });
    }

    const created = await ResourceList.create({
      ownerId: req.user!._id,
      name,
      description,
      isPublic,
      resources: resources.map((resource) => resource._id),
    });
    const list = await ResourceList.findById(created._id).populate(resourcePopulation);
    return sendList(res, list, 201);
  } catch (error) {
    console.error("Could not create resource list:", error);
    return res.status(500).json({ success: false, error: "Could not create your list" });
  }
};

export const updateResourceList = async (req: AuthRequest, res: Response) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ success: false, error: "List not found" });
    }
    const updates: Record<string, unknown> = {};
    if (req.body?.name !== undefined) {
      if (typeof req.body.name !== "string" || req.body.name.trim().length < 2 || req.body.name.trim().length > 80) {
        return res.status(400).json({ success: false, error: "List name must be between 2 and 80 characters" });
      }
      updates.name = req.body.name.trim();
    }
    if (req.body?.description !== undefined) {
      if (typeof req.body.description !== "string" || req.body.description.trim().length > 300) {
        return res.status(400).json({ success: false, error: "Description must be 300 characters or fewer" });
      }
      updates.description = req.body.description.trim();
    }
    if (req.body?.isPublic !== undefined) {
      if (typeof req.body.isPublic !== "boolean") {
        return res.status(400).json({ success: false, error: "List visibility must be public or private" });
      }
      updates.isPublic = req.body.isPublic;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: "Provide a name, description, or visibility to update" });
    }

    const list = await ResourceList.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user!._id },
      { $set: updates },
      { new: true, runValidators: true },
    ).populate(resourcePopulation);
    if (!list) return res.status(404).json({ success: false, error: "List not found" });
    return sendList(res, list);
  } catch (error) {
    console.error("Could not update resource list:", error);
    return res.status(500).json({ success: false, error: "Could not update your list" });
  }
};

export const deleteResourceList = async (req: AuthRequest, res: Response) => {
  try {
    if (!validId(req.params.id)) {
      return res.status(404).json({ success: false, error: "List not found" });
    }
    const deleted = await ResourceList.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user!._id,
    });
    if (!deleted) return res.status(404).json({ success: false, error: "List not found" });
    return res.status(200).json({ success: true, message: "List deleted" });
  } catch (error) {
    console.error("Could not delete resource list:", error);
    return res.status(500).json({ success: false, error: "Could not delete your list" });
  }
};

export const addResourceToList = async (req: AuthRequest, res: Response) => {
  try {
    const { id, resourceId } = req.params;
    if (!validId(id) || !validId(resourceId)) {
      return res.status(404).json({ success: false, error: "List or resource not found" });
    }
    const [list, resource] = await Promise.all([
      ResourceList.findOne({ _id: id, ownerId: req.user!._id }),
      Resource.findOne({ _id: resourceId, status: ResourceStatus.APPROVED }).select("_id"),
    ]);
    if (!list || !resource) {
      return res.status(404).json({ success: false, error: "List or approved resource not found" });
    }
    await ResourceList.updateOne({ _id: list._id }, { $addToSet: { resources: resource._id } });
    const updated = await ResourceList.findById(list._id).populate(resourcePopulation);
    return sendList(res, updated);
  } catch (error) {
    console.error("Could not save resource to list:", error);
    return res.status(500).json({ success: false, error: "Could not save this resource" });
  }
};

export const removeResourceFromList = async (req: AuthRequest, res: Response) => {
  try {
    const { id, resourceId } = req.params;
    if (!validId(id) || !validId(resourceId)) {
      return res.status(404).json({ success: false, error: "List or resource not found" });
    }
    const list = await ResourceList.findOneAndUpdate(
      { _id: id, ownerId: req.user!._id },
      { $pull: { resources: resourceId } },
      { new: true },
    ).populate(resourcePopulation);
    if (!list) return res.status(404).json({ success: false, error: "List not found" });
    return sendList(res, list);
  } catch (error) {
    console.error("Could not remove resource from list:", error);
    return res.status(500).json({ success: false, error: "Could not remove this resource" });
  }
};
