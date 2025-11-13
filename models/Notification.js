import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["reservation", "cancel", "user"], required: true },
    message: { type: String, required: true },
    userName: String,
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
