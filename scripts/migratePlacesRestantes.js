// backend/scripts/migratePlacesRestantes.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Trajet from "../models/Trajets.js";

dotenv.config();

/**
 * =======================================================
 * 🧭 Script de migration : ajout du champ placesRestantes
 * =======================================================
 */
const migratePlacesRestantes = async () => {
  try {
    console.log("🚀 Connexion à la base MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    console.log("📦 Récupération des trajets...");
    const trajets = await Trajet.find();

    if (trajets.length === 0) {
      console.log("⚠️ Aucun trajet trouvé dans la base.");
      return process.exit(0);
    }

    let updatedCount = 0;

    for (const trajet of trajets) {
      // Si le champ n’existe pas ou est invalide
      if (
        trajet.placesRestantes === undefined ||
        trajet.placesRestantes === null ||
        trajet.placesRestantes > trajet.nombrePlaces ||
        trajet.placesRestantes < 0
      ) {
        trajet.placesRestantes = trajet.nombrePlaces;
        await trajet.save();
        updatedCount++;
        console.log(
          `✅ ${trajet.villeDepart} → ${trajet.villeArrivee} mis à jour (${trajet.placesRestantes} places)`
        );
      }
    }

    console.log(`🎯 Migration terminée avec succès (${updatedCount} trajets mis à jour).`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors de la migration :", error);
    process.exit(1);
  }
};

migratePlacesRestantes();
