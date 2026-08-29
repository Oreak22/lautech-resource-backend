import crypto from "crypto";
import { Request, Response } from "express";
import { User } from "../models/User";
import { isStudentEmail } from "../utils/validateStudentEmail";
import { sendEmail } from "../utils/sendEmail";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// const generateToken = (id: string) =>
//   jwt.sign({ id }, process.env.JWT_SECRET as string, {
//     expiresIn: process.env.JWT_EXPIRE,
//   });

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRE as any,
  });
};

// 1. Register: Send email instead of logging in immediately
export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, matricNumber } = req.body;

    if (!isStudentEmail(email)) {
      return res.status(403).json({
        success: false,
        error: "Must use a valid LAUTECH student email.",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res
        .status(400)
        .json({ success: false, error: "Email already in use" });

    const user = await User.create({ name, email, password, matricNumber });

    // Generate Verification Token
    const verificationToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });

    // Send Email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    const message = `<p>Welcome to LAUTECH Resources! Please verify your email by clicking: <a href="${verifyUrl}">${verifyUrl}</a></p>`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify your email",
        message,
      });
      res.status(201).json({
        success: true,
        message: "Verification email sent. Please check your inbox.",
      });
    } catch (error) {
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Error sending verification email:", error);
      return res
        .status(500)
        .json({ success: false, error: "Email could not be sent" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Registration failed" });
  }
};

// 2. Verify Email Endpoint
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const verificationToken = crypto
      .createHash("sha256")
      .update(req.params.token as string)
      .digest("hex");

    const user = await User.findOne({
      verificationToken,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ success: false, error: "Invalid or expired token" });

    user.isEmailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    await user.save();

    const token = generateToken(user.id);
    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Verification failed" });
  }
};

// 3. Login: Block unverified users
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(401).json({
        success: false,
        error: "Please verify your email before logging in.",
      });
    }

    const token = generateToken(user.id);
    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Login failed" });
  }
};

// 4. Google Auth: Seamless linking and auto-verification
export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { token: googleToken } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: googleToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email)
      return res
        .status(400)
        .json({ success: false, error: "Invalid Google auth" });

    const { email, name, sub: googleId } = payload;
    if (!isStudentEmail(email))
      return res
        .status(403)
        .json({ success: false, error: "Student email required." });

    let user = await User.findOne({ email });

    if (user) {
      // If the user registered manually but hasn't verified, Google Auth verifies them instantly
      user.isEmailVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpire = undefined;

      if (!user.googleId) user.googleId = googleId;
      await user.save();
    } else {
      // Google accounts are inherently verified
      user = await User.create({
        name,
        email,
        googleId,
        isEmailVerified: true,
      });
    }

    const token = generateToken(user.id);
    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, error: "Google authentication failed" });
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      res
        .status(404)
        .json({ success: false, error: "There is no user with that email" });
      return;
    }

    // Get reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Create reset url (Points to your Next.js Frontend)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetUrl = `${frontendUrl}/auth/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Password reset token",
        message,
      });

      res.status(200).json({ success: true, data: "Email sent" });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      res
        .status(500)
        .json({ success: false, error: "Email could not be sent" });
    }
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:token
export const resetPassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    // Get hashed token to compare against database
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token as string)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      res
        .status(400)
        .json({ success: false, error: "Invalid or expired token" });
      return;
    }

    // Set new password (Assuming you have a pre-save hook in your User model to hash passwords)
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully. You may now log in.",
    });
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
