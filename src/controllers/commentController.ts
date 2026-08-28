import { Request, Response } from "express";
import { Comment } from "../models/Comment";
// import { Lecturer } from "../models/Lecturer";
import { AuthRequest } from "../middlewares/authMiddleware";

// 1. Add a new comment
export const addComment = async (req: AuthRequest, res: Response) => {
  try {
    const { text, lecturerId } = req.body;
    const studentId = req.user!.id;

    // Verify the lecturer exists
    // const lecturerExists = await Lecturer.findById(lecturerId);
    // if (!lecturerExists) {
    //   return res
    //     .status(404)
    //     .json({ success: false, error: "Lecturer not found" });
    // }

//     const comment = await Comment.create({
//       text,
//       studentId,
//       lecturerId,
//     });

//     // Populate the student name before returning so the frontend can render immediately
//     await comment.populate("studentId", "name");

//     return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to post comment" });
  }
};

// 2. Get comments for a specific lecturer
export const getLecturerComments = async (req: Request, res: Response) => {
  try {
    const { lecturerId } = req.params;
    const { page = "1", limit = "10", sort = "recent" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // Define sorting behavior (recent vs most liked)
    const sortOptions: any =
      sort === "top"
        ? { "likedBy.length": -1, createdAt: -1 }
        : { createdAt: -1 };

    const comments = await Comment.find({ lecturerId })
      .populate("studentId", "name") // Only send the student's name, keep email hidden
      .sort(sortOptions)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const total = await Comment.countDocuments({ lecturerId });

    return res.status(200).json({
      success: true,
      count: comments.length,
      total,
      totalPages: Math.ceil(total / limitNumber),
      data: comments,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch comments" });
  }
};

// 3. Toggle Upvote
export const toggleUpvote = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    const comment = await Comment.findById(commentId);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, error: "Comment not found" });

    const hasUpvoted = comment.likedBy.includes(userId);

    if (hasUpvoted) {
      // Toggle off
      comment.likedBy.pull(userId);
    } else {
      // Toggle on, and ensure they aren't in the disliked list
      comment.likedBy.push(userId);
      comment.dislikedBy.pull(userId);
    }

    await comment.save();
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to upvote comment" });
  }
};

// 4. Toggle Downvote
export const toggleDownvote = async (req: AuthRequest, res: Response) => {
  try {
    const { commentId } = req.params;
    const userId = req.user!.id;

    const comment = await Comment.findById(commentId);
    if (!comment)
      return res
        .status(404)
        .json({ success: false, error: "Comment not found" });

    const hasDownvoted = comment.dislikedBy.includes(userId);

    if (hasDownvoted) {
      // Toggle off
      comment.dislikedBy.pull(userId);
    } else {
      // Toggle on, and ensure they aren't in the liked list
      comment.dislikedBy.push(userId);
      comment.likedBy.pull(userId);
    }

    await comment.save();
    return res.status(200).json({ success: true, data: comment });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to downvote comment" });
  }
};
