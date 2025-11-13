// server/controllers/reportsController.js
import Reservation from "../models/Reservation.js";
import Log from "../models/Logs.js"; // ✅ <-- manquait ici !
import mongoose from "mongoose";

/**
 * GET /api/reports
 * Query params:
 *   - month (format YYYY-MM) optional
 *
 * Réponse:
 * {
 *   totalReservations,
 *   totalRevenue,
 *   validatedCount,
 *   cancelledCount,
 *   dailyStats: [{ date, confirmées, annulées }],
 *   reservations: [...]
 * }
 */
export const getReports = async (req, res) => {
  try {
    const { month } = req.query;

    // Filtre de base
    const filter = {};

    // Si un mois est fourni (ex: 2025-11)
    if (month) {
      const [y, m] = month.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        filter.createdAt = { $gte: start, $lt: end };
      }
    }

    // Totaux simples
    const totalReservations = await Reservation.countDocuments(filter);

    const revenueAgg = await Reservation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: { $ifNull: ["$trajet.prix", 0] } },
        },
      },
    ]);

    const totalRevenue = revenueAgg.length ? revenueAgg[0].totalRevenue : 0;

    const validatedCount = await Reservation.countDocuments({
      ...filter,
      statut: "validée",
    });

    const cancelledCount = await Reservation.countDocuments({
      ...filter,
      statut: "annulée",
    });

    // Statistiques journalières
    const dailyAgg = await Reservation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          confirmees: {
            $sum: {
              $cond: [{ $eq: ["$statut", "confirmée"] }, 1, 0],
            },
          },
          annulees: {
            $sum: {
              $cond: [{ $eq: ["$statut", "annulée"] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dailyStats = dailyAgg.map((d) => ({
      date: d._id,
      confirmées: d.confirmees || 0,
      annulées: d.annulees || 0,
    }));

    // Réservations récentes
    const reservations = await Reservation.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.status(200).json({
      success: true,
      totalReservations,
      totalRevenue,
      validatedCount,
      cancelledCount,
      dailyStats,
      reservations,
    });
  } catch (error) {
    console.error("❌ Erreur getReports :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors du calcul des rapports.",
    });
  }
};

/**
 * GET /api/reports/logs
 * Retourne les journaux d’activité
 */
export const getLogs = async (req, res) => {
  try {
    const logs = await Log.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("❌ Erreur getLogs :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la récupération des logs.",
    });
  }
};

/**
 * DELETE /api/reports/logs
 * Supprime tous les journaux (utilisé par AdminLogs -> “Tout effacer”)
 */
export const deleteLogs = async (req, res) => {
  try {
    // 🔹 Crée un log avant suppression (utile pour audit)
    await Log.create({
      user: req.user?._id,
      type: "security",
      action: "Purge des journaux d’activité",
      details: `${req.user?.name || "Un administrateur"} a effacé tous les logs.`,
    });

    // 🔹 Supprime tous les logs sauf celui-ci
    const lastLog = await Log.findOne()
      .sort({ createdAt: -1 })
      .lean();
    await Log.deleteMany({ _id: { $ne: lastLog._id } });

    return res.status(200).json({
      success: true,
      message: "Tous les journaux ont été supprimés (trace de purge conservée).",
    });
  } catch (error) {
    console.error("❌ Erreur deleteLogs :", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression des logs.",
    });
  }
};
