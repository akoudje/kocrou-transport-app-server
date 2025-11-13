// controllers/monitoringController.js
let connectedAdmins = {}; // email -> { socketId, lastActive }

export const getMonitoringData = async (req, res) => {
  try {
    const admins = Object.entries(connectedAdmins).map(([email, info]) => ({
      email,
      lastActive: info.lastActive,
    }));

    res.status(200).json({
      success: true,
      adminCount: admins.length,
      admins,
    });
  } catch (error) {
    console.error("❌ Erreur récupération monitoring :", error);
    res.status(500).json({ success: false, message: "Erreur interne du serveur." });
  }
};

// 🔹 Gérer une nouvelle connexion d'admin (appelée via Socket.io)
export const registerAdmin = (socket, email) => {
  connectedAdmins[email] = {
    socketId: socket.id,
    lastActive: new Date(),
  };
};

// 🔹 Gérer la déconnexion
export const unregisterAdmin = (socketId) => {
  for (const [email, info] of Object.entries(connectedAdmins)) {
    if (info.socketId === socketId) {
      delete connectedAdmins[email];
      break;
    }
  }
};

// 🔹 Mettre à jour l’activité
export const updateAdminActivity = (email) => {
  if (connectedAdmins[email]) {
    connectedAdmins[email].lastActive = new Date();
  }
};

// 🔹 Export pour consultation interne (Socket.io)
export const getConnectedAdmins = () => connectedAdmins;
