import Joi from "joi";

export const createBookingSchema = Joi.object({
  slotId: Joi.string().hex().length(24).required()
}).required();

export const bookingIdParamSchema = Joi.object({
  bookingId: Joi.string().hex().length(24).required()
}).unknown(true);
