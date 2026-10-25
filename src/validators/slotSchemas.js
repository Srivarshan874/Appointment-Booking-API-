import Joi from "joi";

const dateString = Joi.date().iso();

export const createSlotSchema = Joi.object({
  startTime: dateString.required().custom((value, helpers) => {
    if (value <= new Date()) return helpers.error("date.min", { limit: "now" });
    return value;
  }, "start time must be in the future").messages({
    "date.min": "startTime must be in the future"
  }),
  endTime: dateString.required(),
  location: Joi.string().trim().max(160).default("Online"),
  notes: Joi.string().trim().max(500).allow("").default("")
}).custom((value, helpers) => {
  if (value.startTime && value.endTime && value.endTime <= value.startTime) {
    return helpers.error("any.invalid", { message: "endTime must be after startTime" });
  }
  return value;
}).messages({ "any.invalid": "endTime must be after startTime" });

export const availableSlotsQuerySchema = Joi.object({
  providerId: Joi.string().hex().length(24),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  limit: Joi.number().integer().min(1).max(100).default(50)
}).custom((value, helpers) => {
  if (value.from && value.to && value.to <= value.from) return helpers.error("any.invalid");
  return value;
}).messages({ "any.invalid": "to must be after from" });

export const objectIdParamSchema = Joi.object({
  slotId: Joi.string().hex().length(24).required()
}).unknown(true);
