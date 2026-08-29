import express from "express";
import { getAllCourses } from "../controllers/courseController";
const router = express.Router();
// import { getCourses } from "../controllers/courseController";
router.get("/", getAllCourses);

export default router;
