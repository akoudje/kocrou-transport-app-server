// server/models/Log.js
import mongoose from "mongoose";

/**
 * Schéma unifié pour les journaux d’activité (admin et système)
 * Compatible avec AdminLogs + reportsController
 */
const logSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // pour logs système
    },

    // Type de log
    type: {
      type: String,
      enum: [
        "login",
        "trajet_update",
        "trajet_delete",
        "reservation_cancel",
        "info",
        "warning",
        "error",
        "security",
      ],
      default: "info",
    },

    // ✅ Champ texte principal
    action: {
      type: String,
      required: true,
      trim: true,
    },

    // ✅ Détails complémentaires (optionnels)
    details: {
      type: String,
      default: "",
      trim: true,
    },

    // Ancien champ `description` est fusionné dans action/détails
    description: {
      type: String,
      default: "",
      trim: true,
    },

    // (Optionnel) infos contextuelles
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// 🔹 Index utile pour les requêtes récentes
logSchema.index({ createdAt: -1 });

export default mongoose.model("Log", logSchema);

