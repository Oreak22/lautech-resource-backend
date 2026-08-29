import { Router } from "express";
import { voteReview } from "../controllers/reviewController";
import { protect } from "../middlewares/authMiddleware";
// import { protect } from "../middleware/authMiddleware";

const router = Router();

// Requires user to be logged in to vote
router.put("/:id/vote", protect, voteReview);

export default router;
