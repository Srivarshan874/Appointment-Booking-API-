import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw new ApiError(401, "A Bearer token is required");
  if (!process.env.JWT_SECRET) throw new ApiError(500, "JWT_SECRET is not configured");

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, "Token is invalid or expired");
  }

  const user = await User.findById(payload.sub).select("name email role").exec();
  if (!user) throw new ApiError(401, "The token user no longer exists");
  req.user = user;
  next();
});

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Authentication is required"));
    if (!roles.includes(req.user.role)) return next(new ApiError(403, "You do not have permission to perform this action"));
    next();
  };
}
