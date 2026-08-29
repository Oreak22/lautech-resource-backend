import { Request, Response } from "express";
import { Resource, ResourceStatus } from "../models/Resource";
import { User, UserRole } from "../models/User";
import { deleteFromCloudinary } from "../utils/cloudinary";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Lecturer } from "../models/Lecturer";

// 1. Get all pending resources
export const getPendingResources = async (req: Request, res: Response) => {
  try {
    const pendingResources = await Resource.find({
      status: ResourceStatus.PENDING,
    })
      .populate("uploaderId", "name email trustScore")
      .populate("courseId", "courseCode title")
      .populate("lecturerId", "name")
      .sort({ createdAt: 1 }); // Oldest first for a proper queue

    return res.status(200).json({
      success: true,
      count: pendingResources.length,
      data: pendingResources,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch pending queue" });
  }
};

// 2. Approve a resource & update Trust Score
export const approveResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    const resource = await Resource.findById(id);
    if (!resource)
      return res
        .status(404)
        .json({ success: false, error: "Resource not found" });
    if (resource.status === ResourceStatus.APPROVED)
      return res
        .status(400)
        .json({ success: false, error: "Already approved" });

    resource.status = ResourceStatus.APPROVED;
    resource.moderatedBy = adminId as any;
    await resource.save();

    // Update uploader's trust score
    const uploader = await User.findById(resource.uploaderId);
    if (uploader) {
      uploader.trustScore += 1;

      // Auto-promote Student to Senior if threshold met
      if (uploader.trustScore >= 10 && uploader.role === UserRole.STUDENT) {
        uploader.role = UserRole.SENIOR;
      }
      await uploader.save();
    }

    return res.status(200).json({ success: true, data: resource });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to approve resource" });
  }
};

// 3. Reject and Delete a resource
export const rejectResource = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const resource = await Resource.findById(id);
    if (!resource)
      return res
        .status(404)
        .json({ success: false, error: "Resource not found" });

    // Delete the physical file from Cloudinary to save space
    await deleteFromCloudinary(resource.fileUrl);

    // Delete the database record (or change status to REJECTED if you prefer to keep a paper trail)
    await resource.deleteOne();

    return res
      .status(200)
      .json({ success: true, message: "Resource rejected and deleted" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to reject resource" });
  }
};
export const getAdminAnalytics = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const [
      totalResources,
      pendingResources,
      approvedResources,
      totalLecturers,
      verifiedLecturers,
      totalStudents,
    ] = await Promise.all([
      Resource.countDocuments(),
      Resource.countDocuments({ status: ResourceStatus.PENDING }),
      Resource.countDocuments({ status: ResourceStatus.APPROVED }),
      Lecturer.countDocuments(),
      Lecturer.countDocuments({ isVerified: true }),
      User.countDocuments({ role: { $ne: UserRole.ADMIN } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalResources,
        pendingResources,
        approvedResources,
        totalLecturers,
        verifiedLecturers,
        totalStudents,
      },
    });
  } catch (error: unknown) {
    console.error("Error fetching admin analytics:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
