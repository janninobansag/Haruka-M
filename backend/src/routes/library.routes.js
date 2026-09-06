import { Router } from "express";
import WatchlistItem from "../models/WatchlistItem.js";
import RecentlyViewed from "../models/RecentlyViewed.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireDatabase } from "../middleware/database.middleware.js";
import { card, tmdb } from "../services/tmdb.service.js";

const router = Router();
router.use(requireDatabase, requireAuth);

router.get("/watchlist", async (req, res, next) => {
  try { res.json({ results: await WatchlistItem.find({ userId: req.user._id }).sort({ createdAt: -1 }) }); }
  catch (error) { next(error); }
});

router.get("/recent", async (req, res, next) => {
  try { res.json({ results: await RecentlyViewed.find({ userId: req.user._id }).sort({ updatedAt: -1 }).limit(20) }); }
  catch (error) { next(error); }
});

router.put("/recent", async (req, res, next) => {
  try {
    const { id, mediaType, title, overview = "", year = "", rating = "—", poster = null, backdrop = null } = req.body;
    const tmdbId = Number(id);
    if (!Number.isInteger(tmdbId) || tmdbId < 1 || !["movie", "tv"].includes(mediaType) || !title?.trim()) return res.status(400).json({ message: "Provide a valid title to save in history.", code: "INVALID_INPUT" });
    await RecentlyViewed.findOneAndUpdate({ userId: req.user._id, tmdbId, mediaType }, { title: title.trim(), overview, year, rating, poster, backdrop }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.status(204).end();
  } catch (error) { next(error); }
});

router.post("/watchlist", async (req, res, next) => {
  try {
    const tmdbId = Number(req.body.tmdbId);
    const mediaType = req.body.mediaType;
    if (!Number.isInteger(tmdbId) || tmdbId < 1 || !["movie", "tv"].includes(mediaType)) return res.status(400).json({ message: "Provide a valid title.", code: "INVALID_INPUT" });
    const details = await tmdb(`/${mediaType}/${tmdbId}`);
    const item = await WatchlistItem.create({ ...card(details, mediaType), tmdbId, mediaType, userId: req.user._id });
    res.status(201).json({ item });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "That title is already in My List.", code: "DUPLICATE_TITLE" });
    next(error);
  }
});

router.delete("/watchlist/:tmdbId", async (req, res, next) => {
  try {
    const tmdbId = Number(req.params.tmdbId);
    const mediaType = req.query.type;
    const deleted = await WatchlistItem.findOneAndDelete({ userId: req.user._id, tmdbId, mediaType });
    if (!deleted) return res.status(404).json({ message: "This title is not in My List.", code: "NOT_FOUND" });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
