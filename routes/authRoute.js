// server/routes/authRoute.js
import express from "express";
import {
  registerUser,
  loginUser,
  refreshToken,
  getProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🧾 Inscription (publique)
router.post("/register", registerUser);

// 🔐 Connexion (publique)
router.post("/login", loginUser);

// 🔄 Rafraîchir le token (publique)
router.post("/refresh", refreshToken);

// 👤 Profil utilisateur connecté (protégé)
router.get("/me", protect, getProfile);

export default router;




