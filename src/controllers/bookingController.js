import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Slot from "../models/Slot.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createBooking = asyncHandler(async (req, res) => {
  const { slotId } = req.body;
  if (!mongoose.isValidObjectId(slotId)) throw new ApiError(400, "Invalid slotID");

  const slot = await Slot.findById(slotId).exec();
  if (!slot) throw new ApiError(404, "Slot not found");
  if (slot.startTime <= new Date()) throw new ApiError(409, "This slot is no longer in the future");

  try {
    const booking = await Booking.create({
      userId: req.user._id,
      providerId: slot.providerId,
      slotId: slot._id,
      status: "booked"
    });
    await booking.populate([
      { path: "userId", select: "name email" },
      { path: "providerId", select: "name email" },
      { path: "slotId" }
    ]);
    return res.status(201).json({ data: booking });
  } catch (error) {
    if (error?.code === 11000) {
      throw new ApiError(409, "This slot has already been booked");
    }
    throw error;
  }
});

export const listMyBookings = asyncHandler(async (req, res) => {
  const filter = req.user.role === "provider"
    ? { providerId: req.user._id }
    : { userId: req.user._id };
  const bookings = await Booking.find(filter)
    .populate("userId", "name email")
    .populate("providerId", "name email")
    .populate("slotId")
    .sort({ createdAt: -1 })
    .exec();
  res.json({ data: bookings, total: bookings.length });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingId } = req.params;
  if (!mongoose.isValidObjectId(bookingId)) throw new ApiError(400, "Invalid booking ID");
  const booking = await Booking.findById(bookingId).exec();
  if (!booking) throw new ApiError(404, "Booking not found");

  const isBookingUser = String(booking.userId) === String(req.user._id);
  const isBookingProvider = String(booking.providerId) === String(req.user._id) && req.user.role === "provider";
  if (!isBookingUser && !isBookingProvider) throw new ApiError(403, "You can only cancel your own booking or a booking for your slots");
  if (booking.status !== "booked") throw new ApiError(409, "Booking has already been cancelled");

  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "booked" },
    { $set: { status: "cancelled", cancelledAt: new Date() } },
    { new: true }
  ).exec();
  if (!cancelled) throw new ApiError(409, "Booking has already been cancelled");
  res.json({ message: "Booking cancelled", data: cancelled });
});
