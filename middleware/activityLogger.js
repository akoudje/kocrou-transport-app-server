// server/middleware/activityLogger.js
import Log from "../models/Logs.js";

/**
 * 🧠 Middleware global de surveillance et journalisation
 * Intercepte chaque requête d’un admin et enregistre l’action dans les logs.
 *
 * - Journalise automatiquement : méthode HTTP, URL, utilisateur
 * - Ne log pas les routes de lecture (GET) sauf si explicitement marqué
 */

export const activityLogger = async (req, res, next) => {
  try {
    // On log uniquement les admins authentifiés
    if (!req.user || req.user.role !== "admin") return next();

    // Ignore certaines routes banales
    const ignoredRoutes = ["/api/reports", "/api/reports/logs"];
    if (ignoredRoutes.some((r) => req.originalUrl.startsWith(r))) return next();

    // On ignore les GET par défaut
    if (req.method === "GET") return next();

    // Enregistrer le log
    await Log.create({
      user: req.user._id,
      type: "info",
      action: `${req.method} ${req.originalUrl}`,
      details: `Admin ${req.user.name || req.user.email} a effectué une requête ${req.method} sur ${req.originalUrl}`,
    });
  } catch (error) {
    console.error("⚠️ Erreur activityLogger :", error.message);
  }
  next();
};
