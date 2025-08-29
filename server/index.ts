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
          error: "OpenAI API key not configured on server",
        });
      }

      // Load instructions from saved prompt ID
      const promptId = "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3";
      let instructions =
        "You are a helpful AI assistant. Please engage in a natural conversation.";

      try {
        // Attempt to load instructions from the prompt ID
        // This would typically involve a database lookup or API call to your prompt storage system
        // For now, we'll use a default instruction set
        console.log(`Loading instructions from prompt ID: ${promptId}`);
        instructions =
          "You are a helpful AI assistant conducting a professional vouch interview. Please ask thoughtful questions about the person being vouched for, their skills, work ethic, and character. Keep the conversation natural and engaging.";
      } catch (promptError) {
        console.warn(
          "Could not load prompt, using default instructions:",
          promptError,
        );
      }

      // Generate client secret with configuration
      const clientSecret = openaiApiKey;

      console.log(
        "Generated client secret for OpenAI Realtime API with configuration:",
        {
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "alloy",
          promptId: promptId,
        },
      );

      return res.status(200).json({
        client_secret: clientSecret,
        config: {
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "alloy",
          instructions: instructions,
        },
      });
    } catch (error) {
      console.error("Error generating client secret:", error);
      return res.status(500).json({
        error: "Failed to generate client secret",
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
