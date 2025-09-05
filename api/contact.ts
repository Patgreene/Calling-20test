import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, message, comment } = (req.body || {}) as any;
    const msg = message ?? comment ?? "";
    if (!name || !email || !msg) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res
        .status(400)
        .json({ error: "Name, email, and message are required" });
    }

    console.log("📧 Contact form submission:", {
      name,
      email,
      message: String(msg).slice(0, 100) + "...",
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      success: true,
      message: "Thank you for your message. We'll get back to you soon!",
    });
  } catch (e: any) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res
      .status(500)
      .json({ error: "Failed to submit contact form", message: e.message });
  }
}
