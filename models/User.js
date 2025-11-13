import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom est requis"],
      trim: true,
      minlength: [2, "Le nom doit contenir au moins 2 caractères"],
    },
    email: {
      type: String,
      required: [true, "L’email est requis"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Veuillez entrer un email valide",
      ],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: [6, "Le mot de passe doit contenir au moins 6 caractères"],
      select: false, // Ne pas retourner le hash du mot de passe par défaut
    },
    isAdmin: {
      type: Boolean,
      default: false, // Par défaut, tous les nouveaux comptes sont des utilisateurs normaux
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// 🚫 Supprime complètement le hashage automatique
// car le hash est déjà géré dans authRoute.js

// 🔍 Méthode : vérifier le mot de passe (optionnelle)
userSchema.methods.matchPassword = async function (enteredPassword) {
  const bcrypt = await import("bcryptjs");
  return await bcrypt.compare(enteredPassword, this.password);
};

// 🔹 Méthode utilitaire (facultative) : masquer les champs sensibles
userSchema.methods.toPublicJSON = function () {
  const { password, __v, ...userData } = this.toObject();
  return userData;
};

export default mongoose.model("User", userSchema);

