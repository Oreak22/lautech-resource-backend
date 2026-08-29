import { Router } from "express";
import {
  getAllLecturers,
  getLecturerProfile,
  addReview,
} from "../controllers/lecturerController";
import { protect } from "../middlewares/authMiddleware"; // Assuming your JWT middleware path

const router = Router();

router.get("/", getAllLecturers);
router.get("/:id/profile", getLecturerProfile);

// Requires user to be logged in to post a review
router.post("/:id/reviews", protect, addReview);

export default router;
