import { Router } from "express";
import ExclusiveTitle from "../models/ExclusiveTitle.js";
import User from "../models/User.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireDatabase } from "../middleware/database.middleware.js";
import { card, tmdb } from "../services/tmdb.service.js";

const router = Router();
router.use(requireDatabase, requireAuth, requireRole("admin"));

router.get("/exclusives", async (_, res, next) => {
  try { res.json({ results: await ExclusiveTitle.find().sort({ createdAt: -1 }) }); }
  catch (error) { next(error); }
});

router.get("/users", async (_, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ results: users.map((user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt })) });
  } catch (error) { next(error); }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const role = req.body.role;
    if (!["user", "admin"].includes(role)) return res.status(400).json({ message: "Role must be user or admin.", code: "INVALID_ROLE" });
    if (req.user._id.toString() === req.params.id) return res.status(400).json({ message: "You cannot change your own role.", code: "SELF_ROLE_CHANGE" });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found.", code: "NOT_FOUND" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
  } catch (error) { next(error); }
});

router.post("/exclusives", async (req, res, next) => {
  try {
    const tmdbId = Number(req.body.tmdbId);
    const mediaType = req.body.mediaType;
    if (!Number.isInteger(tmdbId) || tmdbId < 1 || !["movie", "tv"].includes(mediaType)) return res.status(400).json({ message: "Provide a valid TMDB ID and media type.", code: "INVALID_INPUT" });
    const details = await tmdb(`/${mediaType}/${tmdbId}`);
    const title = await ExclusiveTitle.create({ ...card(details, mediaType), tmdbId, mediaType, addedBy: req.user._id });
    res.status(201).json({ title });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: "This title is already exclusive to Haruka.", code: "DUPLICATE_TITLE" });
    next(error);
  }
});

router.delete("/exclusives/:id", async (req, res, next) => {
  try {
    const deleted = await ExclusiveTitle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Exclusive title not found.", code: "NOT_FOUND" });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
