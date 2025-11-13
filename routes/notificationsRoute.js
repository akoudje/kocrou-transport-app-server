import express from "express";
import Notification from "../models/Notification.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET - Liste des notifications récentes
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const notifs = await Notification.find().sort({ createdAt: -1 }).limit(30);
    res.json(notifs);
  } catch (err) {
    console.error("Erreur notifications :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
