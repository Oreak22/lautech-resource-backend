import { Response } from "express";
import { Types } from "mongoose";
import { AuthRequest } from "../middlewares/authMiddleware";
import { Resource, ResourceStatus } from "../models/Resource";
import Review from "../models/Review";
import { Report, ReportStatus, ReportTargetType } from "../models/Report";
import { deleteFromCloudinary } from "../utils/cloudinary";

const resourceReasons = [
  "non_academic",
  "incorrect_file",
  "copyright",
  "inappropriate",
  "broken_file",
  "other",
];
const reviewReasons = [
  "harassment",
  "spam",
  "misinformation",
  "personal_information",
  "other",
];

export const createReport = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Sign in to submit a report" });
  }

  const { targetType, targetId, reason, details } = req.body ?? {};
  if (!Object.values(ReportTargetType).includes(targetType)) {
    return res.status(400).json({ success: false, error: "Choose a valid item to report" });
  }
  if (!Types.ObjectId.isValid(String(targetId))) {
    return res.status(400).json({ success: false, error: "Invalid item" });
  }
  if (typeof reason !== "string") {
    return res.status(400).json({ success: false, error: "Choose a report reason" });
  }
  if (details !== undefined && typeof details !== "string") {
    return res.status(400).json({ success: false, error: "Report details must be text" });
  }
  if (typeof details === "string" && details.trim().length > 1000) {
    return res.status(400).json({ success: false, error: "Details must be 1000 characters or fewer" });
  }

  const allowedReasons = targetType === ReportTargetType.RESOURCE ? resourceReasons : reviewReasons;
  if (!allowedReasons.includes(reason)) {
    return res.status(400).json({ success: false, error: "Choose a valid report reason" });
  }

  try {
    let targetLabel = "";
    let targetContext = "";

    if (targetType === ReportTargetType.RESOURCE) {
      const resource = await Resource.findById(targetId)
        .populate("courseId", "courseCode")
        .select("title category uploaderId courseId status")
        .lean();
      if (!resource || resource.status !== ResourceStatus.APPROVED) {
        return res.status(404).json({ success: false, error: "Resource not found" });
      }
      if (String(resource.uploaderId) === String(req.user._id)) {
        return res.status(400).json({ success: false, error: "You cannot report your own resource" });
      }
      targetLabel = resource.title;
      const course = resource.courseId as unknown as { courseCode?: string };
      targetContext = `${course?.courseCode || "Course"} · ${resource.category}`;
    } else {
      const review = await Review.findById(targetId)
        .populate("lecturer", "name")
        .select("lecturer user courseCode content")
        .lean();
      if (!review) {
        return res.status(404).json({ success: false, error: "Review not found" });
      }
      if (String(review.user) === String(req.user._id)) {
        return res.status(400).json({ success: false, error: "You cannot report your own review" });
      }
      const lecturer = review.lecturer as unknown as { name?: string };
      targetLabel = `${review.courseCode} review`;
      targetContext = `For ${lecturer?.name || "a lecturer"}: ${review.content.slice(0, 240)}`;
    }

    const existingReport = await Report.findOne({
      targetType,
      targetId,
      reporterId: req.user._id,
      status: ReportStatus.PENDING,
    }).select("_id");
    if (existingReport) {
      return res.status(409).json({
        success: false,
        error: "You have already reported this item. The report is being reviewed.",
      });
    }

    await Report.create({
      targetType,
      targetId,
      targetLabel,
      targetContext,
      reporterId: req.user._id,
      reason,
      details: typeof details === "string" ? details.trim() : "",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted. Our team will review it.",
    });
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({ success: false, error: "Could not submit report" });
  }
};

export const getMyReports = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Not authorized" });
  }

  try {
    const reports = await Report.find({ reporterId: req.user._id })
      .select("targetType targetId targetLabel targetContext reason details status resolutionNote createdAt reviewedAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    console.error("Get my reports error:", error);
    return res.status(500).json({ success: false, error: "Could not load your reports" });
  }
};

export const getReports = async (req: AuthRequest, res: Response) => {
  try {
    const requestedStatus = req.query.status ? String(req.query.status) : undefined;
    const validStatuses = Object.values(ReportStatus);
    if (requestedStatus && requestedStatus !== "all" && !validStatuses.includes(requestedStatus as ReportStatus)) {
      return res.status(400).json({ success: false, error: "Invalid report status" });
    }

    const filter = requestedStatus && requestedStatus !== "all"
      ? { status: requestedStatus as ReportStatus }
      : {};
    const reports = await Report.find(filter)
      .populate("reporterId", "name email")
      .sort({ status: 1, createdAt: -1 })
      .lean();

    const resourceIds = reports
      .filter((report) => report.targetType === ReportTargetType.RESOURCE)
      .map((report) => report.targetId);
    const reviewIds = reports
      .filter((report) => report.targetType === ReportTargetType.REVIEW)
      .map((report) => report.targetId);

    const [resources, reviews] = await Promise.all([
      resourceIds.length
        ? Resource.find({ _id: { $in: resourceIds } })
            .populate("courseId", "courseCode title")
            .select("title category status fileUrl courseId")
            .lean()
        : [],
      reviewIds.length
        ? Review.find({ _id: { $in: reviewIds } })
            .populate("lecturer", "name")
            .select("courseCode content authorAlias lecturer")
            .lean()
        : [],
    ]);
    const resourceById = new Map(
      resources.map((resource) => [String(resource._id), resource] as const),
    );
    const reviewById = new Map(
      reviews.map((review) => [String(review._id), review] as const),
    );

    const data = reports.map((report) => ({
      ...report,
      target:
        report.targetType === ReportTargetType.RESOURCE
          ? resourceById.get(String(report.targetId)) ?? null
          : reviewById.get(String(report.targetId)) ?? null,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("Get reports error:", error);
    return res.status(500).json({ success: false, error: "Could not load reports" });
  }
};

export const reviewReport = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Not authorized" });
  }

  const { action, note } = req.body ?? {};
  if (action !== "dismiss" && action !== "remove") {
    return res.status(400).json({ success: false, error: "Choose dismiss or remove" });
  }
  if (note !== undefined && (typeof note !== "string" || note.trim().length > 500)) {
    return res.status(400).json({ success: false, error: "Note must be 500 characters or fewer" });
  }

  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    if (report.status !== ReportStatus.PENDING) {
      return res.status(409).json({ success: false, error: "This report has already been reviewed" });
    }

    if (action === "remove") {
      if (report.targetType === ReportTargetType.RESOURCE) {
        const resource = await Resource.findById(report.targetId);
        if (resource) {
          if (resource.cloudinaryPublicId) {
            await deleteFromCloudinary(resource.cloudinaryPublicId);
          }
          await resource.deleteOne();
        }
      } else {
        await Review.findByIdAndDelete(report.targetId);
      }
    }

    report.status = action === "remove" ? ReportStatus.RESOLVED : ReportStatus.DISMISSED;
    report.resolutionNote = typeof note === "string" && note.trim()
      ? note.trim()
      : action === "remove"
        ? "Reported content removed"
        : "Report dismissed; content kept";
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    if (action === "remove") {
      await Report.updateMany(
        {
          _id: { $ne: report._id },
          targetType: report.targetType,
          targetId: report.targetId,
          status: ReportStatus.PENDING,
        },
        {
          $set: {
            status: ReportStatus.RESOLVED,
            resolutionNote: "Reported content removed",
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
          },
        },
      );
    }

    return res.status(200).json({ success: true, data: report });
  } catch (error) {
    console.error("Review report error:", error);
    return res.status(500).json({ success: false, error: "Could not review report" });
  }
};
