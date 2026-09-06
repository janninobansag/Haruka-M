import { Router } from "express";
import { tmdb } from "../services/tmdb.service.js";

const router = Router();
router.get("/:type/:tmdbId", async (req, res, next) => {
  try {
    const { type, tmdbId } = req.params;
    if (!["movie", "tv"].includes(type) || !/^\d+$/.test(tmdbId)) return res.status(400).json({ message: "Provide a valid title type and TMDB ID.", code: "INVALID_TITLE" });
    const data = await tmdb(`/${type}/${tmdbId}`, { append_to_response: "credits" });
    const crew = data.credits?.crew || [];
    const lead = type === "movie" ? crew.find((member) => member.job === "Director") : crew.find((member) => member.job === "Creator" || member.department === "Writing");
    res.json({
      id: data.id, mediaType: type, title: data.title || data.name, overview: data.overview,
      year: (data.release_date || data.first_air_date || "").slice(0, 4),
      rating: data.vote_average ? data.vote_average.toFixed(1) : "—",
      runtime: data.runtime || data.episode_run_time?.[0] || null,
      genres: (data.genres || []).map((genre) => genre.name),
      lead: lead?.name || null,
      cast: (data.credits?.cast || []).slice(0, 5).map((member) => member.name)
    });
  } catch (error) { next(error); }
});
router.get("/:type/:tmdbId/trailer", async (req, res, next) => {
  try {
    const { type, tmdbId } = req.params;
    if (!["movie", "tv"].includes(type) || !/^\d+$/.test(tmdbId)) return res.status(400).json({ message: "Provide a valid title type and TMDB ID.", code: "INVALID_TITLE" });
    const data = await tmdb(`/${type}/${tmdbId}/videos`);
    const videos = data.results || [];
    const trailer = videos.find((video) => video.site === "YouTube" && video.type === "Trailer" && video.official) || videos.find((video) => video.site === "YouTube" && video.type === "Trailer");
    if (!trailer) return res.status(404).json({ message: "No official trailer is available for this title.", code: "TRAILER_NOT_FOUND" });
    res.json({ key: trailer.key, name: trailer.name, site: trailer.site });
  } catch (error) { next(error); }
});
export default router;
