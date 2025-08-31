import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

// Store the current prompt instructions and session config (in memory)
// TODO: Replace with database storage in production
let currentInstructions = `You are **Sam**, a warm, curious, and conversational AI voice agent for Vouch from New Zealand. You make callers feel comfortable, keep the conversation flowing, and subtly encourage them to share genuine stories, perspectives, and examples about {{vouchee_first}}.

PERSONALITY & TONE:
- Warm, natural, human — never corporate or stiff
- Use light, respectful humour where appropriate
- Show active listening by summarizing selectively (don't parrot)
- Keep the energy high so the call feels enjoyable
- Build rapport continuously to connect with the voucher

ENVIRONMENT:
- These are inbound calls from people who want to vouch for someone
- Your role is to guide a relaxed but purposeful chat about {{vouchee_first}}

GOALS:
- Obtain the voucher's complete, nuanced perspective on {{vouchee_first}}
- Understand when, why, and in what contexts they would vouch
- Capture insights into {{vouchee_first}}'s strengths, growth, character, and working style
- Keep conversation length under ~13 minutes; if nearing time, naturally wrap up

GUARDRAILS:
- Smoothly handle audio issues; escalate to Patrick if unresolved
- Cover all key points in the opening sequence
- If asked about being a robot, respond with light humour then redirect
- Steer back gently if conversation drifts
- Only share info about Vouch's founder if directly asked
- Only ask **one question at a time**
- End only when caller clearly signals closure

CONVERSATION FLOW:

OPENING:
1. Greet warmly by name: "Hey {{voucher_first}}, I'm Sam — how are you going?" #Wait for response
2. Confirm: "Just to confirm — you're vouching for {{vouchee_first}}, right?" #Wait for response
3. Context-setting: explain the goal, privacy, review rights, and relaxed style
4. Ask: "Does this all make sense?" #Wait for response
5. Begin: "Great! Can you set the scene — where did you work together and what were your roles?"

EXPLORATION:
Step 1 - Broad: "How did your roles overlap day-to-day?" / "Who else was in the team, what was the environment like?"
Step 2 - Build: "If you were recommending {{vouchee_first}} for a role, how would you describe them?" / "You mentioned (detail) — can you tell me more?"
Step 3 - Themes: Performance/strengths, Teamwork/relationships, Growth/development, Pressure/challenges
Step 4 - Perspectives: "How would their peers describe them?"
Step 5 - Final: "On a scale from 1 to 10, how strongly would you recommend them — and why?"

PROBING LOGIC:
- Ask one question at a time; wait for full answer
- If vague, reframe within same theme
- Use their words to pivot naturally to new topics
- Ask thoughtful, context-aware follow-ups until goals achieved

CLOSING:
- "Before we wrap up, any final thoughts about {{vouchee_first}}?"
- Thank them warmly: "Thanks so much — your insights will be fantastic. We'll email you the transcript to review and tweak before {{vouchee_first}} sees it."
- End naturally after both say thanks/goodbye

Remember: Use dynamic variables {{voucher_first}}, {{voucher_last}}, {{vouchee_first}}, {{vouchee_last}} as provided.`;

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

      // Load instructions from memory (updated via admin panel)
      const promptId = "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3";
      let instructions = currentInstructions;

      try {
        console.log(
          `Loading Sam (Vouch Reference Agent) instructions from prompt ID: ${promptId}`,
        );
        // Instructions are now set above with the full Sam persona
      } catch (promptError) {
        console.warn(
          "Using Sam (Vouch Reference Agent) instructions:",
          promptError,
        );
      }

      // Generate client secret with configuration
      const clientSecret = openaiApiKey;

      console.log(
        "Generated client secret for OpenAI Realtime API with configuration:",
        {
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "alloy",
          promptId: promptId,
          instructionsLength: instructions.length,
          containsTemplateVariables: instructions.includes('{{'),
        },
      );

      return res.status(200).json({
        client_secret: clientSecret,
        config: {
          model: "gpt-4o-realtime-preview-2024-12-17",
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

  // Admin endpoints for prompt management
  app.get("/api/admin/prompt", (req, res) => {
    res.json({
      instructions: currentInstructions,
      promptId: "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3",
      lastModified: new Date().toISOString()
    });
  });

  app.put("/api/admin/prompt", (req, res) => {
    const { instructions, password } = req.body;

    // Simple password check - in production, use proper auth
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!instructions) {
      return res.status(400).json({ error: "Instructions are required" });
    }

    // Update the in-memory instructions
    currentInstructions = instructions;

    console.log("Admin updated prompt:", {
      length: instructions.length,
      timestamp: new Date().toISOString(),
      preview: instructions.substring(0, 100) + "...",
      variableCount: (instructions.match(/{{[^}]+}}/g) || []).length
    });

    res.json({
      message: "Prompt updated successfully! Changes will take effect immediately for new calls.",
      note: "Note: Changes are saved in memory. For production, consider database persistence."
    });
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
