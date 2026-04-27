// Vercel Serverless Function: Stripe webhook receiver
// POST /api/stripe-webhook
// Stripe sends events here. bodyParser must be disabled for signature verification.
//
// Environment variables required:
//   STRIPE_SECRET_KEY      — Stripe secret key
//   STRIPE_WEBHOOK_SECRET  — Webhook signing secret from Stripe Dashboard

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey     = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey || !webhookSecret) {
    return res.status(500).json({ error: "Stripe webhook not configured" });
  }

  // Read raw body for signature verification
  const rawBody = await readRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = await verifyStripeSignature(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature error:", err.message);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // Handle subscription events (logged for monitoring)
  switch (event.type) {
    case "checkout.session.completed":
      console.log("[stripe-webhook] checkout.session.completed:", event.data.object.id);
      break;
    case "customer.subscription.deleted":
      console.log("[stripe-webhook] subscription.deleted:", event.data.object.id);
      break;
    default:
      break;
  }

  return res.status(200).json({ received: true });
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function verifyStripeSignature(payload, sig, secret) {
  // Stripe HMAC-SHA256 webhook signature verification (without the Stripe SDK)
  const encoder = new TextEncoder();

  // Extract timestamp and signatures from header
  const parts = sig.split(",");
  const ts = parts.find(p => p.startsWith("t="))?.slice(2);
  const v1 = parts.find(p => p.startsWith("v1="))?.slice(3);
  if (!ts || !v1) throw new Error("Invalid signature header");

  // Verify timestamp tolerance (5 minutes)
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) {
    throw new Error("Timestamp too old");
  }

  const signedPayload = `${ts}.${payload}`;
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const expected = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (expected !== v1) throw new Error("Signature mismatch");

  return JSON.parse(payload);
}
