import express from "express";
import { getAllCourses, createCourse } from "../controllers/courseController";
import { protect, authorize } from "../middlewares/authMiddleware";
import { UserRole } from "../models/User";

const router = express.Router();
// import { getCourses } from "../controllers/courseController";
router.get("/", getAllCourses);
router.post("/", protect, authorize(UserRole.ADMIN), createCourse);

export default router;
