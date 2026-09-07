import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/embed/movie/:tmdbId", requireAuth, (req, res) => {
  try {
    const { tmdbId } = req.params;
    const { autoplay = 1, sub = "en" } = req.query;

    const embedUrl = new URL(`https://cinesrc.st/embed/movie/${tmdbId}`);
    if (autoplay) embedUrl.searchParams.append("autoplay", autoplay);
    if (sub) embedUrl.searchParams.append("sub", sub);

    console.log("CineSrc Movie URL:", embedUrl.toString());

    res.json({
      success: true,
      embedUrl: embedUrl.toString(),
      tmdbId,
      source: "cinesrc",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/embed/tv/:tmdbId/:season/:episode", requireAuth, (req, res) => {
  try {
    const { tmdbId, season, episode } = req.params;
    const { autoplay = 1, sub = "en" } = req.query;

    const embedUrl = new URL(`https://cinesrc.st/embed/tv/${tmdbId}`);
    embedUrl.searchParams.append("s", season);
    embedUrl.searchParams.append("e", episode);
    if (autoplay) embedUrl.searchParams.append("autoplay", autoplay);
    if (sub) embedUrl.searchParams.append("sub", sub);

    console.log("CineSrc TV URL:", embedUrl.toString());

    res.json({
      success: true,
      embedUrl: embedUrl.toString(),
      tmdbId,
      season,
      episode,
      source: "cinesrc",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;