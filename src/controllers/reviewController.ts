import { Request, Response } from "express";
import Review from "../models/Review";
import { AuthRequest } from "../middlewares/authMiddleware";

// @desc    Toggle upvote/downvote on a review
// @route   PUT /api/reviews/:id/vote
export const voteReview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    const { voteType } = req.body; // Expects "up" or "down"
    const userId = req.user._id;

    const review = await Review.findById(req.params.id);
    if (!review) {
      res.status(404).json({ success: false, error: "Review not found" });
      return;
    }

    // Convert ObjectIds to strings for accurate comparison
    const upvotedStr = review.upvotedBy.map((id) => id.toString());
    const downvotedStr = review.downvotedBy.map((id) => id.toString());
    const userStr = userId.toString();

    // Remove user from both arrays initially to reset their state
    review.upvotedBy = review.upvotedBy.filter(
      (id) => id.toString() !== userStr,
    );
    review.downvotedBy = review.downvotedBy.filter(
      (id) => id.toString() !== userStr,
    );

    if (voteType === "up") {
      // If they hadn't already upvoted, add them (acts as a toggle)
      if (!upvotedStr.includes(userStr)) {
        review.upvotedBy.push(userId as any);
      }
    } else if (voteType === "down") {
      // If they hadn't already downvoted, add them
      if (!downvotedStr.includes(userStr)) {
        review.downvotedBy.push(userId as any);
      }
    }

    // Recalculate totals based on array lengths
    review.upvotes = review.upvotedBy.length;
    review.downvotes = review.downvotedBy.length;

    await review.save();

    res.status(200).json({ success: true, data: review });
  } catch (error: unknown) {
    console.error("Error voting on review:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

export const updateMyReview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    const content = typeof req.body.content === "string" ? req.body.content.trim() : "";
    if (content.length < 10 || content.length > 500) {
      res.status(400).json({
        success: false,
        error: "Review must be between 10 and 500 characters",
      });
      return;
    }

    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!review) {
      res.status(404).json({ success: false, error: "Review not found" });
      return;
    }

    review.content = content;
    await review.save();

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    console.error("Update Review Error:", error);
    res.status(500).json({ success: false, error: "Failed to update review" });
  }
};

export const deleteMyReview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!review) {
      res.status(404).json({ success: false, error: "Review not found" });
      return;
    }

    res.status(200).json({ success: true, message: "Review removed" });
  } catch (error) {
    console.error("Delete Review Error:", error);
    res.status(500).json({ success: false, error: "Failed to remove review" });
  }
};
