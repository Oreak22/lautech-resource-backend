import { Request, Response } from "express";
import Review from "../models/Review";

interface AuthRequest extends Request {
  user?: { _id: string };
}

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
