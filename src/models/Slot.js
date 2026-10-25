import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: { type: String, trim: true, maxlength: [160, "Location cannot exceed 160 characters"], default: "Online" },
  notes: { type: String, trim: true, maxlength: [500, "Notes cannot exceed 500 characters"], default: "" }
}, { timestamps: true, versionKey: false });

slotSchema.index({ providerId: 1, startTime: 1 }, { unique: true, name: "unique_provider_slot_start" });
slotSchema.index({ startTime: 1, endTime: 1 });

slotSchema.pre("validate", function validateSlotTime(next) {
  if (this.startTime && this.endTime && this.endTime <= this.startTime) {
    this.invalidate("endTime", "endTime must be after startTime");
  }
  next();
});

export default mongoose.model("Slot", slotSchema);
