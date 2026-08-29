import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // 1. Ensure user exists (protect middleware should have caught this, but TS needs to know)
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authorized" });
      return;
    }

    // 2. Check if the user's role exists in the permitted roles array
    if (!req.user.role || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "User role is not authorized to access this route",
      });
      return;
    }

    // 3. Authorized
    return next();
  };
};
