import express from "express";
import {
  createReservation,
  getUserReservations,
  getAllReservations,
  cancelReservation,
  validateReservation,
  deleteReservation,
  getReservedSeats,
} from "../controllers/reservationController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------------
 * ✅ Utilisateur (auth requis)
 * ----------------------------------------------------- */
// Créer une réservation (utilisateur connecté)
router.post("/", protect, createReservation);

// Récupérer les réservations de l'utilisateur connecté
router.get("/", protect, getUserReservations);

// Supprimer / annuler sa réservation (utilisateur)
router.delete("/:id", protect, deleteReservation);

/* -------------------------------------------------------
 * ✅ Admin (protection + rôle)
 * ----------------------------------------------------- */
// Lister toutes les réservations (admin)
router.get("/admin/reservations", protect, adminOnly, getAllReservations);

// Annuler une réservation (admin)
router.put(
  "/admin/reservations/:id/cancel",
  protect,
  adminOnly,
  cancelReservation
);

// Valider une réservation (embarquement) (admin)
router.put(
  "/admin/reservations/:id/validate",
  protect,
  adminOnly,
  validateReservation
);

/* -------------------------------------------------------
 * ✅ Sièges réservés pour un trajet (utilisateur connecté)
 * Retourne les réservations confirmées pour un trajet donné
 * ----------------------------------------------------- */
router.get("/trajet/:id", protect, getReservedSeats);

export default router;

