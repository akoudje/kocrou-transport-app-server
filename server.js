// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import { activityLogger } from "./middleware/activityLogger.js";
import { protect } from "./middleware/authMiddleware.js";

// 🔹 Connexion MongoDB
import connectDB from "./config/dbMonitor.js";

// 🔹 Import des routes
import authRoutes from "./routes/authRoute.js";
import reservationRoutes from "./routes/reservationsRoute.js";
import trajetsRoutes from "./routes/trajetsRoute.js";
import settingsRoutes from "./routes/settingsRoute.js";
import reportsRoutes from "./routes/reportsRoute.js";
import notificationsRoutes from "./routes/notificationsRoute.js";
import usersRoutes from "./routes/usersRoute.js";
import monitoringRoutes from "./routes/monitoringRoute.js";

// 🔹 Import du modèle Reservation
import Reservation from "./models/Reservation.js";

// 🔹 Import des contrôleurs monitoring
import {
  registerAdmin,
  unregisterAdmin,
  updateAdminActivity,
  getConnectedAdmins,
} from "./controllers/monitoringController.js";

dotenv.config();

// ======================================================
// ⚙️ INITIALISATION EXPRESS
// ======================================================
const app = express();

// ======================================================
// 🌍 CONFIGURATION CORS (avant tout autre middleware)
// ======================================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  process.env.FRONTEND_URL,
  process.env.DEPLOY_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.startsWith("http://localhost")) {
        console.log("🟢 CORS accepté (local dev):", origin);
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        console.log("🟢 CORS accepté (liste blanche):", origin);
        return callback(null, true);
      }
      console.warn("🚫 CORS refusé pour:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ======================================================
// 🧩 MIDDLEWARES GLOBAUX
// ======================================================
app.use(express.json());

// 📁 Fichiers statiques
app.use("/uploads", express.static("uploads"));

// 🔍 Log des origines entrantes (debug)
app.use((req, res, next) => {
  console.log("🌐 Origine requête :", req.headers.origin);
  next();
});

// ======================================================
// 💾 CONNEXION BASE DE DONNÉES
// ======================================================
connectDB();

// ======================================================
// 🔗 ROUTES PUBLIQUES (pas de token requis)
// ======================================================
app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l’API Kocrou Transport 🚍" });
});

app.use("/api/auth", authRoutes); // login/register publics

// ======================================================
// 🔒 ROUTES PROTÉGÉES PAR JWT + activityLogger
// ======================================================
import { Router } from "express";
const securedRouter = Router();

// Sécurité + journalisation uniquement sur les routes protégées
securedRouter.use(protect, activityLogger);

securedRouter.use("/api/reservations", reservationRoutes);
securedRouter.use("/api/trajets", trajetsRoutes);
securedRouter.use("/api/settings", settingsRoutes);
securedRouter.use("/api/reports", reportsRoutes);
securedRouter.use("/api/notifications", notificationsRoutes);
securedRouter.use("/api/users", usersRoutes);
securedRouter.use("/api/monitoring", monitoringRoutes);

app.use("/", securedRouter);

// ======================================================
// ⚡ SOCKET.IO — MONITORING EN TEMPS RÉEL
// ======================================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// 🔄 Socket global accessible partout dans l’app
app.set("io", io);
global._io = io;

// 🧠 Suivi en temps réel des connexions et des administrateurs
io.on("connection", (socket) => {
  console.log(`🟢 Nouveau client connecté : ${socket.id}`);
  console.log("🧩 Nombre total de clients connectés :", io.engine.clientsCount);

  /**
   * 👑 Un admin rejoint le monitoring
   */
  socket.on("admin_join", (data) => {
    const email = data?.email || "admin_inconnu";
    registerAdmin(socket, email);
    console.log(`👑 Admin connecté : ${email}`);

    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });

  /**
   * 🔁 Ping d’activité d’un admin
   */
  socket.on("admin_ping", (data) => {
    const email = data?.email;
    if (email) updateAdminActivity(email);

    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });

  /**
   * 🚪 Gestion des déconnexions
   */
  socket.on("disconnect", () => {
    unregisterAdmin(socket.id);
    console.log(`🔴 Client déconnecté : ${socket.id}`);
    console.log("📉 Clients restants :", io.engine.clientsCount);

    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });
});

/**
 * 🧹 REMARQUE IMPORTANTE :
 * Les événements liés aux réservations ("reservation_created", "reservation_deleted")
 * ne doivent PAS être réémis ici.
 * 
 * Ils sont déjà émis directement par les contrôleurs (ex: reservationController.js)
 * via : io.emit("reservation_created", {...})
 * 
 * Cela évite les doublons et garantit la synchronisation Dashboard / Sidebar.
 */

console.log("✅ WebSocket prêt et en écoute sur le même port que l’API");

// ======================================================
// 🩺 API MONITORING SNAPSHOT
// ======================================================
app.get("/api/monitoring", async (req, res) => {
  try {
    const admins = Object.entries(getConnectedAdmins()).map(([email, info]) => ({
      email,
      lastActive: info.lastActive,
    }));

    const recentReservations = await Reservation.find({ statut: "confirmée" })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      connectedAdmins: admins.length,
      admins,
      recentReservations,
    });
  } catch (error) {
    console.error("❌ Erreur API /api/monitoring :", error);
    res.status(500).json({ success: false, message: "Erreur serveur monitoring" });
  }
});

// ======================================================
// 🚨 GESTION GLOBALE DES ERREURS
// ======================================================
app.use((err, req, res, next) => {
  console.error("💥 Erreur serveur :", err.message);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "Requête bloquée par CORS ❌" });
  }

  res.status(500).json({
    message: "Erreur interne du serveur.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ======================================================
// 🚀 DÉMARRAGE DU SERVEUR
// ======================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur + WebSocket opérationnel sur le port ${PORT}`);
});
