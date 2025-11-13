// server/config/dbMonitor.js
import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI manquant dans .env".red);
    process.exit(1);
  }

  try {
    console.log("🕓 Connexion à MongoDB en cours...".yellow);

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log("🟢 MongoDB connecté avec succès ✅".green);
  } catch (err) {
    console.error(`🔴 Erreur de connexion MongoDB : ${err.message}`.red);
    setTimeout(connectDB, 5000); // 🔁 Retente après 5 secondes
  }

  mongoose.connection.on("connected", () =>
    console.log("🟢 [MongoDB] Connecté".green)
  );

  mongoose.connection.on("disconnected", () => {
    console.warn("🟠 [MongoDB] Déconnecté — tentative de reconnexion...".yellow);
    setTimeout(connectDB, 5000);
  });

  mongoose.connection.on("error", (err) =>
    console.error(`❌ [MongoDB] Erreur : ${err.message}`.red)
  );

  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("🔴 Connexion MongoDB fermée proprement.".red);
    process.exit(0);
  });
};

export default connectDB;
