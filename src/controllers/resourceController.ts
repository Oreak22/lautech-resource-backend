import { Response, Request } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { streamUpload } from "../utils/streamUpload";
import { analyzeStudyMaterial } from "../utils/aiAnalyzer";
import { Resource, ResourceStatus } from "../models/Resource";
import { UserRole } from "../models/User";

export const uploadResourceFile = async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, courseId, lecturerId } = req.body;
    const user = req.user!; // Extracted from protect middleware

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
      page = "1",
      limit = "10",
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
    if (courseId) query.courseId = String(courseId);
    if (lecturerId) query.lecturerId = String(lecturerId);

    // 4. Pagination Setup
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // 5. Execute Query with Populated References
    const resources = await Resource.find(query)
      .populate("courseId", "courseCode title") // Fetch course details
      .populate("lecturerId", "name") // Fetch lecturer name
      .select("-__v -moderatedBy") // Hide internal fields
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limitNumber);

    // 6. Get total count for frontend pagination UI
    const total = await Resource.countDocuments(query);

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
