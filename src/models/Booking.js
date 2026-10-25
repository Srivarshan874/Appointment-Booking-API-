import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: "Slot", required: true },
  status: { type: String, enum: ["booked", "cancelled"], default: "booked", required: true },
  cancelledAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

// The database, not only application code, enforces one active booking per slot.
// Cancelling changes status to "cancelled", releasing the slot for another booking.
bookingSchema.index(
  { slotId: 1 },
  { unique: true, partialFilterExpression: { status: "booked" }, name: "one_active_booking_per_slot" }
);
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
