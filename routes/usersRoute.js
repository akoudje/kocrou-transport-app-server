import express from "express";
import User from "../models/User.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * =======================================================
 * 🔹 GET /api/users
 * @desc  Récupère tous les utilisateurs (admin uniquement)
 * @access Privé (admin)
 * =======================================================
 */
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.error("❌ Erreur récupération utilisateurs :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * =======================================================
 * 🔹 PUT /api/users/:id/promote
 * @desc  Promouvoir un utilisateur en admin
 * @access Privé (admin)
 * =======================================================
 */
router.put("/:id/promote", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    user.isAdmin = true;
    await user.save();

    res.status(200).json({ message: "Utilisateur promu admin ✅", user });
  } catch (error) {
    console.error("❌ Erreur promotion utilisateur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * =======================================================
 * 🔹 DELETE /api/users/:id
 * @desc  Supprime un utilisateur
 * @access Privé (admin)
 * =======================================================
 */
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Utilisateur supprimé ✅" });
  } catch (error) {
    console.error("❌ Erreur suppression utilisateur :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
