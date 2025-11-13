// controllers/trajetController.js
import Trajet from "../models/Trajets.js";

/* -------------------------------------------------------------
 * 🟢 Créer un trajet (ligne principale + segments)
 * ----------------------------------------------------------- */
export const createTrajet = async (req, res) => {
  try {
    const {
      compagnie,
      villeDepart,
      villeArrivee,
      dateDepart,
      heureDepart,
      heureArrivee,
      prix, // prix principal
      nombrePlaces,
      typeVehicule,
      segments = [],
    } = req.body;

    // Validation minimale
    if (!villeDepart || !villeArrivee || prix === undefined || prix === null) {
      return res.status(400).json({
        message:
          "Les champs villeDepart, villeArrivee et prix sont obligatoires.",
      });
    }

    // Vérification de doublon (même départ, arrivée et date)
    if (dateDepart) {
      const start = new Date(dateDepart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateDepart);
      end.setHours(23, 59, 59, 999);

      const existing = await Trajet.findOne({
        villeDepart: { $regex: new RegExp(`^${villeDepart}$`, "i") },
        villeArrivee: { $regex: new RegExp(`^${villeArrivee}$`, "i") },
        dateDepart: { $gte: start, $lte: end },
      });

      if (existing) {
        return res.status(400).json({
          message: `Un trajet ${villeDepart} → ${villeArrivee} prévu le ${new Date(
            existing.dateDepart
          ).toLocaleDateString("fr-FR")} existe déjà.`,
        });
      }
    }

    const trajet = await Trajet.create({
      compagnie,
      villeDepart,
      villeArrivee,
      dateDepart,
      heureDepart,
      heureArrivee,
      prix, // prix principal
      nombrePlaces,
      typeVehicule,
      segments,
      placesRestantes: nombrePlaces,
      // IMPORTANT : prixTotal doit refléter le prix principal (pas la somme des segments)
      prixTotal: prix,
    });

    res.status(201).json({
      success: true,
      data: trajet,
    });
  } catch (error) {
    console.error("❌ Erreur création trajet :", error);
    res.status(500).json({
      message: "Erreur serveur lors de la création du trajet.",
    });
  }
};

/* -------------------------------------------------------------
 * 🔍 Récupérer tous les trajets (avec filtres facultatifs)
 * ----------------------------------------------------------- */
export const getAllTrajets = async (req, res) => {
  try {
    const { depart, arrivee } = req.query;
    const query = {};

    if (depart) query.villeDepart = { $regex: new RegExp(depart, "i") };
    if (arrivee) query.villeArrivee = { $regex: new RegExp(arrivee, "i") };

    const trajets = await Trajet.find(query).sort({ createdAt: -1 }).lean();

    const formatted = trajets.map((t) => ({
      ...t,
      // prixTotal = prix principal (conforme à ton besoin)
      prixTotal: t.prix,
      placesRestantes: t.placesRestantes ?? t.nombrePlaces ?? 0,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("❌ Erreur chargement trajets :", error);
    res.status(500).json({ message: "Erreur serveur lors du chargement." });
  }
};

/* -------------------------------------------------------------
 * 🔍 Récupérer un trajet par ID
 * ----------------------------------------------------------- */
export const getTrajetById = async (req, res) => {
  try {
    const trajet = await Trajet.findById(req.params.id);
    if (!trajet) return res.status(404).json({ message: "Trajet introuvable." });
    res.json({ success: true, data: trajet });
  } catch (error) {
    console.error("❌ Erreur getTrajetById :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------
 * ✏️ Mettre à jour un trajet
 *   + Vérifie si la mise à jour créerait un doublon
 * ----------------------------------------------------------- */
export const updateTrajet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      compagnie,
      villeDepart,
      villeArrivee,
      dateDepart,
      heureDepart,
      heureArrivee,
      prix,
      nombrePlaces,
      typeVehicule,
      segments = [],
    } = req.body;

    const trajet = await Trajet.findById(id);
    if (!trajet) return res.status(404).json({ message: "Trajet introuvable." });

    // Vérification de doublon (si ville/depart/date fournis)
    if (villeDepart && villeArrivee && dateDepart) {
      const start = new Date(dateDepart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateDepart);
      end.setHours(23, 59, 59, 999);

      const existing = await Trajet.findOne({
        _id: { $ne: id },
        villeDepart: { $regex: new RegExp(`^${villeDepart}$`, "i") },
        villeArrivee: { $regex: new RegExp(`^${villeArrivee}$`, "i") },
        dateDepart: { $gte: start, $lte: end },
      });

      if (existing) {
        return res.status(400).json({
          message: `Impossible de modifier : un trajet ${villeDepart} → ${villeArrivee} existe déjà à cette date.`,
        });
      }
    }

    trajet.compagnie = compagnie ?? trajet.compagnie;
    trajet.villeDepart = villeDepart ?? trajet.villeDepart;
    trajet.villeArrivee = villeArrivee ?? trajet.villeArrivee;
    trajet.dateDepart = dateDepart ?? trajet.dateDepart;
    trajet.heureDepart = heureDepart ?? trajet.heureDepart;
    trajet.heureArrivee = heureArrivee ?? trajet.heureArrivee;
    trajet.prix = prix ?? trajet.prix;
    trajet.nombrePlaces = nombrePlaces ?? trajet.nombrePlaces;
    trajet.typeVehicule = typeVehicule ?? trajet.typeVehicule;
    trajet.segments = segments;

    // prixTotal = prix principal (inchangé par la présence des segments)
    trajet.prixTotal = trajet.prix;

    if (nombrePlaces && nombrePlaces < (trajet.placesRestantes ?? 0)) {
      trajet.placesRestantes = nombrePlaces;
    }

    await trajet.save();
    res.json({ success: true, data: trajet });
  } catch (error) {
    console.error("❌ Erreur mise à jour trajet :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------
 * 🗑️ Supprimer un trajet
 * ----------------------------------------------------------- */
export const deleteTrajet = async (req, res) => {
  try {
    const trajet = await Trajet.findByIdAndDelete(req.params.id);
    if (!trajet) return res.status(404).json({ message: "Trajet introuvable." });
    res.json({ success: true, message: "Trajet supprimé." });
  } catch (error) {
    console.error("❌ Erreur suppression trajet :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------
 * ➕ Ajouter un segment à un trajet existant
 * ----------------------------------------------------------- */
export const addSegment = async (req, res) => {
  try {
    const { trajetId } = req.params;
    const { depart, arrivee, prix } = req.body;

    const trajet = await Trajet.findById(trajetId);
    if (!trajet) return res.status(404).json({ message: "Trajet introuvable." });

    trajet.segments.push({ depart, arrivee, prix });
    // Ne pas sommer dans prixTotal : prixTotal reste le prix principal
    trajet.prixTotal = trajet.prix;
    await trajet.save();

    res.status(201).json({ success: true, data: trajet });
  } catch (error) {
    console.error("❌ Erreur ajout segment :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------
 * ✏️ Modifier un segment
 * ----------------------------------------------------------- */
export const updateSegment = async (req, res) => {
  try {
    const { trajetId, segmentId } = req.params;
    const { depart, arrivee, prix } = req.body;

    const trajet = await Trajet.findById(trajetId);
    if (!trajet) return res.status(404).json({ message: "Trajet introuvable." });

    const segment = trajet.segments.id(segmentId);
    if (!segment) return res.status(404).json({ message: "Segment introuvable." });

    segment.depart = depart ?? segment.depart;
    segment.arrivee = arrivee ?? segment.arrivee;
    segment.prix = prix ?? segment.prix;

    trajet.prixTotal = trajet.prix;
    await trajet.save();

    res.json({ success: true, data: trajet });
  } catch (error) {
    console.error("❌ Erreur modification segment :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/* -------------------------------------------------------------
 * ❌ Supprimer un segment
 * ----------------------------------------------------------- */
export const deleteSegment = async (req, res) => {
  try {
    const { trajetId, segmentId } = req.params;

    const trajet = await Trajet.findById(trajetId);
    if (!trajet) return res.status(404).json({ message: "Trajet introuvable." });

    trajet.segments = trajet.segments.filter(
      (seg) => seg._id.toString() !== segmentId
    );

    trajet.prixTotal = trajet.prix;
    await trajet.save();
    res.json({ success: true, data: trajet });
  } catch (error) {
    console.error("❌ Erreur suppression segment :", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};
