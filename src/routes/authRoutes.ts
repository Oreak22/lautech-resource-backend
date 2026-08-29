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

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);
router.get("/verify/:token", verifyEmail);
router.post("/forgotpassword", forgotPassword);
router.put("/resetpassword/:token", resetPassword);


export default router;
