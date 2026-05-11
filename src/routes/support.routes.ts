import { Router } from "express";
import { createTicket } from "../controllers/support.controller";

const router = Router();

// Public — anyone can submit a ticket (no auth required)
router.post("/", createTicket);

export default router;
