import { Request, Response } from "express";
import { User } from "../models/User";
import jwt from "jsonwebtoken";

// Helper function to generate JWT
const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: (process.env.JWT_EXPIRE as any) ,
  });
};

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, matricNumber } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, error: "Email already in use" });
    }

    const user = await User.create({ name, email, password, matricNumber });
    const token = generateToken(user.id as string); // Use .id instead of ._id as string

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Server error during registration" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: "Please provide email and password" });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    const token = generateToken(user.id as string);
    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, role: user.role },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, error: "Server error during login" });
  }
};
