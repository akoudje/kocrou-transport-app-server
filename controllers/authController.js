// server/controllers/authController.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/** 🔹 Génère le token d'accès principal */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

/** 🔹 Génère le refresh token longue durée */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: "30d" }
  );
};

/** 🆕 Inscription utilisateur */
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });

    if (existing)
      return res.status(400).json({ message: "Cet e-mail est déjà utilisé." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      isAdmin: false,
    });

    res.status(201).json({
      message: "Inscription réussie ✅",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("❌ Erreur inscription :", error);
    res.status(500).json({ message: "Erreur serveur lors de l'inscription." });
  }
};

/** 🔑 Connexion utilisateur / admin */
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Mot de passe incorrect." });

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(200).json({
      message: "Connexion réussie ✅",
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("❌ Erreur connexion :", error);
    res.status(500).json({ message: "Erreur serveur lors de la connexion." });
  }
};

/** 🔄 Rafraîchissement du token */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "Refresh token manquant." });

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    const newToken = generateToken(user);

    res.status(200).json({
      token: newToken,
      message: "Token régénéré avec succès.",
    });
  } catch (error) {
    console.error("❌ Erreur refresh token :", error);
    res.status(401).json({ message: "Token invalide ou expiré." });
  }
};

/** 👤 Récupération du profil utilisateur */
export const getProfile = async (req, res) => {
  try {
    if (!req.user)
      return res.status(401).json({ message: "Non autorisé, token manquant." });

    const user = await User.findById(req.user._id).select("-password");
    if (!user)
      return res.status(404).json({ message: "Utilisateur introuvable." });

    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Erreur profil :", error);
    res.status(500).json({
      message: "Erreur lors de la récupération du profil.",
    });
  }
};
