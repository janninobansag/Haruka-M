import jwt from "jsonwebtoken";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies.haruka_session;
    if (!token) return res.status(401).json({ message: "Sign in is required.", code: "UNAUTHENTICATED" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: "Session is no longer valid.", code: "UNAUTHENTICATED" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: "Session is invalid or expired.", code: "UNAUTHENTICATED" }); }
}

export const requireRole = (role) => (req, res, next) =>
  req.user?.role === role ? next() : res.status(403).json({ message: "You do not have permission for this action.", code: "FORBIDDEN" });
