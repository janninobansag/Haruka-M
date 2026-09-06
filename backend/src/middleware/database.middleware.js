import mongoose from "mongoose";

export function requireDatabase(_, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: "Database is currently unavailable. Check the MongoDB connection and try again.", code: "DATABASE_UNAVAILABLE" });
  }
  next();
}
