// server/server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import connectDB from "./config/dbMonitor.js";
import { protect } from "./middleware/authMiddleware.js";
import { activityLogger } from "./middleware/activityLogger.js";

// 🔹 Routes
import authRoutes from "./routes/authRoute.js";
import reservationRoutes from "./routes/reservationsRoute.js";
import trajetsRoutes from "./routes/trajetsRoute.js";
import settingsRoutes from "./routes/settingsRoute.js";
import reportsRoutes from "./routes/reportsRoute.js";
import notificationsRoutes from "./routes/notificationsRoute.js";
import usersRoutes from "./routes/usersRoute.js";
import monitoringRoutes from "./routes/monitoringRoute.js";

// 🔹 Models & Controllers
import Reservation from "./models/Reservation.js";
import User from "./models/User.js";
import {
  registerAdmin,
  unregisterAdmin,
  updateAdminActivity,
  getConnectedAdmins,
} from "./controllers/monitoringController.js";

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ======================================================
// 🌍 Middleware global
// ======================================================
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ CORS simplifié
const allowedOrigins = [
  "http://localhost:3000",
  "https://kocrou-transport-app-client.vercel.app",
  process.env.FRONTEND_URL,
  process.env.DEPLOY_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      console.log("🟢 CORS accepté :", origin);
      return callback(null, true);
    }
    console.warn("🚫 CORS refusé :", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors()); // ✅ préflight

// ======================================================
// 🔗 Routes publiques
// ======================================================
app.get("/", (req, res) => {
  res.json({ message: "Bienvenue sur l’API Kocrou Transport 🚍" });
});
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);

// ======================================================
// 🔒 Routes protégées
// ======================================================
app.use("/api", protect, activityLogger);
app.use("/api/reservations", reservationRoutes);
app.use("/api/trajets", trajetsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/monitoring", monitoringRoutes);

// ======================================================
// ⚡ WebSocket sécurisé
// ======================================================
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
    transports: ["websocket", "polling"],
  },
  allowEIO3: true,
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean();
    if (!user || !user.isAdmin) return next(new Error("Not authorized"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

app.set("io", io);
global._io = io;

io.on("connection", (socket) => {
  const email = socket.user?.email;
  console.log(`🟢 Admin connecté : ${email}`);

  socket.on("admin_join", () => {
    registerAdmin(socket, email);
    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });

  socket.on("admin_ping", () => updateAdminActivity(email));

  socket.on("disconnect", () => {
    unregisterAdmin(socket.id);
    console.log(`🔴 Admin déconnecté : ${email}`);
    io.emit("monitoring_update", {
      adminCount: Object.keys(getConnectedAdmins()).length,
      admins: Object.entries(getConnectedAdmins()).map(([email, info]) => ({
        email,
        lastActive: info.lastActive,
      })),
    });
  });
});

// ======================================================
// 🩺 Monitoring API (publique)
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

    res.json({ success: true, connectedAdmins: admins.length, admins, recentReservations });
  } catch (err) {
    res.status(500).json({ success: false, message: "Erreur serveur monitoring" });
  }
});

// ======================================================
// 🚨 Gestion des erreurs
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
// 🚀 Démarrage serveur
// ======================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur + WebSocket opérationnel sur le port ${PORT}`);
});