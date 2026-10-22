import { Router } from "express";
import {
  getPendingResources,
  approveResource,
  rejectResource,
  getAdminAnalytics,
} from "../controllers/adminController";
import { protect, authorize } from "../middlewares/authMiddleware";
import { UserRole } from "../models/User";
import { getReports, reviewReport } from "../controllers/reportController";

const router = Router();

// Protect all routes in this file, and restrict to ADMIN role
router.use(protect);
router.use(authorize(UserRole.ADMIN));

router.get("/resources/pending", getPendingResources);
router.put("/resources/:id/approve", approveResource);
router.put("/resources/:id/reject", rejectResource);
router.get("/analytics", getAdminAnalytics);
router.get("/reports", getReports);
router.patch("/reports/:id", reviewReport);


export default router;
