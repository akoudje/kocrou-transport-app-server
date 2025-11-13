// controllers/reservationController.js
import Reservation from "../models/Reservation.js";
import Trajet from "../models/Trajets.js";
import User from "../models/User.js";

/* -------------------------------------------------------------
 * 🟢 Créer une réservation
 * ----------------------------------------------------------- */
export const createReservation = async (req, res) => {
  try {
    const { trajetId, segment, seat } = req.body;
    const userId = req.user?._id;

    if (!trajetId) {
      return res.status(400).json({ message: "L'ID du trajet est requis." });
    }

    // 🔍 Trouver le trajet
    const trajet = await Trajet.findById(trajetId);
    if (!trajet) {
      return res.status(404).json({ message: "Trajet introuvable." });
    }

    // 🚫 Vérifier les places disponibles
    if (trajet.placesRestantes <= 0) {
      return res.status(400).json({ message: "Aucune place disponible." });
    }

    // 🚫 Vérifier si le siège est déjà réservé
    const existingSeat = await Reservation.findOne({ "trajet._id": trajetId, seat });
    if (existingSeat) {
      return res.status(400).json({ message: "Ce siège est déjà réservé." });
    }

    // 💰 Déterminer le prix
    let prix = trajet.prix;
    if (segment) {
      const seg = trajet.segments.find(
        (s) =>
          s.depart.toLowerCase() === segment.depart.toLowerCase() &&
          s.arrivee.toLowerCase() === segment.arrivee.toLowerCase()
      );
      if (seg) prix = seg.prix;
    }

    // 💾 Créer la réservation
    const reservation = await Reservation.create({
      user: userId,
      trajet: {
        _id: trajet._id,
        compagnie: trajet.compagnie,
        villeDepart: segment?.depart || trajet.villeDepart,
        villeArrivee: segment?.arrivee || trajet.villeArrivee,
        prix,
      },
      seat,
      statut: "confirmée",
      dateReservation: new Date(),
    });

    // 🔄 Mettre à jour les places restantes
    trajet.placesRestantes = Math.max(trajet.placesRestantes - 1, 0);
    await trajet.save();

    // 🚀 Émettre un événement Socket.io global
    const io = req.app?.get("io") || global._io;
    if (io) {
      io.emit("reservation_created", {
        trajet: {
          _id: trajet._id,
          villeDepart: trajet.villeDepart,
          villeArrivee: trajet.villeArrivee,
          compagnie: trajet.compagnie,
          placesRestantes: trajet.placesRestantes,
        },
        seat,
        userId,
      });
      console.log("📡 Événement Socket.io émis : reservation_created");
    }

    res.status(201).json({
      success: true,
      message: "Réservation créée avec succès.",
      data: reservation,
    });
  } catch (error) {
    console.error("❌ Erreur création réservation :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

/* -------------------------------------------------------------
 * 👤 Récupérer les réservations de l’utilisateur connecté
 * ----------------------------------------------------------- */
export const getUserReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.json(reservations);
  } catch (error) {
    console.error("❌ Erreur récupération réservations :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

/**
 * ===========================================================
 * 🧩 Récupérer toutes les réservations (admin)
 * -----------------------------------------------------------
 * Filtres + pagination
 * ===========================================================
 */
/* -------------------------------------------------------------
 * 🧩 Récupérer toutes les réservations (Admin + Dashboard)
 * ----------------------------------------------------------- */
export const getAllReservations = async (req, res) => {
  try {
    // ✅ Si "all=true" → on renvoie toutes les réservations sans limite
    if (req.query.all === "true") {

      const reservations = await Reservation.find({})
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        total: reservations.length,
        data: reservations,
      });
    }

    // 🔍 Sinon, on applique la pagination et les filtres (vue Admin standard)
    const {
      statut,
      compagnie,
      villeDepart,
      villeArrivee,
      email,
      dateDepart,
      page = 1,
      limit = 10,
    } = req.query;

    const filter = {};

    if (statut && statut !== "toutes") filter.statut = statut;
    if (compagnie)
      filter["trajet.compagnie"] = { $regex: new RegExp(compagnie, "i") };
    if (villeDepart)
      filter["trajet.villeDepart"] = { $regex: new RegExp(villeDepart, "i") };
    if (villeArrivee)
      filter["trajet.villeArrivee"] = { $regex: new RegExp(villeArrivee, "i") };

    if (email) {
      const userMatch = await User.find({
        $or: [
          { email: { $regex: new RegExp(email, "i") } },
          { name: { $regex: new RegExp(email, "i") } },
        ],
      }).select("_id");

      if (userMatch.length > 0) {
        filter.user = { $in: userMatch.map((u) => u._id) };
      } else {
        return res.status(200).json({
          success: true,
          currentPage: 1,
          totalPages: 1,
          total: 0,
          data: [],
        });
      }
    }

    if (dateDepart) {
      const date = new Date(dateDepart);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      filter["trajet.dateDepart"] = { $gte: date, $lt: nextDay };
    }

    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const total = await Reservation.countDocuments(filter);
    const reservations = await Reservation.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    res.status(200).json({
      success: true,
      currentPage: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 1,
      total,
      data: reservations,
    });
  } catch (error) {
    console.error("❌ Erreur getAllReservations :", error);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors du chargement des réservations.",
    });
  }
};

/* -------------------------------------------------------------
 * ❌ Annuler une réservation (Admin)
 * ----------------------------------------------------------- */
export const cancelReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation)
      return res.status(404).json({ message: "Réservation introuvable." });

    reservation.statut = "annulée";
    await reservation.save();

    const trajet = await Trajet.findById(reservation.trajet._id);
    if (trajet) {
      trajet.placesRestantes = Math.min(
        trajet.placesRestantes + 1,
        trajet.nombrePlaces
      );
      await trajet.save();

      const io = req.app?.get("io") || global._io;
      if (io) {
        io.emit("reservation_deleted", {
          trajet: {
            _id: trajet._id,
            villeDepart: trajet.villeDepart,
            villeArrivee: trajet.villeArrivee,
            compagnie: trajet.compagnie,
            placesRestantes: trajet.placesRestantes,
          },
        });
        console.log("📡 Événement Socket.io émis : reservation_deleted");
      }
    }

    res.json({ success: true, message: "Réservation annulée." });
  } catch (error) {
    console.error("❌ Erreur annulation réservation :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

/* -------------------------------------------------------------
 * ✅ Valider une réservation (Admin)
 * ----------------------------------------------------------- */
export const validateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation)
      return res.status(404).json({ message: "Réservation introuvable." });

    reservation.statut = "validée";
    await reservation.save();

    res.json({ success: true, message: "Réservation validée." });
  } catch (error) {
    console.error("❌ Erreur validation réservation :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

/* -------------------------------------------------------------
 * 🪑 Récupérer les sièges réservés pour un trajet
 * ----------------------------------------------------------- */
export const getReservedSeats = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      "trajet._id": req.params.id,
      statut: { $in: ["confirmée", "validée"] },
    }).select("seat");

    const seats = reservations.map((r) => r.seat);
    res.json(seats);
  } catch (error) {
    console.error("❌ Erreur récupération sièges :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};

/* -------------------------------------------------------------
 * 🗑️ Supprimer une réservation
 * ----------------------------------------------------------- */
export const deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation)
      return res.status(404).json({ message: "Réservation introuvable." });

    const trajet = await Trajet.findById(reservation.trajet._id);
    if (trajet) {
      trajet.placesRestantes = Math.min(
        trajet.placesRestantes + 1,
        trajet.nombrePlaces
      );
      await trajet.save();

      const io = req.app?.get("io") || global._io;
      if (io) {
        io.emit("reservation_deleted", {
          trajet: {
            _id: trajet._id,
            villeDepart: trajet.villeDepart,
            villeArrivee: trajet.villeArrivee,
            compagnie: trajet.compagnie,
            placesRestantes: trajet.placesRestantes,
          },
        });
      }
    }

    res.json({ success: true, message: "Réservation supprimée." });
  } catch (error) {
    console.error("❌ Erreur suppression réservation :", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  }
};
