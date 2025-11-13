import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getSettings, updateSettings, uploadLogo } from "../controllers/settingsController.js";

const router = express.Router();

// Récupérer les paramètres
router.get("/", getSettings);

// Mettre à jour les paramètres (protégé)
router.put("/", protect, updateSettings);

// Upload du logo
router.post("/upload-logo", protect, uploadLogo);

export default router;
