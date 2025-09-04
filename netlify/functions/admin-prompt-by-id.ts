const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  // Extract prompt ID from path or query parameters
  let promptId = event.queryStringParameters?.id;

  if (!promptId) {
    // Try to extract from path
    const pathParts = event.path.split("/");
    const promptIndex = pathParts.findIndex((part) => part === "prompt");
    if (promptIndex >= 0 && promptIndex + 1 < pathParts.length) {
      promptId = pathParts[promptIndex + 1];
    }
  }

  if (!promptId) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Prompt ID is required" }),
    };
  }

  if (event.httpMethod === "GET") {
    try {
      console.log(`📋 Fetching prompt ${promptId}`);

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_prompts?id=eq.${promptId}`,
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
          `Failed to fetch prompt: ${response.status} ${response.statusText}`,
        );
      }

      const prompts = await response.json();

      if (prompts.length === 0) {
        return {
          statusCode: 404,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Prompt not found" }),
        };
      }

      const prompt = prompts[0];

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify({
          success: true,
          prompt: prompt,
        }),
      };
    } catch (error: any) {
      console.error("💥 Get prompt error:", error);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to fetch prompt",
          message: error.message,
        }),
      };
    }
  }

  if (event.httpMethod === "POST") {
    try {
      console.log(`🔄 Reverting to prompt ${promptId}`);

      // First, set all prompts to inactive
      const deactivateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_prompts`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_active: false }),
        },
      );

      if (!deactivateResponse.ok) {
        throw new Error("Failed to deactivate prompts");
      }

      // Then activate the selected prompt
      const activateResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_prompts?id=eq.${promptId}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({ is_active: true }),
        },
      );

      if (!activateResponse.ok) {
        throw new Error("Failed to activate prompt");
      }

      const updatedPrompts = await activateResponse.json();
      const updatedPrompt = updatedPrompts[0];

      console.log(`✅ Successfully reverted to prompt ${promptId}`);

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
        body: JSON.stringify({
          success: true,
          message: "Successfully reverted to selected prompt",
          prompt: updatedPrompt,
        }),
      };
    } catch (error: any) {
      console.error("💥 Revert prompt error:", error);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to revert prompt",
          message: error.message,
        }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};
