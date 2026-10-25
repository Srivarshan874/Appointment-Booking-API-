import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createSlot = asyncHandler(async (req, res) => {
  const { startTime, endTime, location = "Online", notes = "" } = req.body;
  if (new Date(startTime) <= new Date()) throw new ApiError(400, "startTime must be in the future");
  if (new Date(endTime) <= new Date(startTime)) throw new ApiError(400, "endTime must be after startTime");

  const overlap = await Slot.findOne({
    providerId: req.user._id,
    startTime: { $lt: new Date(endTime) },
    endTime: { $gt: new Date(startTime) }
  }).lean().exec();
  if (overlap) throw new ApiError(409, "This slot overlaps an existing slot for the provider");

  try {
    const slot = await Slot.create({ providerId: req.user._id, startTime, endTime, location, notes });
    res.status(201).json({ data: slot });
  } catch (error) {
    if (error?.code === 11000) throw new ApiError(409, "A slot with this provider and start time already exists");
    throw error;
  }
});

export const listMySlots = asyncHandler(async (req, res) => {
  const slots = await Slot.find({ providerId: req.user._id }).sort({ startTime: 1 }).exec();
  res.json({ data: slots, total: slots.length });
});

export const listAvailableSlots = asyncHandler(async (req, res) => {
  const { providerId, from, to, limit = 50 } = req.validatedQuery ?? req.query;
  const filter = { startTime: { $gt: new Date() } };
  if (providerId) {
    if (!mongoose.isValidObjectId(providerId)) throw new ApiError(400, "providerId must be a valid MongoDB ObjectId");
    filter.providerId = new mongoose.Types.ObjectId(providerId);
  }
  if (from) filter.startTime.$gte = new Date(from);
  if (to) filter.startTime.$lt = new Date(to);

  // Filter out active bookings inside MongoDB before applying the limit. This avoids
  // returning too few slots when the earliest candidate slots are already booked.
  const available = await Slot.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: Booking.collection.name,
        let: { candidateSlotId: "$_id" },
        pipeline: [
          { $match: { $expr: { $and: [
            { $eq: ["$slotId", "$$candidateSlotId"] },
            { $eq: ["$status", "booked"] }
          ] } } },
          { $limit: 1 }
        ],
        as: "activeBookings"
      }
    },
    { $match: { "activeBookings.0": { $exists: false } } },
    { $sort: { startTime: 1 } },
    { $limit: Number(limit) },
    { $project: { activeBookings: 0 } }
  ]).exec();
  res.json( { data: available, total: available.length });
});

export const getSlot = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.slotId)) throw new ApiError(400, "Invalid slot ID");
  const slot = await Slot.findById(req.params.slotId).populate("providerId", "name email").exec();
  if (!slot) throw new ApiError(404, "Slot not found");
  const isBooked = await Booking.exists({ slotId: slot._id, status: "booked" });
  res.json({ data: slot, available: slot.startTime > new Date() && !isBooked });
});
