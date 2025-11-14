// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import { activityLogger } from "./middleware/activityLogger.js";
import { protect } from "./middleware/authMiddleware.js";
import connectDB from "./config/dbMonitor.js";

// 🔹 Routes
import authRoutes from "./routes/authRoute.js";
import reservationRoutes from "./routes/reservationsRoute.js";
import trajetsRoutes from "./routes/trajetsRoute.js";
import settingsRoutes from "./routes/settingsRoute.js";
import reportsRoutes from "./routes/reportsRoute.js";
import notificationsRoutes from "./routes/notificationsRoute.js";
import usersRoutes from "./routes/usersRoute.js";
import monitoringRoutes from "./routes/monitoringRoute.js";

// 🔹 Modèles
import Reservation from "./models/Reservation.js";
import User from "./models/User.js";

// 🔹 Contrôleurs monitoring
import {
  registerAdmin,
  unregisterAdmin,
  updateAdminActivity,
  getConnectedAdmins,
} from "./controllers/monitoringController.js";

dotenv.config();

// ======================================================
// ⚙️ EXPRESS & CONFIGURATION DE BASE
// ======================================================
const app = express();
const server = http.createServer(app);
connectDB();

// ======================================================
// 🌍 CONFIGURATION CORS
// ======================================================
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5000",
  "https://kocrou-transport-app-client.vercel.app",
  "https://kocrou-transport-app-client-m58xwyij9-junior-akoudjes-projects.vercel.app",
  "https://kocrou-transport-app-client-6ij9djef8-junior-akoudjes-projects.vercel.app",
  process.env.FRONTEND_URL,
  process.env.DEPLOY_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // ✅ Autoriser les requêtes locales sans origine (tests Postman, etc.)
      if (!origin) return callback(null, true);

      // ✅ Toujours autoriser localhost
      if (origin.startsWith("http://localhost")) {
        console.log("🟢 CORS accepté (local):", origin);
        return callback(null, true);
      }

      // ✅ Autoriser tous les sous-domaines du projet Vercel
      if (
        origin.includes("kocrou-transport-app-client") &&
        origin.endsWith(".vercel.app")
      ) {
        console.log("🟢 CORS accepté (vercel):", origin);
        return callback(null, true);
      }

      // ✅ Autoriser d’autres domaines explicites
      const allowedOrigins = [
        "https://kocrou-transport-app-client.vercel.app",
        process.env.FRONTEND_URL,
        process.env.DEPLOY_URL,
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        console.log("🟢 CORS accepté (prod):", origin);
        return callback(null, true);
      }

      // 🚫 Sinon : refus
      console.warn("🚫 CORS refusé pour:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use((req, res, next) => {
  console.log("🌐 Origine requête :", req.headers.origin);
  next();
});

// ======================================================
// 🔗 ROUTES PUBLIQUES
// ======================================================
app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l’API Kocrou Transport 🚍" });
});
app.use("/api/auth", authRoutes);

// ======================================================
// 🔒 ROUTES PROTÉGÉES
// ======================================================
import { Router } from "express";
const securedRouter = Router();

securedRouter.use(protect, activityLogger);
securedRouter.use("/api/reservations", reservationRoutes);
securedRouter.use("/api/trajets", trajetsRoutes);
securedRouter.use("/api/reports", reportsRoutes);
securedRouter.use("/api/notifications", notificationsRoutes);
securedRouter.use("/api/users", usersRoutes);
securedRouter.use("/api/monitoring", monitoringRoutes);

app.use("/", securedRouter);

// ✅ ROUTE PUBLIQUE POUR LES PARAMÈTRES GÉNÉRAUX
app.use("/api/settings", settingsRoutes);

// ======================================================
// ⚡ SOCKET.IO SÉCURISÉ (AVEC AUTH JWT)
// ======================================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
  },
  allowEIO3: true, // ✅ compatibilité socket.io v2
});

// ✅ Authentification Socket.io
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      console.warn("🚫 Connexion Socket.io sans token refusée");
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();

    console.log("🧩 Socket.io Auth OK — Admin connecté :", {
      email: user?.email,
      id: user?._id,
      origin: socket.handshake.headers.origin,
    });

    if (!user || !user.isAdmin) {
      console.warn("🚫 Accès WebSocket refusé pour cet utilisateur");
      return next(new Error("Not authorized"));
    }

    socket.user = user; // attache l’admin validé
    next();
  } catch (error) {
    console.error("❌ Erreur d’auth Socket.io :", error.message);
    next(new Error("Authentication error"));
  }
});

// ======================================================
// 🧠 MONITORING TEMPS RÉEL
// ======================================================
app.set("io", io);
global._io = io;

io.on("connection", (socket) => {
  console.log(`🟢 Admin connecté via WebSocket : ${socket.user?.email}`);

  socket.on("admin_join", () => {
    registerAdmin(socket, socket.user?.email);
    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });

  socket.on("admin_ping", () => {
    updateAdminActivity(socket.user?.email);
  });

  socket.on("disconnect", () => {
    unregisterAdmin(socket.id);
    console.log(`🔴 Admin déconnecté : ${socket.user?.email}`);
    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });
});

console.log("✅ WebSocket sécurisé prêt.");

// ======================================================
// 🩺 ENDPOINT MONITORING
// ======================================================
app.get("/api/monitoring", async (req, res) => {
  try {
    const admins = Object.entries(getConnectedAdmins()).map(
      ([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })
    );

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
    res
      .status(500)
      .json({ success: false, message: "Erreur serveur monitoring" });
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
// 🚀 DÉMARRAGE SERVEUR
// ======================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur + WebSocket opérationnel sur le port ${PORT}`);
});
