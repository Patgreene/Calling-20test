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

  // Handle GET requests (list recordings)
  if (event.httpMethod === "GET") {
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
      console.error("GET /admin/recordings error:", error);
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
  }

  // Handle POST requests (create new recording session)
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const {
        action,
        call_code,
        mime_type,
        voucher_name,
        vouchee_name,
        voucher_email,
        voucher_phone,
      } = body;

      if (action !== "start_recording") {
        return {
          statusCode: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ error: "Invalid action" }),
        };
      }

      // Create new recording session
      const recordingData = {
        call_code: call_code || `REC-${Date.now()}`,
        file_name: `${call_code || `REC-${Date.now()}`}.webm`,
        mime_type: mime_type || "audio/webm",
        upload_status: "uploading",
        verification_status: "pending",
        voucher_name: voucher_name || null,
        vouchee_name: vouchee_name || null,
        voucher_email: voucher_email || null,
        voucher_phone: voucher_phone || null,
        chunks_total: 0,
        chunks_uploaded: 0,
        retry_count: 0,
      };

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings`,
        {
          method: "POST",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify(recordingData),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create recording: ${response.statusText}`);
      }

      const recording = await response.json();
      const recordingId = recording[0]?.id;

      if (!recordingId) {
        throw new Error("No recording ID returned from database");
      }

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          success: true,
          recording_id: recordingId,
          message: "Recording session created successfully",
        }),
      };
    } catch (error: any) {
      console.error("POST /admin/recordings error:", error);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to create recording session",
          details: error.message,
        }),
      };
    }
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};
