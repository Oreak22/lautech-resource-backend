import { ApprovalStatus, Lecturer } from "../models/Lecturer";
import { Request, Response } from "express";
import Review from "../models/Review";
import { Resource, ResourceStatus } from "../models/Resource";
import { AuthRequest } from "../middlewares/authMiddleware";
import { ObjectIdQueryTypeCasting, ObjectId, Types } from "mongoose";
import { Department } from "../models/Department";

const resolveDepartmentName = async (lecturer: any): Promise<string> => {
  const departmentReference = lecturer.departmentId;
  const populatedName = departmentReference?.name;
  if (typeof populatedName === "string" && populatedName.trim()) {
    return populatedName;
  }

  // Support lecturer records created before departmentId became the canonical field.
  if (typeof lecturer.department === "string" && lecturer.department.trim()) {
    return lecturer.department;
  }

  if (departmentReference == null) return "Unknown Department";

  const departmentId = departmentReference._id ?? departmentReference;
  if (Types.ObjectId.isValid(String(departmentId))) {
    const department = await Department.findById(departmentId)
      .select("name")
      .lean();
    if (department?.name) return department.name;
  }

  if (typeof departmentReference === "string") {
    const department = await Department.findOne({ name: departmentReference })
      .select("name")
      .lean();
    if (department?.name) return department.name;

    // A legacy record may store the department label directly in departmentId.
    return departmentReference;
  }

  return "Unknown Department";
};
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
      const departmentRecord = await Department.findOne({
        name: String(department),
      }).select("_id");

      if (!departmentRecord) {
        res.status(200).json({ success: true, count: 0, data: [] });
        return;
      }

      query.departmentId = departmentRecord._id;
    }

    const lecturers = await Lecturer.find(query)
      .populate("departmentId", "name")
      .select("_id name departmentId isVerified")
      .sort({ name: 1 })
      .lean();

    const data = await Promise.all(
      lecturers.map(async (lecturer: any) => ({
        ...lecturer,
        department: await resolveDepartmentName(lecturer),
      })),
    );

    if (sortBy === "department") {
      data.sort(
        (a, b) =>
          a.department.localeCompare(b.department) ||
          a.name.localeCompare(b.name),
      );
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data,
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
      .populate("courseId", "courseCode title")
      .populate("lecturerId", "name")
      .populate("uploaderId", "name")
      .sort({ createdAt: -1 })
      .lean();

    const reviews = await Review.find({
      lecturer: req.params.id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const profilePayload = {
      ...lecturer,
      department: await resolveDepartmentName(lecturer),
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
