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
import { stripeWebhook } from "./controllers/coursePurchase.controller.js";

dotenv.config();

// DB connection
connectDB();
const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Stripe Webhook comes BEFORE express.json()
// app.post("/api/v1/purchase/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Middlewares
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// ✅ Routes (AFTER express.json)
app.use("/api/v1/user", userRoute);
app.use("/api/v1/course", courseRoute);
app.use("/api/v1/media", mediaRoute);
app.use("/api/v1/progress", courseProgressRoute);
app.use("/api/v1/purchase", purchaseRoute);

// Logger for every request
app.use((req, res, next) => {
  console.log(`🔥 ${req.method} ${req.originalUrl}`);
  next();
});

// Test route
app.post("/test", (req, res) => {
  console.log("✅ /test route hit");
  res.send("Test OK");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listen at port ${PORT}`);
});
