const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    console.log("📋 Fetching prompt history");

    // Get all prompts ordered by creation date (newest first)
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch prompts: ${response.status} ${response.statusText}`,
      );
    }

    const prompts = await response.json();

    // Format the prompts for the frontend
    const formattedPrompts = prompts.map((prompt: any) => ({
      id: prompt.id,
      prompt: prompt.prompt,
      created_at: prompt.created_at,
      is_active: prompt.is_active,
      voice: prompt.voice,
      speed: prompt.speed,
      temperature: prompt.temperature,
      max_response_tokens: prompt.max_response_tokens,
      vad_threshold: prompt.vad_threshold,
      prefix_padding_ms: prompt.prefix_padding_ms,
      silence_duration_ms: prompt.silence_duration_ms,
      length: prompt.prompt ? prompt.prompt.length : 0,
    }));

    console.log(`✅ Retrieved ${formattedPrompts.length} prompts from history`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        prompts: formattedPrompts,
      }),
    };
  } catch (error: any) {
    console.error("💥 Prompt history error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to fetch prompt history",
        message: error.message,
      }),
    };
  }
};
