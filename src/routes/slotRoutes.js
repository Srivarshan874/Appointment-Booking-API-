import { Router } from "express";
import { createSlot, getSlot, listAvailableSlots, listMySlots } from "../controllers/slotController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { availableSlotsQuerySchema, createSlotSchema, objectIdParamSchema } from "../validators/slotSchemas.js";

const router = Router();
router.get("/available", validateRequest(availableSlotsQuerySchema, "query"), listAvailableSlots);
router.get("/mine", authenticate, authorize("provider"), listMySlots);
router.post("/", authenticate, authorize("provider"), validateRequest(createSlotSchema), createSlot);
router.get("/:slotId", validateRequest(objectIdParamSchema, "params"), getSlot);
export default router;
