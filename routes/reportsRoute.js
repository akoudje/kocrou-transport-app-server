// server/routes/reportsRoute.js
import express from "express";
import {
  getReports,
  getLogs,
  deleteLogs, // ✅ il manquait cette importation
} from "../controllers/reportsController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// 📊 Rapports principaux
router.get("/", protect, adminOnly, getReports);

// 🧾 Journaux d’activité
router.get("/logs", protect, adminOnly, getLogs);
router.delete("/logs", protect, adminOnly, deleteLogs);

export default router;
