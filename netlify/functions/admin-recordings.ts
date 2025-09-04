const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function loadRecordings() {
  try {
    // Fetch recordings
    const recordingsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!recordingsResponse.ok) {
      console.error("Failed to load recordings:", recordingsResponse.status);
      return [];
    }

    const recordings = await recordingsResponse.json();

    // Fetch transcriptions
    let transcriptions = [];
    try {
      const transcriptionsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/transcriptions?select=id,recording_id,status,transcript_text,created_at,completed_at`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (transcriptionsResponse.ok) {
        transcriptions = await transcriptionsResponse.json();
      }
    } catch (transcriptionError) {
      console.warn("Failed to load transcriptions:", transcriptionError);
    }

    // Combine recordings with their transcriptions
    const recordingsWithTranscriptions = recordings.map((recording: any) => {
      const transcription = transcriptions.find(
        (t: any) => t.recording_id === recording.id,
      );
      return {
        ...recording,
        transcription: transcription || null,
      };
    });

    return recordingsWithTranscriptions;
  } catch (error) {
    console.error("Error in loadRecordings:", error);
    throw error;
  }
}

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const recordings = await loadRecordings();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        recordings: recordings,
        total: recordings.length,
      }),
    };
  } catch (error: any) {
    console.error("GET /api/admin/recordings error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to load recordings",
        details: error.message,
      }),
    };
  }
};
