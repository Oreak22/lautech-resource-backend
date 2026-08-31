import express from "express";
import { getAllDepartments, createDepartment } from "../controllers/departmentController";
import { protect, authorize } from "../middlewares/authMiddleware";
import { UserRole } from "../models/User";

const router = express.Router();

router.get("/", getAllDepartments);
router.post("/", protect, authorize(UserRole.ADMIN), createDepartment);

export default router;
