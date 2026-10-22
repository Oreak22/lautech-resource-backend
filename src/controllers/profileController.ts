import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";

const serializeProfile = (user: NonNullable<AuthRequest["user"]>) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  matricNumber: user.matricNumber ?? "",
  phone: user.phone ?? "",
  department: user.department ?? "",
  faculty: user.faculty ?? "",
  currentLevel: user.currentLevel ?? "",
  bio: user.bio ?? "",
  role: user.role,
});

export const getMyProfile = (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Not authorized" });
  }

  return res.status(200).json({
    success: true,
    data: serializeProfile(req.user),
  });
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ success: false, error: "Not authorized" });
  }

  const { name, matricNumber, phone, department, faculty, currentLevel, bio } = req.body ?? {};
  const textFields: Array<[string, unknown, number]> = [
    ["name", name, 80],
    ["matricNumber", matricNumber, 30],
    ["department", department, 120],
    ["faculty", faculty, 120],
    ["bio", bio, 500],
  ];

  for (const [field, value, maxLength] of textFields) {
    if (value !== undefined && typeof value !== "string") {
      return res.status(400).json({ success: false, error: `${field} must be text` });
    }
    if (typeof value === "string" && value.trim().length > maxLength) {
      return res.status(400).json({
        success: false,
        error: `${field} must be ${maxLength} characters or fewer`,
      });
    }
  }

  if (name !== undefined && name.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Name must be at least 2 characters" });
  }

  if (matricNumber !== undefined && matricNumber.trim() && matricNumber.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: "Matric number must be at least 5 characters",
    });
  }

  if (phone !== undefined && typeof phone !== "string") {
    return res.status(400).json({ success: false, error: "Phone must be text" });
  }
  if (typeof phone === "string" && phone.trim() && !/^\+?[\d\s()\-]{7,25}$/.test(phone.trim())) {
    return res.status(400).json({ success: false, error: "Enter a valid phone number" });
  }

  const validLevels = ["100", "200", "300", "400", "500", "600", "postgraduate"];
  if (currentLevel !== undefined && currentLevel !== "" && !validLevels.includes(currentLevel)) {
    return res.status(400).json({ success: false, error: "Choose a valid current level" });
  }

  if (name !== undefined) user.name = name.trim();
  if (matricNumber !== undefined) user.matricNumber = matricNumber.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (department !== undefined) user.department = department.trim();
  if (faculty !== undefined) user.faculty = faculty.trim();
  if (currentLevel !== undefined) user.currentLevel = currentLevel;
  if (bio !== undefined) user.bio = bio.trim();

  try {
    await user.save();
    return res.status(200).json({
      success: true,
      data: serializeProfile(user),
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Profile update failed:", error);
    return res.status(500).json({ success: false, error: "Could not update profile" });
  }
};
