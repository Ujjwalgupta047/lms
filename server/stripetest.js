// stripeWebhookTest.js
import express from "express";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();
const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post(
  "/webhook-test",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.WEBHOOK_ENDPOINT_SECRET
      );
      console.log("✅ Webhook received:", event.type);
    } catch (err) {
      console.error("❌ Webhook Error:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    return res.status(200).json({ received: true });
  }
);

app.listen(5005, () => {
  console.log("🚀 Webhook test server running on port 5005");
});
