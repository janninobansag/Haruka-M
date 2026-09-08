import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Only regular members require approval. Existing accounts without a status remain approved.
export const isApprovedAccount = (user) => user?.role !== "user" || user?.approvalStatus !== "pending";

export async function requireAuth(req, res, next) {
  try {
    const bearerToken = req.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    const token = req.cookies.haruka_session || bearerToken;
    if (!token) return res.status(401).json({ message: "Sign in is required.", code: "UNAUTHENTICATED" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) return res.status(401).json({ message: "Session is no longer valid.", code: "UNAUTHENTICATED" });
    if (!isApprovedAccount(user)) return res.status(403).json({ message: "Your account is awaiting administrator approval.", code: "ACCOUNT_PENDING_APPROVAL" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ message: "Session is invalid or expired.", code: "UNAUTHENTICATED" }); }
}

const roleRank = { user: 1, admin: 2, superadmin: 3 };

export const requireRole = (role) => (req, res, next) =>
  roleRank[req.user?.role] >= roleRank[role]
    ? next()
    : res.status(403).json({ message: "You do not have permission for this action.", code: "FORBIDDEN" });

export const requireAuthToken = requireAuth;
