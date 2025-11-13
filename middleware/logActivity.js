// server/middleware/logActivity.js
import Log from "../models/Logs.js";

/**
 * Middleware et utilitaires pour journaliser les actions Admin/System.
 *
 * Chaque log contient :
 *  - user (référence utilisateur)
 *  - type : "info" | "warning" | "error" | "security" | "login" | "trajet_update" | "trajet_delete" | "reservation_cancel"
 *  - action : courte description
 *  - details : texte libre (ex: nom du trajet, ID, etc.)
 */

// 🔹 Fonction utilitaire
export const createLog = async ({
  user = null,
  type = "info",
  action = "Action inconnue",
  details = "",
}) => {
  try {
    await Log.create({ user, type, action, details });
  } catch (err) {
    console.error("⚠️ Erreur lors de la création du log :", err.message);
  }
};

// 🔹 Middleware express à usage direct
export const logActivity = (type, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user?._id || null;
      const name = req.user?.name || "Système";

      await Log.create({
        user,
        type,
        action,
        details: `${name} a effectué une action : ${action}`,
      });
    } catch (err) {
      console.error("⚠️ Erreur dans logActivity middleware :", err.message);
    }
    next();
  };
};
