import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { isApprovedAccount, requireAuth } from "../middleware/auth.middleware.js";
import { requireDatabase } from "../middleware/database.middleware.js";
import { sendPasswordResetEmail } from "../services/mail.service.js";

const router = Router();
const safeUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, approvalStatus: isApprovedAccount(user) ? "approved" : "pending" });
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = (rememberMe) => ({
  httpOnly: true,
  // Vercel and Render are separate sites, so production fetches need a
  // cross-site cookie. HTTPS is required when SameSite=None is used.
  sameSite: isProduction ? "none" : "lax",
  secure: isProduction,
  ...(rememberMe ? { maxAge: 1000 * 60 * 60 * 24 * 30 } : {})
});
function startSession(res, user, rememberMe) {
  const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: rememberMe ? "30d" : "1d" });
  res.cookie("haruka_session", token, cookieOptions(rememberMe));
}
const createMobileToken = (user) => jwt.sign({ sub: user._id, role: user.role, client: "mobile" }, process.env.JWT_SECRET, { expiresIn: "30d" });
const markActive = (user) => User.updateOne({ _id: user._id }, { lastActiveAt: new Date() });

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
    await markActive(user);
    res.json({ user: safeUser(user) });
  } catch (error) { next(error); }
});

router.post("/mobile/signin", requireDatabase, async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.isActive || !(await bcrypt.compare(req.body.password || "", user.passwordHash))) return res.status(401).json({ message: "Email or password is incorrect.", code: "INVALID_CREDENTIALS" });
    if (!isApprovedAccount(user)) return res.status(403).json({ message: "Your account is awaiting approval from an administrator.", code: "ACCOUNT_PENDING_APPROVAL" });
    await markActive(user);
    res.json({ user: safeUser(user), token: createMobileToken(user) });
  } catch (error) { next(error); }
});

router.post("/forgot-password", requireDatabase, async (req, res, next) => {
  const response = { message: "If an account exists for that email, a password-reset link has been sent." };
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.json(response);
    const user = await User.findOne({ email });
    if (!user) return res.json(response);

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    await sendPasswordResetEmail({ to: user.email, resetUrl: `${clientUrl}/reset-password?token=${token}` });
    return res.json(response);
  } catch (error) {
    // Preserve the same public response to prevent email-account enumeration.
    console.error("Password reset email failed:", error.message);
    return res.json(response);
  }
});

router.post("/reset-password", requireDatabase, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) return res.status(400).json({ message: "Enter a valid reset link and a password of at least 8 characters.", code: "INVALID_INPUT" });
    const passwordResetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({ passwordResetTokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select("+passwordHash +passwordResetTokenHash +passwordResetExpiresAt");
    if (!user) return res.status(400).json({ message: "This password-reset link is invalid or has expired.", code: "INVALID_RESET_TOKEN" });
    user.passwordHash = await bcrypt.hash(password, 12);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    res.json({ message: "Your password has been reset. You can now sign in." });
  } catch (error) { next(error); }
});

router.post("/signout", (_, res) => { res.clearCookie("haruka_session", { httpOnly: true, sameSite: isProduction ? "none" : "lax", secure: isProduction }); res.status(204).end(); });
router.get("/me", requireDatabase, requireAuth, (req, res) => res.json({ user: safeUser(req.user) }));
router.post("/presence", requireDatabase, requireAuth, async (req, res, next) => {
  try {
    await markActive(req.user);
    res.status(204).end();
  } catch (error) { next(error); }
});
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
