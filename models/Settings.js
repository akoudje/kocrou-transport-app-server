import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema({
  companyName: String,
  logo: String,
  contactEmail: String,
  phone: String,
  address: String,
  workingHours: String,
});

export default mongoose.model("Settings", settingsSchema);
