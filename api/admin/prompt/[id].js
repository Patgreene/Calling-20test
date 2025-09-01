// Vercel serverless function for /api/admin/prompt/[id]
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_prompts?select=*&id=eq.${id}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        res.json({
          instructions: data[0].prompt,
          sessionConfig: {
            voice: data[0].voice || 'alloy',
            speed: parseFloat(data[0].speed) || 1.0,
            temperature: parseFloat(data[0].temperature) || 0.8,
            max_response_output_tokens: parseInt(data[0].max_response_tokens) || 4096,
            turn_detection: {
              type: 'server_vad',
              threshold: parseFloat(data[0].vad_threshold) || 0.5,
              prefix_padding_ms: parseInt(data[0].prefix_padding_ms) || 300,
              silence_duration_ms: parseInt(data[0].silence_duration_ms) || 500
            }
          },
          created_at: data[0].created_at
        });
      } else {
        res.status(404).json({ error: "Prompt not found" });
      }
    } else {
      res.status(500).json({ error: "Failed to load prompt" });
    }
  } catch (error) {
    console.error("Error loading prompt:", error);
    res.status(500).json({ error: "Failed to load prompt" });
  }
}
