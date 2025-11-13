// backend/models/Trajets.js
import mongoose from "mongoose";

/**
 * =======================================================
 * 🔹 Schéma des segments (tronçons intermédiaires)
 * =======================================================
 */
const segmentSchema = new mongoose.Schema({
  depart: {
    type: String,
    required: [true, "La ville de départ du segment est obligatoire."],
    trim: true,
  },
  arrivee: {
    type: String,
    required: [true, "La ville d’arrivée du segment est obligatoire."],
    trim: true,
  },
  prix: {
    type: Number,
    required: [true, "Le prix du segment est obligatoire."],
    min: [200, "Le prix minimal d’un segment est 200 FCFA."],
  },
});

/**
 * =======================================================
 * 🔹 Schéma principal du trajet (ligne principale)
 * =======================================================
 */
const trajetSchema = new mongoose.Schema(
  {
    compagnie: {
      type: String,
      required: [true, "Le nom de la compagnie est obligatoire."],
      default: "Kocrou Transport & Frères",
      trim: true,
    },

    /* 🚏 Ligne principale */
    villeDepart: {
      type: String,
      required: [true, "La ville de départ principale est obligatoire."],
      trim: true,
    },
    villeArrivee: {
      type: String,
      required: [true, "La ville d’arrivée principale est obligatoire."],
      trim: true,
    },

    /* 🕒 Horaires */
    dateDepart: {
      type: Date,
      required: [true, "La date de départ est requise."],
    },
    heureDepart: {
      type: String,
      required: [true, "L’heure de départ est obligatoire."],
      match: [/^\d{2}:\d{2}$/, "L'heure de départ doit être au format HH:mm."],
    },
    heureArrivee: {
      type: String,
      default: null,
    },

    /* 💰 Tarification principale */
    prix: {
      type: Number,
      required: [true, "Le prix principal du trajet est obligatoire."],
      min: [1000, "Le prix minimal est de 1000 FCFA."],
    },

    /* 🔹 Liste des segments optionnels */
    segments: {
      type: [segmentSchema],
      default: [],
    },

    /* 🧮 Prix total = somme des segments ou prix principal */
    prixTotal: {
      type: Number,
      default: 0,
    },

    /* 🧍 Capacités */
    nombrePlaces: {
      type: Number,
      required: [true, "Le nombre de places est obligatoire."],
      min: [10, "Un véhicule doit avoir au moins 10 sièges."],
      max: [60, "Le maximum est de 60 sièges."],
      default: 10,
    },

    /* 🟩 Places restantes (calculées automatiquement) */
    placesRestantes: {
      type: Number,
      default: function () {
        return this.nombrePlaces;
      },
      min: [0, "Aucune place restante disponible."],
    },

    /* 🚐 Type de véhicule */
    typeVehicule: {
      type: String,
      enum: ["Autocar", "Minibus", "Bus VIP", "Autre"], // Casse respectée
      default: "Autocar",
      set: (v) => {
        // 🔥 Convertit en format normalisé (première lettre en majuscule)
        if (!v) return v;
        const lower = v.toLowerCase();
        const capitalize = lower.charAt(0).toUpperCase() + lower.slice(1);
        return capitalize;
      },
    },

    /* ✅ Statut actif/inactif */
    actif: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

/**
 * =======================================================
 * 🧮 Middleware : recalcul automatique du prixTotal et cohérence des places
 * =======================================================
 */
trajetSchema.pre("save", function (next) {
  // 🔹 Calcul dynamique du prixTotal (somme des segments ou prix principal)
  if (this.segments && this.segments.length > 0) {
    this.prixTotal = this.segments.reduce((sum, seg) => sum + (seg.prix || 0), 0);
  } else {
    this.prixTotal = this.prix;
  }

  // 🔹 Éviter les incohérences sur le nombre de places restantes
  if (this.placesRestantes > this.nombrePlaces) {
    this.placesRestantes = this.nombrePlaces;
  }
  if (this.placesRestantes < 0) {
    this.placesRestantes = 0;
  }

  next();
});

/**
 * =======================================================
 * 🔎 Méthode utilitaire : trouver un segment précis
 * =======================================================
 */
trajetSchema.methods.findSegment = function (depart, arrivee) {
  return this.segments.find(
    (s) =>
      s.depart.toLowerCase() === depart.toLowerCase() &&
      s.arrivee.toLowerCase() === arrivee.toLowerCase()
  );
};

/**
 * =======================================================
 * 🧭 Virtual : description complète du trajet
 * =======================================================
 */
trajetSchema.virtual("description").get(function () {
  return `${this.villeDepart} → ${this.villeArrivee} (${this.typeVehicule})`;
});

/**
 * =======================================================
 * 🪄 Virtual : afficher le type de trajet
 * =======================================================
 * Ex: "Trajet principal" ou "Segment de Abidjan → Yamoussoukro"
 */
trajetSchema.virtual("typeTrajet").get(function () {
  return this.segments.length > 0 ? "Trajet avec segments" : "Trajet simple";
});

export default mongoose.model("Trajet", trajetSchema);
