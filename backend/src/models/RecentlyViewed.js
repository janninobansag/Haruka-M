import mongoose from "mongoose";

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

const recentlyViewedSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ["movie", "tv"], required: true },
  title: { type: String, required: true },
  overview: { type: String, default: "" },
  year: { type: String, default: "" },
  rating: { type: String, default: "—" },
  poster: { type: String, default: null },
  backdrop: { type: String, default: null },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + TEN_DAYS_MS) }
}, { timestamps: true });

recentlyViewedSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
recentlyViewedSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("RecentlyViewed", recentlyViewedSchema);
