// server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

/**
 * protect
 * - Vérifie la présence et la validité d'un JWT Bearer dans Authorization header.
 * - Attache l'utilisateur à req.user (sans password).
 * - Renvoie des réponses 401/403 claires.
 *
 * Erreurs renvoyées (exemples de messages et errorCode que le front peut exploiter) :
 *  - 401 { message: "Accès refusé : aucun token fourni", errorCode: "NO_TOKEN" }
 *  - 401 { message: "Token expiré", errorCode: "TOKEN_EXPIRED" }
 *  - 401 { message: "Token invalide", errorCode: "TOKEN_INVALID" }
 *  - 401 { message: "Utilisateur introuvable", errorCode: "USER_NOT_FOUND" }
 */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers?.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Accès refusé : aucun token fourni", errorCode: "NO_TOKEN" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const errorCode = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "TOKEN_INVALID";
      return res.status(401).json({ message: "Token invalide", errorCode, error: err.message });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable", errorCode: "USER_NOT_FOUND" });
    }

    req.user = user;
    req.isAdmin = user.isAdmin;
    next();
  } catch (err) {
    console.error("❌ Erreur protect:", err);
    return res.status(401).json({ message: "Accès refusé", errorCode: "AUTH_ERROR", error: err.message });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  console.warn("🚫 Refus admin pour :", req.user?.email);
  return res.status(403).json({ message: "Accès refusé (administrateur uniquement)", errorCode: "ADMIN_REQUIRED" });
};
