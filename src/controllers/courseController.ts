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
