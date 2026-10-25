import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

export function notFound(req, _res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof SyntaxError && Object.hasOwn(err, "body")) {
    return res.status(400).json({ error: { message: "Invalid JSON request body" } });
  }
  if (err instanceof ApiError) {
    const error = { message: err.message };
    if (err.details) error.details = err.details;
    return res.status(err.statusCode).json({ error });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map(({ path, message }) => ({ field: path, message }));
    return res.status(400).json({ error: { message: "Database validation failed", details } });
  }
  if (err instanceof mongoose.Error.CastError || err?.name === "BSONError") {
    return res.status(400).json({ error: { message: "Invalid resource ID or value" } });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: { message: "A conflicting record already exists" } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: "Internal server error" } });
}
