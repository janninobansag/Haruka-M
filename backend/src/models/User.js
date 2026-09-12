import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["user", "admin", "superadmin"], default: "user" },
  isActive: { type: Boolean, default: true },
  approvalStatus: { type: String, enum: ["pending", "approved"], default: "pending" },
  lastActiveAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
