import { Request, Response } from "express";
import Course from "../models/Course";
// import Course from "../models/Course";

export const getAllCourses = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const courses = await Course.find({})
      .select("_id courseCode title")
      .sort({ courseCode: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error: unknown) {
    console.error("Error fetching courses:", error);
    res.status(500).json({
      success: false,
      error: "Server error while fetching course directory.",
    });
  }
};

export const createCourse = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { courseCode, title, department } = req.body;
    
    if (!courseCode || !title || !department) {
      res.status(400).json({ success: false, error: "Please provide courseCode, title, and department" });
      return;
    }

    const existing = await Course.findOne({ courseCode });
    if (existing) {
      res.status(400).json({ success: false, error: "Course code already exists" });
      return;
    }

    const course = await Course.create({ courseCode, title, department });
    res.status(201).json({ success: true, data: course });
  } catch (error: unknown) {
    console.error("Error creating course:", error);
    res.status(500).json({ success: false, error: "Server error while creating course." });
  }
};
