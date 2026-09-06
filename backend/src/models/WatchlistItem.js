import mongoose from "mongoose";

const watchlistItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  tmdbId: { type: Number, required: true },
  mediaType: { type: String, enum: ["movie", "tv"], required: true },
  title: { type: String, required: true },
  overview: { type: String, default: "" },
  year: { type: String, default: "" },
  rating: { type: String, default: "—" },
  poster: { type: String, default: null },
  backdrop: { type: String, default: null }
}, { timestamps: true });

watchlistItemSchema.index({ userId: 1, tmdbId: 1, mediaType: 1 }, { unique: true });
export default mongoose.model("WatchlistItem", watchlistItemSchema);
