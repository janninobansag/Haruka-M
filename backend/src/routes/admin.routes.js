import { Router } from "express";
import ExclusiveTitle from "../models/ExclusiveTitle.js";
import RecentlyViewed from "../models/RecentlyViewed.js";
import User from "../models/User.js";
import WatchlistItem from "../models/WatchlistItem.js";
import { isApprovedAccount, requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { requireDatabase } from "../middleware/database.middleware.js";
import { card, tmdb } from "../services/tmdb.service.js";

const router = Router();
router.use(requireDatabase, requireAuth, requireRole("admin"));
const canManageAccount = (actor, target) => actor._id.toString() !== target._id.toString()
  && ((actor.role === "superadmin" && target.role !== "superadmin") || (actor.role === "admin" && target.role === "user"));

router.get("/exclusives", async (_, res, next) => {
  try { res.json({ results: await ExclusiveTitle.find().sort({ createdAt: -1 }) }); }
  catch (error) { next(error); }
});

router.get("/users", async (_, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ results: users.map((user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, approvalStatus: isApprovedAccount(user) ? "approved" : "pending", createdAt: user.createdAt })) });
  } catch (error) { next(error); }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const role = req.body.role;
    if (req.user.role !== "superadmin") return res.status(403).json({ message: "Only a super admin can change roles.", code: "FORBIDDEN" });
    if (!["user", "admin", "superadmin"].includes(role)) return res.status(400).json({ message: "Role must be user, admin, or superadmin.", code: "INVALID_ROLE" });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found.", code: "NOT_FOUND" });
    if (target._id.toString() === req.user._id.toString() || target.role === "superadmin") return res.status(403).json({ message: "Super admin accounts cannot be changed here.", code: "PROTECTED_ACCOUNT" });
    const user = await User.findByIdAndUpdate(req.params.id, { role, ...(role !== "user" ? { approvalStatus: "approved" } : {}) }, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ message: "User not found.", code: "NOT_FOUND" });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, approvalStatus: user.approvalStatus || "approved" } });
  } catch (error) { next(error); }
});

router.patch("/users/:id/status", async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") return res.status(400).json({ message: "isActive must be true or false.", code: "INVALID_INPUT" });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found.", code: "NOT_FOUND" });
    if (!canManageAccount(req.user, target)) return res.status(403).json({ message: "You cannot change this account's status.", code: "PROTECTED_ACCOUNT" });
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true, runValidators: true });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, approvalStatus: user.approvalStatus || "approved" } });
  } catch (error) { next(error); }
});

router.patch("/users/:id/approval", async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User not found.", code: "NOT_FOUND" });
    if (target.role !== "user" || !canManageAccount(req.user, target)) return res.status(403).json({ message: "Only regular member accounts require approval.", code: "PROTECTED_ACCOUNT" });
    const user = await User.findByIdAndUpdate(req.params.id, { approvalStatus: "approved" }, { new: true, runValidators: true });
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive, approvalStatus: user.approvalStatus } });
  } catch (error) { next(error); }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found.", code: "NOT_FOUND" });
    if (!canManageAccount(req.user, user)) return res.status(403).json({ message: "You cannot permanently delete this account.", code: "PROTECTED_ACCOUNT" });
    await Promise.all([
      WatchlistItem.deleteMany({ userId: user._id }),
      RecentlyViewed.deleteMany({ userId: user._id }),
      User.deleteOne({ _id: user._id })
    ]);
    res.status(204).end();
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

router.patch("/exclusives/:id", async (req, res, next) => {
  try {
    const { isPublished } = req.body;
    if (typeof isPublished !== "boolean") return res.status(400).json({ message: "isPublished must be true or false.", code: "INVALID_INPUT" });
    const title = await ExclusiveTitle.findByIdAndUpdate(req.params.id, { isPublished }, { new: true, runValidators: true });
    if (!title) return res.status(404).json({ message: "Exclusive title not found.", code: "NOT_FOUND" });
    res.json({ title });
  } catch (error) { next(error); }
});

router.delete("/exclusives/:id", async (req, res, next) => {
  try {
    const deleted = await ExclusiveTitle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Exclusive title not found.", code: "NOT_FOUND" });
    res.status(204).end();
  } catch (error) { next(error); }
});

export default router;
