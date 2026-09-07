import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isApprovedAccount, requireAuth } from "../middleware/auth.middleware.js";
import { requireDatabase } from "../middleware/database.middleware.js";

const router = Router();
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, approvalStatus: isApprovedAccount(user) ? "approved" : "pending" });
const cookieOptions = (rememberMe) => ({
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  ...(rememberMe ? { maxAge: 1000 * 60 * 60 * 24 * 30 } : {})
});
function startSession(res, user, rememberMe) {
  const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: rememberMe ? "30d" : "1d" });
  res.cookie("haruka_session", token, cookieOptions(rememberMe));
}

router.post("/signup", requireDatabase, async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required.", code: "INVALID_INPUT" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address.", code: "INVALID_EMAIL" });
    if (await User.exists({ email })) return res.status(409).json({ message: "An account already exists for this email.", code: "EMAIL_EXISTS" });
    await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), approvalStatus: "pending" });
    res.status(202).json({ pendingApproval: true, message: "Your account was created and is awaiting approval from an administrator." });
  } catch (error) { next(error); }
});

router.post("/signin", requireDatabase, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return res.status(401).json({ message: "Email or password is incorrect.", code: "INVALID_CREDENTIALS" });
    if (!isApprovedAccount(user)) return res.status(403).json({ message: "Your account is awaiting approval from an administrator.", code: "ACCOUNT_PENDING_APPROVAL" });
    const rememberMe = req.body.rememberMe === true;
    startSession(res, user, rememberMe);
    res.json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

router.post("/signout", (_, res) => { res.clearCookie("haruka_session", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" }); res.status(204).end(); });
router.get("/me", requireDatabase, requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));
router.patch("/me", requireDatabase, requireAuth, async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name || name.length < 2 || name.length > 60) return res.status(400).json({ message: "Name must be between 2 and 60 characters.", code: "INVALID_NAME" });
    req.user.name = name;
    await req.user.save();
    res.json({ user: safeUser(req.user) });
  } catch (error) { next(error); }
});
router.patch("/me/password", requireDatabase, requireAuth, async (req, res, next) => {
  try {
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;
    if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ message: "Enter your current password and a new password of at least 8 characters.", code: "INVALID_PASSWORD" });
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ message: "Your current password is incorrect.", code: "INVALID_CREDENTIALS" });
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    res.status(204).end();
  } catch (error) { next(error); }
});
export default router;
