import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    res.json({ message: "Hello from Express server v2!" });
  });

  app.get("/api/demo", handleDemo);

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    const { name, email, comment } = req.body;

    // Basic validation
    if (!name || !email || !comment) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Log the contact form submission
    console.log("Contact form submission:", {
      name,
      email,
      comment,
      timestamp: new Date().toISOString(),
    });

    // Send to Make.com webhook
    const makeWebhookUrl = process.env.CONTACT_WEBHOOK_URL || "REPLACE_WITH_YOUR_WEBHOOK_URL";

    if (makeWebhookUrl && makeWebhookUrl !== "REPLACE_WITH_YOUR_WEBHOOK_URL") {
      try {
        const payload = {
          type: "contact_form",
          name: name,
          email: email,
          message: comment,
          timestamp: new Date().toISOString(),
          recipient: "patrick@vouchprofile.com",
        };

        const makeResponse = await fetch(makeWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responseText = await makeResponse.text();
        console.log("Make.com contact response:", makeResponse.status, responseText);

        if (makeResponse.ok) {
          return res.status(200).json({
            message: "Message sent successfully! We'll get back to you soon."
          });
        } else {
          console.error("Make.com error:", responseText);
        }
      } catch (makeError) {
        console.error("Error sending to Make.com:", makeError);
      }
    }

    // Fallback response
    return res.status(200).json({
      message: "Message received successfully! We'll get back to you soon.",
      note: "Contact form logged successfully"
    });
  });

  return app;
}
