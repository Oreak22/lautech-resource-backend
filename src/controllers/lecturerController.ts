import { ApprovalStatus, Lecturer } from "../models/Lecturer";
import { Request, Response } from "express";
import Review from "../models/Review";
import { Resource, ResourceStatus } from "../models/Resource";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ObjectIdQueryTypeCasting } from "mongoose";
import { ObjectId } from "mongoose";
// interface AuthRequest extends Request {
//   user?: { _id: string; name: string };
// }
// export const getAllLecturers = async (req: Request, res: Response) => {
//   try {
//     // Fetch all verified lecturers, sorted alphabetically by name
//     const lecturers = await Lecturer.find({ status: ApprovalStatus.APPROVED })
//       .sort({ name: 1 })
//       .select("_id name");
//     console.log(lecturers);
//     res.status(200).json({
//       success: true,
//       data: lecturers,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ success: false, error: "Failed to fetch lecturers" });
//   }
// };
export const getAllLecturers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, department, sortBy } = req.query;
    
    const query: any = { status: ApprovalStatus.APPROVED};

    if (search) {
      query.name = { $regex: search as string, $options: 'i' };
    }

    if (department && department !== 'All') {
      query.department = department as string;
    }

    let sortOption: any = { name: 1 };

    if (sortBy === 'department') {
      sortOption = { department: 1, name: 1 };
    }

    console.log(query)

    const lecturers = await Lecturer.find(query)
      .select('_id name department isVerified')
      .sort(sortOption)
      .lean();
    res.status(200).json({
      success: true,
      count: lecturers.length,
      data: lecturers,
    });
  } catch (error: unknown) {
    console.error('Error fetching lecturers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error while fetching lecturer directory.' 
    });
  }
};

export const addLecturer = async (req: AuthRequest, res: Response) => {
  try {
    const { name, departmentId } = req.body;
    const existingLecturer = await Lecturer.findOne({ name, departmentId });
    if (existingLecturer) {
      return res.status(400).json({ success: false, error: "Lecturer already exists" });
    }
    const lecturer = await Lecturer.create({ name, departmentId, submittedBy: req.user?.id, status: ApprovalStatus.APPROVED });
    res.status(201).json({ success: true, data: lecturer });
    console.log(lecturer);
  } catch (error: unknown) {
    console.error("Error adding lecturer:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
}

export const getLecturerProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const lecturer = await Lecturer.findById(req.params.id).populate("departmentId", "name").lean();
    if (!lecturer) {
      res.status(404).json({ success: false, error: "Lecturer not found" });
      return;
    }

    // Fetch all approved resources linked to this lecturer
    const resources = await Resource.find({
      lecturerId: req.params.id,
      status: "approved" as ResourceStatus,
    })
      .sort({ createdAt: -1 })
      .lean();

    const reviews = await Review.find({
      lecturer: req.params.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const profilePayload = {
      ...lecturer,
      department: (lecturer.departmentId as any)?.name || "Unknown Department",
      // Mocking teachingTags for now since they aren't in the schema yet
      teachingTags: ["Strict Grading", "Detailed Notes", "Research Focused"],
      resources,
      reviews,
    };

    res.status(200).json({ success: true, data: profilePayload });
  } catch (error: unknown) {
    console.error("Error fetching lecturer profile:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Add a new review for a lecturer
// @route   POST /api/lecturers/:id/reviews
export const addReview = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    const { courseCode, content, isAnonymous } = req.body;
    const lecturerId = req.params.id;

    const lecturer = await Lecturer.findById(lecturerId);
    if (!lecturer) {
      res.status(404).json({ success: false, error: "Lecturer not found" });
      return;
    }

    const newReview = await Review.create({
      lecturer: lecturerId as ObjectIdQueryTypeCasting,
      user: req.user._id,
      authorAlias: isAnonymous ? "Anonymous Student" : req.user.name,
      courseCode,
      content,
    });

    res.status(201).json({ success: true, data: newReview });
  } catch (error: unknown) {
    console.error("Error adding review:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};
