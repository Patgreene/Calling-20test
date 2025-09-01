// Vercel serverless function for /api/admin/prompt
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function savePromptToSupabase(prompt, sessionConfig) {
  try {
    // Step 1: Set all existing entries to inactive (is_active = false)
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?is_active=eq.true`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          is_active: false,
        }),
      },
    );

    if (!updateResponse.ok) {
      console.warn("Failed to deactivate old entries:", updateResponse.status);
    }

    // Step 2: Save the new entry as active
    const dataToSave = {
      prompt: prompt,
      is_active: true, // Only the new entry should be active
    };

    // Add session config fields if provided
    if (sessionConfig) {
      dataToSave.voice = sessionConfig.voice;
      dataToSave.speed = sessionConfig.speed;
      dataToSave.temperature = sessionConfig.temperature;
      dataToSave.max_response_tokens = sessionConfig.max_response_output_tokens;
      dataToSave.vad_threshold = sessionConfig.turn_detection?.threshold;
      dataToSave.silence_duration_ms =
        sessionConfig.turn_detection?.silence_duration_ms;
      dataToSave.prefix_padding_ms =
        sessionConfig.turn_detection?.prefix_padding_ms;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/interview_prompts`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(dataToSave),
    });

    if (response.ok) {
      console.log("Prompt saved and all old entries deactivated successfully");
      return true;
    } else {
      console.error("Failed to save to Supabase:", response.status);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return false;
    }
  } catch (error) {
    console.error("Error saving to Supabase:", error);
    return false;
  }
}

async function loadLatestPromptFromSupabase() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&order=created_at.desc&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        const latestRecord = data[0];
        return {
          instructions: latestRecord.prompt,
          sessionConfig: {
            voice: latestRecord.voice || "alloy",
            speed: parseFloat(latestRecord.speed) || 1.0,
            temperature: parseFloat(latestRecord.temperature) || 0.8,
            max_response_output_tokens:
              parseInt(latestRecord.max_response_tokens) || 4096,
            turn_detection: {
              type: "server_vad",
              threshold: parseFloat(latestRecord.vad_threshold) || 0.5,
              prefix_padding_ms:
                parseInt(latestRecord.prefix_padding_ms) || 300,
              silence_duration_ms:
                parseInt(latestRecord.silence_duration_ms) || 500,
            },
          },
          created_at: latestRecord.created_at,
        };
      }
    }
  } catch (error) {
    console.warn("Error loading prompt from Supabase:", error);
  }

  return null;
}

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

  if (req.method === "GET") {
    // Get current prompt
    try {
      const promptData = await loadLatestPromptFromSupabase();
      if (promptData) {
        res.json(promptData);
      } else {
        res.json({
          instructions: "Default prompt not found",
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
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to load prompt" });
    }
  } else if (req.method === "PUT") {
    // Save prompt
    const { instructions, sessionConfig, password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!instructions) {
      return res.status(400).json({ error: "Instructions are required" });
    }

    try {
      const saveSuccess = await savePromptToSupabase(
        instructions,
        sessionConfig,
      );

      if (saveSuccess) {
        res.json({
          message:
            "Prompt and settings saved to Supabase successfully! Changes will take effect immediately for new calls.",
          savedToSupabase: true,
        });
      } else {
        res.status(500).json({
          error: "Failed to save prompt to Supabase. Please try again.",
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to save prompt" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
