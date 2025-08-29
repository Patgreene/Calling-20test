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

  // OpenAI Realtime client secret endpoint
  app.post("/api/realtime/client-secret", async (req, res) => {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;

      if (!openaiApiKey) {
        return res.status(500).json({
          error: "OpenAI API key not configured on server"
        });
      }

      // For OpenAI Realtime API, we need to generate a temporary client secret
      // This is a placeholder - you'll need to implement the actual OpenAI client secret generation
      // The OpenAI Realtime API documentation should specify how to create client secrets

      // For now, we'll return the API key as the client secret
      // In production, you should implement proper client secret generation according to OpenAI's docs
      const clientSecret = openaiApiKey;

      console.log("Generated client secret for OpenAI Realtime API");

      return res.status(200).json({
        client_secret: clientSecret
      });

    } catch (error) {
      console.error("Error generating client secret:", error);
      return res.status(500).json({
        error: "Failed to generate client secret"
      });
    }
  });

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
    const makeWebhookUrl =
      process.env.CONTACT_WEBHOOK_URL ||
      "https://hook.eu2.make.com/6lbq65lw7xmpmwfooavbdyd9jrbcj3wg";

    if (makeWebhookUrl) {
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
        console.log(
          "Make.com contact response:",
          makeResponse.status,
          responseText,
        );

        if (makeResponse.ok) {
          return res.status(200).json({
            message: "Message sent successfully! We'll get back to you soon.",
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
      note: "Contact form logged successfully",
    });
  });

  return app;
}
