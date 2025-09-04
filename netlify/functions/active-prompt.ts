const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

// Default fallback prompt
const DEFAULT_INSTRUCTIONS = `You are **Sam**, a warm, curious, and conversational AI voice agent for Vouch from New Zealand. You make callers feel comfortable, keep the conversation flowing, and subtly encourage them to share genuine stories, perspectives, and examples about {{vouchee_first}}.

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

const DEFAULT_SESSION_CONFIG = {
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
};

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
      },
      body: ""
    };
  }

  try {
    // Try to fetch from Supabase
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&is_active=eq.true&limit=1`,
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
        const activePrompt = data[0];
        console.log("🔄 Fetched active prompt for call:", {
          id: activePrompt.id,
          length: activePrompt.prompt.length,
          created_at: activePrompt.created_at,
        });

        // Return the prompt and session config
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
          },
          body: JSON.stringify({
            instructions: activePrompt.prompt,
            sessionConfig: {
              voice: activePrompt.voice || "alloy",
              speed: parseFloat(activePrompt.speed) || 1.0,
              temperature: parseFloat(activePrompt.temperature) || 0.8,
              max_response_output_tokens:
                parseInt(activePrompt.max_response_tokens) || 4096,
              turn_detection: {
                type: "server_vad",
                threshold: parseFloat(activePrompt.vad_threshold) || 0.5,
                prefix_padding_ms:
                  parseInt(activePrompt.prefix_padding_ms) || 300,
                silence_duration_ms:
                  parseInt(activePrompt.silence_duration_ms) || 500,
              },
            },
            created_at: activePrompt.created_at,
            id: activePrompt.id,
          })
        };
      } else {
        // No active prompt found, return fallback
        console.log("⚠️ No active prompt found, using fallback");
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
          },
          body: JSON.stringify({
            instructions: DEFAULT_INSTRUCTIONS,
            sessionConfig: DEFAULT_SESSION_CONFIG,
            fallback: true,
          })
        };
      }
    } else {
      console.error("Failed to fetch active prompt:", response.status);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ error: "Failed to fetch active prompt" })
      };
    }
  } catch (error: any) {
    console.error("Error fetching active prompt:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ error: "Error fetching active prompt", details: error.message })
    };
  }
};
