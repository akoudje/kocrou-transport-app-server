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
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Accès refusé : aucun token fourni", errorCode: "NO_TOKEN" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // Token expiré → retourne un code spécifique pour que le front puisse tenter un refresh
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "Token expiré", errorCode: "TOKEN_EXPIRED", error: err.message });
      }
      // Token invalide (tampered, malformed, etc.)
      return res
        .status(401)
        .json({ message: "Token invalide", errorCode: "TOKEN_INVALID", error: err.message });
    }

    // Récupère l'utilisateur en DB (sans password)
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res
        .status(401)
        .json({ message: "Utilisateur introuvable", errorCode: "USER_NOT_FOUND" });
    }

    // Attach user
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Erreur middleware protect:", err);
    // Cas générique
    return res.status(401).json({ message: "Accès refusé", errorCode: "AUTH_ERROR", error: err.message });
  }
};

/**
 * adminOnly
 * - Autorise uniquement si req.user existe et a isAdmin === true
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res
    .status(403)
    .json({ message: "Accès refusé (administrateur uniquement)", errorCode: "ADMIN_REQUIRED" });
};
