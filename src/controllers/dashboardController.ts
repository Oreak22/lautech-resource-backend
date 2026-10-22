import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import Review from "../models/Review";
import { Resource } from "../models/Resource";

export const getMyDashboard = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user!._id;
    const [resources, reviews] = await Promise.all([
      Resource.find({ uploaderId: userId })
        .populate("courseId", "courseCode title department")
        .populate("lecturerId", "name")
        .populate("uploaderId", "name")
        .select("-__v -moderatedBy -cloudinaryPublicId")
        .sort({ createdAt: -1 })
        .lean(),
      Review.find({ user: userId })
        .populate("lecturer", "name")
        .select("-__v -upvotedBy -downvotedBy")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      data: { resources, reviews },
    });
  } catch (error) {
    console.error("Dashboard activity error:", error);
    res.status(500).json({ success: false, error: "Failed to load dashboard" });
  }
};
