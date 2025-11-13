import Settings from "../models/Settings.js";
import multer from "multer";
import path from "path";
import fs from "fs";

// 📦 Récupération ou création auto des paramètres
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    console.error("Erreur getSettings:", error);
    res.status(500).json({ message: "Erreur serveur lors du chargement des paramètres." });
  }
};

// 💾 Mise à jour des paramètres
export const updateSettings = async (req, res) => {
  try {
    const data = req.body;
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create(data);
    } else {
      Object.assign(settings, data);
      await settings.save();
    }
    res.json({ message: "Paramètres mis à jour avec succès ✅", data: settings });
  } catch (error) {
    console.error("Erreur updateSettings:", error);
    res.status(500).json({ message: "Erreur lors de la mise à jour des paramètres." });
  }
};

// 📤 Upload du logo (fichier image)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/";
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage }).single("logo");

export const uploadLogo = (req, res) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ message: "Erreur upload du logo" });
    if (!req.file) return res.status(400).json({ message: "Aucun fichier envoyé" });

    const fileUrl = `${process.env.BASE_URL || "https://kocrou-transport-app-server.onrender.com"}/uploads/${req.file.filename}`;

    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create({ logo: fileUrl });
      } else {
        settings.logo = fileUrl;
        await settings.save();
      }
      res.json({ message: "Logo mis à jour avec succès", url: fileUrl });
    } catch (error) {
      console.error("Erreur uploadLogo:", error);
      res.status(500).json({ message: "Erreur serveur lors de l’upload du logo." });
    }
  });
};
