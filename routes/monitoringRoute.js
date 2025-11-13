import express from "express";
import { getMonitoringData } from "../controllers/monitoringController.js";

const router = express.Router();

// 🔹 GET /api/monitoring
router.get("/", getMonitoringData);

export default router;
