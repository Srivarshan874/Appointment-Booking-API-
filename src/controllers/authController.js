import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { publicUser } from "../utils/publicUser.js";

function signToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new ApiError(500, "JWT_SECRET is not configured");
  return jwt.sign({ sub: String(user._id), role: user.role }, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h"
  });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role = "user" } = req.body;
  const normalizedEmail = email.toLowerCase().trim();
  const exists = await User.exists({ email: normalizedEmail });
  if (exists) throw new ApiError(409, "An account with this email already exists");

  const rounds = Number.parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
  const passwordHash = await bcrypt.hash(password, rounds);
  let user;
  try {
    user = await User.create({ name, email: normalizedEmail, passwordHash, role });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "An account with this email already exists");
    throw error;
  }

  res.status(201).json({ user: publicUser(user), token: signToken(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+passwordHash").exec();
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, "Email or password is incorrect");
  }
  res.json({ user: publicUser(user), token: signToken(user) });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
