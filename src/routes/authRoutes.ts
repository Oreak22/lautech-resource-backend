import { Router } from "express";
import {
  registerUser,
  loginUser,
  googleAuth,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { getAdminAnalytics } from "../controllers/adminController";
import { getMyProfile, updateMyProfile } from "../controllers/profileController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.get("/verify/:token", verifyEmail);
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:token", resetPassword);
router.get("/profile", protect, getMyProfile);
router.patch("/profile", protect, updateMyProfile);


export default router;
