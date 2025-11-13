import express from "express";
import multer from "multer";
import Settings from "../models/Settings.js";

const router = express.Router();

// Simple configuration upload (fichier logo)
const upload = multer({ dest: "uploads/" });

// GET - Récupère les paramètres
router.get("/", async (req, res) => {
  const settings = await Settings.findOne();
  res.json(settings || {});
});

// PUT - Met à jour les paramètres
router.put("/", async (req, res) => {
  const updated = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
  res.json(updated);
});

// POST - Upload logo
router.post("/upload", upload.single("logo"), (req, res) => {
  const fileUrl = `http://localhost:5000/${req.file.path}`;
  res.json({ url: fileUrl });
});

export default router;
