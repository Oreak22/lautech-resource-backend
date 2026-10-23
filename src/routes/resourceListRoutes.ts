import { Router } from "express";
import { protect } from "../middlewares/authMiddleware";
import {
  addResourceToList,
  createResourceList,
  deleteResourceList,
  getMyResourceList,
  getMyResourceLists,
  getPublicResourceList,
  removeResourceFromList,
  updateResourceList,
} from "../controllers/resourceListController";

const router = Router();

router.get("/public/:id", getPublicResourceList);
router.use(protect);
router.get("/mine", getMyResourceLists);
router.get("/mine/:id", getMyResourceList);
router.post("/", createResourceList);
router.patch("/:id", updateResourceList);
router.delete("/:id", deleteResourceList);
router.post("/:id/resources/:resourceId", addResourceToList);
router.delete("/:id/resources/:resourceId", removeResourceFromList);

export default router;
