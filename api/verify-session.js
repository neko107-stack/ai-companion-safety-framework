// Vercel Serverless Function: Verify Stripe Checkout session
// GET /api/verify-session?session={checkoutSessionId}
// Returns { valid: boolean, email?: string }
//
// Called by the app after Stripe redirects back on success.

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { session } = req.query;
  if (!session || typeof session !== "string") {
    return res.status(400).json({ error: "session parameter required" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: "Stripe is not configured" });
  }

  try {
    const r = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const s = await r.json();

    if (s.error) throw new Error(s.error.message);

    if (s.payment_status === "paid") {
      return res.status(200).json({
        valid: true,
        email: s.customer_details?.email || null,
      });
    }

    return res.status(200).json({ valid: false });
  } catch (err) {
    console.error("[api/verify-session] error:", err.message);
    return res.status(200).json({ valid: false });
  }
}
