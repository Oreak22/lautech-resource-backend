import { Router } from "express";
import { getMyDashboard } from "../controllers/dashboardController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", protect, getMyDashboard);

export default router;
