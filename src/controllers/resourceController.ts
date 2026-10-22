import { Response, Request } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { streamUpload } from "../utils/streamUpload";
import { analyzeStudyMaterial } from "../utils/aiAnalyzer";
import { Resource, ResourceStatus } from "../models/Resource";
import { UserRole } from "../models/User";
import Course from "../models/Course";
import { Types } from "mongoose";
import { deleteFromCloudinary } from "../utils/cloudinary";

const getCourseNumber = (courseCode: string): number | null => {
  const numberPart = courseCode.match(/\d+/)?.[0];
  if (!numberPart) return null;

  const courseNumber = Number(numberPart);
  return Number.isSafeInteger(courseNumber) ? courseNumber : null;
};

const escapeRegex = (value: string) =>
  value
    .split("")
    .map((character) =>
      ".*+?^${}()|[]\\".includes(character) ? "\\" + character : character,
    )
    .join("");

export const uploadResourceFile = async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, courseId, lecturerId, session } = req.body;
    const user = req.user!; 

    if (!req.file || !title || !category || !courseId || !lecturerId) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields or file" });
    }

    // 1. AI Gatekeeper Analysis
    const aiResult = await analyzeStudyMaterial(
      req.file.buffer,
      req.file.mimetype,
    );

    if (!aiResult.isRelevant) {
      return res.status(400).json({
        success: false,
        error: `File rejected: ${aiResult.rejectionReason}`,
      });
    }

    // 2. Upload to Cloudinary (Only happens if AI approves)
    const uploadResult = await streamUpload(
      req.file.buffer,
      "lautech_resources",
      req.file.mimetype
    );

    // 3. Determine Initial Status (Seniors/Admins bypass the pending queue)
    const initialStatus =
      user.role === UserRole.SENIOR || user.role === UserRole.ADMIN
        ? ResourceStatus.APPROVED
        : ResourceStatus.PENDING;

    // 4. Save to MongoDB
    const resource = await Resource.create({
      title,
      category,
      fileUrl: uploadResult.secure_url,
      fileFormat: req.file.mimetype,
      fileSize: req.file.size,
      cloudinaryPublicId: uploadResult.public_id,
      uploaderId: user.id,
      courseId,
      lecturerId,
      status: initialStatus,
      moderatedBy: initialStatus === ResourceStatus.APPROVED ? (user.id as any) : undefined,
      session,
      // Injecting AI Metadata
      keywords: aiResult.keywords,
      aiSummary: aiResult.summary,
      aiConfidenceScore: aiResult.confidence,
    });

    return res.status(201).json({
      success: true,
      message: "File uploaded and analyzed successfully",
      data: resource,
    });
  } catch (error) {
    console.error("Upload Process Error:", error);
    return res
      .status(500)
      .json({ success: false, error: "File upload pipeline failed" });
  }
};

export const searchResources = async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      courseId,
      lecturerId,
      department,
      level,
      semester,
      sortBy,
    } = req.query;

    // 1. Base filter: Only show approved resources
    const query: any = { status: ResourceStatus.APPROVED };

    // 2. Autocomplete Search (Partial matching on Title or AI Keywords)
    if (q) {
      const searchQuery = String(q);
      query.$or = [
        { title: { $regex: searchQuery, $options: "i" } },
        { keywords: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // 3. Faceted Filters
    if (category) query.category = String(category);
    if (courseId) {
      query.courseId = Types.ObjectId.isValid(String(courseId))
        ? new Types.ObjectId(String(courseId))
        : { $in: [] };
    }
    if (lecturerId) {
      query.lecturerId = Types.ObjectId.isValid(String(lecturerId))
        ? new Types.ObjectId(String(lecturerId))
        : { $in: [] };
    }

    if (department || level || semester) {
      const departmentPattern = department
        ? new RegExp(
            "^\\s*" + escapeRegex(String(department)) + "\\s*$",
            "i",
          )
        : undefined;
      const matchingCourses = await Course.find(
        departmentPattern ? { department: departmentPattern } : {},
      )
        .select("_id courseCode")
        .lean();
      const matchingCourseIds = matchingCourses
        .filter((course) => {
          if (!level && !semester) return true;
          const courseNumber = getCourseNumber(course.courseCode);
          if (courseNumber === null) return false;

          if (level && String(Math.floor(courseNumber / 100) * 100) !== String(level)) {
            return false;
          }

          if (semester) {
            const courseSemester = courseNumber % 2 === 1 ? "first" : "second";
            if (courseSemester !== String(semester).toLowerCase()) return false;
          }

          return true;
        })
        .map((course) => course._id);

      if (query.courseId instanceof Types.ObjectId) {
        query.courseId = matchingCourseIds.some(
          (id) => String(id) === String(query.courseId),
        )
          ? query.courseId
          : { $in: [] };
      } else if (!query.courseId) {
        query.courseId = { $in: matchingCourseIds };
      }
    }

    // 4. Pagination Setup
    const parsePositiveInteger = (value: unknown, fallback: number) => {
      if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
      const parsed = Number(value);
      return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
    };

    const pageNumber = parsePositiveInteger(req.query.page, 1);
    const limitNumber = Math.min(parsePositiveInteger(req.query.limit, 10), 100);
    const skip = (pageNumber - 1) * limitNumber;

    // Execute the page query and total count together for pagination metadata.
    const resourcesPromise = (async () => {
      if (
        sortBy === "department" ||
        sortBy === "level" ||
        sortBy === "semester"
      ) {
        const orderedResources = await Resource.aggregate([
          { $match: query },
          {
            $lookup: {
              from: Course.collection.name,
              localField: "courseId",
              foreignField: "_id",
              as: "course",
            },
          },
          {
            $unwind: {
              path: "$course",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              courseNumber: {
                $convert: {
                  input: {
                    $let: {
                      vars: {
                        numberMatch: {
                          $regexFind: {
                            input: { $ifNull: ["$course.courseCode", ""] },
                            regex: /\d+/,
                          },
                        },
                      },
                      in: "$$numberMatch.match",
                    },
                  },
                  to: "int",
                  onError: null,
                  onNull: null,
                },
              },
              departmentSort: {
                $toLower: { $ifNull: ["$course.department", ""] },
              },
            },
          },
          {
            $addFields: {
              courseLevel: {
                $multiply: [{ $floor: { $divide: ["$courseNumber", 100] } }, 100],
              },
              semesterSort: {
                $cond: [{ $eq: [{ $mod: ["$courseNumber", 2] }, 1] }, 0, 1],
              },
            },
          },
          {
            $sort:
              sortBy === "department"
                ? { departmentSort: 1, createdAt: -1, _id: 1 }
                : sortBy === "level"
                  ? { courseLevel: 1, createdAt: -1, _id: 1 }
                  : { semesterSort: 1, courseLevel: 1, createdAt: -1, _id: 1 },
          },
          { $skip: skip },
          { $limit: limitNumber },
          { $project: { _id: 1 } },
        ]);
        const orderedIds = orderedResources.map((resource) => resource._id);
        const resources = await Resource.find({ _id: { $in: orderedIds } })
          .populate("courseId", "courseCode title department")
          .populate("lecturerId", "name")
          .populate("uploaderId", "name")
          .select("-__v -moderatedBy")
          .lean();
        const resourcesById = new Map(
          resources.map((resource) => [String(resource._id), resource]),
        );
        return orderedIds
          .map((id) => resourcesById.get(String(id)))
          .filter((resource) => resource !== undefined);
      }

      return Resource.find(query)
        .populate("courseId", "courseCode title department")
        .populate("lecturerId", "name")
        .populate("uploaderId", "name")
        .select("-__v -moderatedBy")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);
    })();

    const [resources, total] = await Promise.all([
      resourcesPromise,
      Resource.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      count: resources.length,
      total,
      totalPages: Math.ceil(total / limitNumber),
      currentPage: pageNumber,
      data: resources,
    });
  } catch (error) {
    console.error("Search Error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to search resources" });
  }
};

export const extractMetadata = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "No file provided for analysis" });
    }

    // Run the AI analysis
    const aiResult = await analyzeStudyMaterial(
      req.file.buffer,
      req.file.mimetype,
    );

    if (!aiResult.isRelevant) {
      return res.status(400).json({
        success: false,
        error: `File rejected: ${aiResult.rejectionReason}`,
      });
    }

    // Return the extracted data to the frontend to autofill the form
    return res.status(200).json({
      success: true,
      message: "Metadata extracted successfully",
      data: aiResult,
    });
  } catch (error) {
    console.error("Metadata Extraction Error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to extract metadata" });
  }
};

export const getResourceById = async (req: Request, res: Response) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate("courseId", "courseCode title")
      .populate("lecturerId", "name department")
      .populate("uploaderId", "name");

    if (!resource) {
      return res.status(404).json({ success: false, error: "Resource not found" });
    }

    return res.status(200).json({ success: true, data: resource });
  } catch (error) {
    console.error("Get Resource Error:", error);
    return res.status(500).json({ success: false, error: "Failed to fetch resource" });
  }
};

export const deleteMyResource = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    const resource = await Resource.findOne({
      _id: req.params.id,
      uploaderId: req.user._id,
    });
    if (!resource) {
      res.status(404).json({ success: false, error: "Resource not found" });
      return;
    }

    await deleteFromCloudinary(resource.cloudinaryPublicId);
    await resource.deleteOne();

    res.status(200).json({ success: true, message: "Resource removed" });
  } catch (error) {
    console.error("Delete Resource Error:", error);
    res.status(500).json({ success: false, error: "Failed to remove resource" });
  }
};

export const voteResource = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    const { voteType } = req.body; // Expects "up" or "down"
    const userId = req.user._id;

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      res.status(404).json({ success: false, error: "Resource not found" });
      return;
    }

    // Convert ObjectIds to strings for accurate comparison
    const upvotedStr = resource.likedBy.map((id) => id.toString());
    const downvotedStr = resource.dislikedBy.map((id) => id.toString());
    const userStr = userId.toString();

    // Remove user from both arrays initially to reset their state
    resource.likedBy = resource.likedBy.filter(
      (id) => id.toString() !== userStr,
    );
    resource.dislikedBy = resource.dislikedBy.filter(
      (id) => id.toString() !== userStr,
    );

    if (voteType === "up") {
      if (!upvotedStr.includes(userStr)) {
        // Add to upvotes if they hadn't already upvoted
        resource.likedBy.push(userId);
      }
    } else if (voteType === "down") {
      if (!downvotedStr.includes(userStr)) {
        // Add to downvotes if they hadn't already downvoted
        resource.dislikedBy.push(userId);
      }
    }

    // Update counts
    resource.likes = resource.likedBy.length;
    resource.dislikes = resource.dislikedBy.length;

    await resource.save();

    res.status(200).json({
      success: true,
      data: {
        likes: resource.likes,
        dislikes: resource.dislikes,
        userVote: voteType === "up" && !upvotedStr.includes(userStr) ? "up" :
                  voteType === "down" && !downvotedStr.includes(userStr) ? "down" : null
      },
    });
  } catch (error) {
    console.error("Vote Resource Error:", error);
    res.status(500).json({ success: false, error: "Failed to process vote" });
  }
};
