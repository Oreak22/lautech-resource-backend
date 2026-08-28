import { Router } from "express";
import {
  addComment,
  getLecturerComments,
  toggleUpvote,
  toggleDownvote,
} from "../controllers/commentController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Fetch comments (Public)
router.get("/lecturer/:lecturerId", getLecturerComments);

// Add a comment (Protected)
router.post("/", protect, addComment);

// Vote on a comment (Protected)
router.put("/:commentId/upvote", protect, toggleUpvote);
router.put("/:commentId/downvote", protect, toggleDownvote);

export default router;
