import mongoose from "mongoose";
import User from "../models/User.js";
import Slot from "../models/Slot.js";
import Booking from "../models/Booking.js";

export default async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is missing. Copy .env.example to .env and configure it.");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  // Wait for indexes, including the unique active-booking index, before accepting requests.
  await Promise.all([User.init(), Slot.init(), Booking.init()]);
  console.logh`MongoDB connected: ${mongoose.connection.name}`);
}
