// Vercel Serverless Function: Create Stripe Checkout session
// POST /api/stripe-checkout
//
// Environment variables required:
//   STRIPE_SECRET_KEY    — Stripe secret key
//   STRIPE_PRICE_ID      — Stripe Price ID for the ¥300/month plan
//   NEXT_PUBLIC_APP_URL  — App base URL (e.g. https://your-app.vercel.app)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId   = process.env.STRIPE_PRICE_ID;
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173";

  if (!stripeKey || !priceId) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  try {
    const body = new URLSearchParams({
      "payment_method_types[0]": "card",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "mode": "subscription",
      "success_url": `${appUrl}/?supporter_session={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${appUrl}/?plan_cancelled=1`,
      "locale": "ja",
    });

    const res2 = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const session = await res2.json();
    if (session.error) throw new Error(session.error.message);

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[api/stripe-checkout] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
