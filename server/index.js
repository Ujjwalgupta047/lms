import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./database/db.js";
import userRoute from "./routes/user.route.js";
import courseRoute from "./routes/course.route.js";
import mediaRoute from "./routes/media.route.js";
import purchaseRoute from "./routes/purchaseCourse.route.js";
import courseProgressRoute from "./routes/courseProgress.route.js";

dotenv.config();

// DB connection
connectDB();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Stripe Webhook comes BEFORE express.json()

// Middlewares
app.use(cookieParser());
app.use(cors({
  origin: ["http://localhost:5173", "https://your-frontend.vercel.app"],
  credentials: true,
}));
app.use(express.json());

// ✅ Routes (AFTER express.json)
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/progress", courseProgressRoute);
app.use("/api/v1/purchase", purchaseRoute);


import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client", "dist", "index.html"));
  });
}

// ✅ Start the server
app.listen(PORT, () => {
  console.log(`Server listen at port ${PORT}`);
});
