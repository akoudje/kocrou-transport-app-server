// backend/routes/trajetsRoute.js
import express from "express";
import {
  createTrajet,
  getAllTrajets,
  getTrajetById,
  updateTrajet,
  deleteTrajet,
  addSegment,
  updateSegment,
  deleteSegment,
} from "../controllers/trajetController.js";

const router = express.Router();

/**
 * =======================================================
 * 🚍 TRAJETS PRINCIPAUX
 * =======================================================
 */

// 🆕 Créer un trajet
router.post("/", createTrajet);

// 📋 Obtenir tous les trajets (avec filtres facultatifs ?depart=...&arrivee=...)
router.get("/", getAllTrajets);

// 🔍 Obtenir un trajet par son ID
router.get("/:id", getTrajetById);

// ✏️ Mettre à jour un trajet
router.put("/:id", updateTrajet);

// ❌ Supprimer un trajet
router.delete("/:id", deleteTrajet);

/**
 * =======================================================
 * 🧩 SEGMENTS (sous-trajets)
 * =======================================================
 */

// ➕ Ajouter un segment à un trajet donné
router.post("/:trajetId/segments", addSegment);

// ✏️ Modifier un segment spécifique
router.put("/:trajetId/segments/:segmentId", updateSegment);

// ❌ Supprimer un segment spécifique
router.delete("/:trajetId/segments/:segmentId", deleteSegment);

export default router;
