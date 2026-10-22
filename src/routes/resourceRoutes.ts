import { Router } from "express";
import {
  uploadResourceFile,
  searchResources,
  extractMetadata,
  getResourceById,
  voteResource,
  deleteMyResource,
} from "../controllers/resourceController";
import { protect } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/uploadMiddleware";

const router = Router();

router.get("/search", searchResources);
router.get("/:id", getResourceById);

// 1. Frontend calls this immediately after file selection to autofill the form
router.post("/extract", protect, upload.single("file"), extractMetadata);

// 2. Frontend calls this when the user clicks the final "Submit" button
router.post("/upload", protect, upload.single("file"), uploadResourceFile);

// 3. Vote on a resource
router.put("/:id/vote", protect, voteResource);
router.delete("/:id", protect, deleteMyResource);

export default router;
