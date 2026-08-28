import multer from "multer";
import { Request } from "express";

// Hold the file in memory, do not write to disk
const storage = multer.memoryStorage();

// Filter for accepted file types
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimeTypes = [
    "application/pdf", // Textbooks / Past Questions
    "image/jpeg",
    "image/png",
    "image/jpg", // Scanned Handouts
    "application/zip",
    "application/x-rar-compressed", // Project Reports
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only PDF, JPEG, PNG, and ZIP are allowed."),
    );
  }
};

// Initialize Multer (20MB limit)
export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter,
});
