import { Router } from "express";
import { createReport, getMyReports } from "../controllers/reportController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

router.get("/mine", protect, getMyReports);
router.post("/", protect, createReport);

export default router;
