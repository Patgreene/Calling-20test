// Vercel serverless function for /api/realtime/client-secret
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      return res.status(500).json({
        error: "OpenAI API key not configured on server",
      });
    }

    // Generate client secret with configuration
    const clientSecret = openaiApiKey;

    return res.status(200).json({
      client_secret: clientSecret,
      config: {
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "alloy",
        instructions: "You are a helpful assistant.",
        sessionConfig: {
          voice: "alloy",
          speed: 1.0,
          temperature: 0.8,
          max_response_output_tokens: 4096,
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error generating client secret:", error);
    return res.status(500).json({
      error: "Failed to generate client secret",
    });
  }
}
