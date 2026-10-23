import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import resourceRoutes from "./routes/resourceRoutes";
import authRoutes from "./routes/authRoutes";
import adminRoutes from "./routes/adminRoutes";
import courseRouter from "./routes/courseRouter";
import lecturersRouter from "./routes/lecturersRouter";
import reviewRoutes from "./routes/reviewRoutes";
import departmentRoutes from "./routes/departmentRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import reportRoutes from "./routes/reportRoutes";
import resourceListRoutes from "./routes/resourceListRoutes";

dotenv.config();
connectDB();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// 1. Security Middleware
app.use(helmet()); // Sets secure HTTP headers
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://lautech-resource.vercel.app",
    credentials: true,
  }),
);

// 2. Rate Limiting (Prevents brute-force and DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// 3. Body Parsing Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "API is running securely." });
});

app.use("/api/auth", authRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/courses", courseRouter);
app.use("/api/lecturers", lecturersRouter);
app.use("/api/reviews", reviewRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/lists", resourceListRoutes);

app.listen(PORT, () => {
  console.log(
    `Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`,
  );
});
