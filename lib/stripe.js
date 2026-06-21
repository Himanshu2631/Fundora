import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY || "";
const isPlaceholder = 
  !secretKey || 
  secretKey === "sk_test_placeholder" || 
  secretKey.includes("placeholder") || 
  secretKey.startsWith("sk_test_...") ||
  secretKey.startsWith("sk_...");

export const isStripeMock = isPlaceholder;

let stripeInstance = null;

if (!isStripeMock) {
  stripeInstance = new Stripe(secretKey, {
    apiVersion: "2023-10-16", // use standard api version
    typescript: false,
  });
} else {
  console.warn("⚠️ Stripe: Secret key is missing or placeholder. Running in Mock billing mode.");
}

export const stripe = stripeInstance;
