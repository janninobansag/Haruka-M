import "dotenv/config";
import { connectDatabase } from "./config/database.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import libraryRoutes from "./routes/library.routes.js";
import searchRoutes from "./routes/search.routes.js";
import titleRoutes from "./routes/title.routes.js";
import discoverRoutes from "./routes/discover.routes.js";

console.log("🔴 SERVER: Importing video routes...");
import videoRoutes from "./routes/video.routes.js";
console.log("🔴 SERVER: Video routes imported successfully");

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_, res) => res.json({ status: "ok", service: "Haruka API" }));
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/me", libraryRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/titles", titleRoutes);
app.use("/api/discover", discoverRoutes);

console.log("🔴 SERVER: Registering video routes at /api/video");
app.use("/api/video", videoRoutes);
console.log("🔴 SERVER: Video routes registered");

app.use((error, _, res, __) => {
  console.error(error.message);
  res.status(error.status || 500).json({ message: error.message || "Something went wrong.", code: "API_ERROR" });
});

app.listen(port, () => console.log(`Haruka API running at http://localhost:${port}`));
connectDatabase().catch((error) => console.error(`MongoDB unavailable; authentication is disabled until it reconnects: ${error.message}`));
