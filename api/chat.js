// Vercel Serverless Function: AI proxy for hosted tiers
// POST /api/chat
// Body: { tier, tierToken, engine, model, systemPrompt, messages }
//
// Environment variables required:
//   GEMINI_API_KEY   — Google AI Studio key (used for HOST_FREE → gemini-2.0-flash)
//   CLAUDE_API_KEY   — Anthropic key (used for SUPPORTER → claude-haiku-4-5-20251001)
//   STRIPE_SECRET_KEY — Stripe secret key (used to validate SUPPORTER tokens)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tier, tierToken, engine, model, systemPrompt, messages } = req.body;

  if (!tier || !engine || !model || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (tier !== "HOST_FREE" && tier !== "SUPPORTER") {
    return res.status(400).json({ error: "Invalid tier for proxy" });
  }

  // SUPPORTER: validate Stripe checkout session token
  if (tier === "SUPPORTER") {
    if (!tierToken) {
      return res.status(401).json({ error: "Token required for SUPPORTER tier" });
    }
    const valid = await validateSupporterToken(tierToken);
    if (!valid) {
      return res.status(401).json({ error: "Invalid or expired supporter token" });
    }
  }

  try {
    let text;
    if (engine === "gemini") {
      text = await callGemini(model, systemPrompt, messages);
    } else if (engine === "claude") {
      text = await callClaude(model, systemPrompt, messages);
    } else {
      return res.status(400).json({ error: "Unsupported engine: " + engine });
    }
    return res.status(200).json({ text });
  } catch (err) {
    console.error("[api/chat] error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function validateSupporterToken(token) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return false;
  try {
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(token)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const session = await res.json();
    // Valid if the session was paid and the subscription is active
    if (session.payment_status === "paid") return true;
    // Also accept active subscriptions via subscription lookup
    if (session.subscription) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(session.subscription)}`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const sub = await subRes.json();
      return sub.status === "active" || sub.status === "trialing";
    }
    return false;
  } catch {
    return false;
  }
}

async function callGemini(model, systemPrompt, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  return d.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callClaude(model, systemPrompt, messages) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY is not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model, max_tokens: 1000, system: systemPrompt, messages }),
  });
  const d = await res.json();
  if (d.error) throw new Error(d.error.message);
  if (!d.content?.[0]?.text) throw new Error("Invalid response from Claude");
  return d.content[0].text;
}
