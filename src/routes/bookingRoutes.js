import { Router } from "express";
import { cancelBooking, createBooking, listMyBookings } from "../controllers/bookingController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { bookingIdParamSchema, createBookingSchema } from "../validators/bookingSchemas.js";

const router = Router();
router.use(authenticate);
router.get("/mine", listMyBookings);
router.post("/", authorize("user"), validateRequest(createBookingSchema), createBooking);
router.post("/:bookingId/cancel", validateRequest(bookingIdParamSchema, "params"), cancelBooking);
export default router;
