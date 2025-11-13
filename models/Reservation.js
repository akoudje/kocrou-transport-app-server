// server/models/Reservation.js
import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔹 Trajet réservé (inclus le trajet principal ou un segment)
    trajet: {
      compagnie: { type: String, required: true, trim: true },
      villeDepart: { type: String, required: true, trim: true },
      villeArrivee: { type: String, required: true, trim: true },
      heureDepart: { type: String },
      heureArrivee: { type: String },
      prix: { type: Number, required: true },
    },

    // 🔹 Numéro de siège
    seat: {
      type: Number,
      required: true,
      min: [1, "Le numéro de siège doit être supérieur à 0"],
    },

    // 🔹 Statut de la réservation
    statut: {
      type: String,
      enum: ["confirmée", "annulée", "en_attente"],
      default: "confirmée",
    },

    // 🔹 Date de la réservation
    dateReservation: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

//
// 🔍 Indexation MongoDB optimisée
// ------------------------------------------------------------
// Permet d’accélérer les vérifications de conflits
//
reservationSchema.index(
  {
    "trajet.compagnie": 1,
    "trajet.villeDepart": 1,
    "trajet.villeArrivee": 1,
    seat: 1,
    statut: 1,
  },
  { name: "unique_seat_per_segment" }
);

reservationSchema.index({ user: 1, "trajet.compagnie": 1 });
reservationSchema.index({ "trajet.villeDepart": 1, "trajet.villeArrivee": 1 });

//
// 🔐 Middleware pré-sauvegarde : validation de cohérence
//
reservationSchema.pre("save", function (next) {
  if (!this.trajet.villeDepart || !this.trajet.villeArrivee) {
    return next(new Error("Les informations de trajet sont incomplètes."));
  }

  if (this.trajet.villeDepart === this.trajet.villeArrivee) {
    return next(new Error("Les villes de départ et d’arrivée doivent être différentes."));
  }

  next();
});

//
// 🧩 Méthode utilitaire : format de réponse propre
//
reservationSchema.methods.toPublicJSON = function () {
  const { __v, ...data } = this.toObject();
  return data;
};

export default mongoose.model("Reservation", reservationSchema);

