import { Router } from "express";
import { card, tmdb } from "../services/tmdb.service.js";

const router = Router();
router.get("/", async (req, res, next) => {
  try {
    const query = req.query.query?.trim();
    const type = req.query.type || "movie";
    if (!query || query.length < 2) return res.status(400).json({ message: "Enter at least two characters to search.", code: "INVALID_QUERY" });
    if (!["movie", "tv"].includes(type)) return res.status(400).json({ message: "type must be movie or tv", code: "INVALID_MEDIA_TYPE" });
    const data = await tmdb(`/search/${type}`, { query, page: req.query.page || "1", include_adult: "false" });
    res.json({ type, results: data.results.map((item) => card(item, type)) });
  } catch (error) { next(error); }
});
export default router;
