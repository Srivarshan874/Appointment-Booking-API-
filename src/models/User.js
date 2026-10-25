import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    minlength: [2, "Name must contain at least 2 characters"],
    maxlength: [80, "Name cannot exceed 80 characters"]
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    lowercase: true,
    trim: true,
    unique: true,
    maxlength: [254, "Email is too long"]
  },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "provider"], default: "user", required: true }
}, { timestamps: true, versionKey: false });

export default mongoose.model("User", userSchema);
