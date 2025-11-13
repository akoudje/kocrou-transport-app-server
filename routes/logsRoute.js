import express from "express";
import Log from "../models/Log.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 GET - Récupérer les logs
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { type } = req.query;
    const query = type && type !== "all" ? { type } : {};
    const logs = await Log.find(query).populate("user").sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    console.error("Erreur logs :", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

export default router;
