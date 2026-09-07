import { Router } from "express";
import mongoose from "mongoose";
import ExclusiveTitle from "../models/ExclusiveTitle.js";
import { card, tmdb } from "../services/tmdb.service.js";

const router = Router();
const types = new Set(["movie", "tv"]);
const genreCache = new Map();

function getType(req, res) {
  const type = req.query.type || "movie";
  if (!types.has(type)) {
    res.status(400).json({ message: "type must be movie or tv", code: "INVALID_MEDIA_TYPE" });
    return null;
  }
  return type;
}

async function genreId(type, name) {
  const key = `${type}:${name}`;
  if (!genreCache.has(key)) {
    const data = await tmdb(`/genre/${type}/list`);
    const genre = data.genres.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    genreCache.set(key, genre?.id);
  }
  return genreCache.get(key);
}

router.get("/:collection", async (req, res, next) => {
  try {
    const type = getType(req, res);
    if (!type) return;
    const { collection } = req.params;
    const page = req.query.page || "1";
    let data;

    if (collection === "haruka-only") {
      if (mongoose.connection.readyState !== 1) return res.json({ collection, type, results: [] });
      const results = await ExclusiveTitle.find({ mediaType: type, $or: [{ isPublished: true }, { isPublished: { $exists: false } }] }).sort({ createdAt: -1 });
      return res.json({ collection, type, results });
    } else if (collection === "trending") {
      data = await tmdb(`/trending/${type}/day`, { page });
    } else if (collection === "top-rated") {
      data = await tmdb(`/${type}/top_rated`, { page });
    } else if (collection === "comedy" || collection === "horror") {
      const id = await genreId(type, collection);
      data = await tmdb(`/discover/${type}`, { with_genres: id, sort_by: "popularity.desc", page });
    } else {
      return res.status(404).json({ message: "Unknown discovery collection", code: "NOT_FOUND" });
    }

    const results = data.results.map((item) => card(item, type));
    res.json({ collection, type, results });
  } catch (error) { next(error); }
});

export default router;
