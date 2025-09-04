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
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Invalid JSON in request body" }),
    };
  }

  const { recording_id } = requestBody;

  if (!recording_id) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Recording ID is required" }),
    };
  }

  try {
    console.log(`🔄 Retrying failed upload for recording ${recording_id}`);

    // Get recording details
    const recordingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recording_id}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!recordingResponse.ok) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Recording not found" }),
      };
    }

    const recordings = await recordingResponse.json();
    if (recordings.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Recording not found" }),
      };
    }

    const recording = recordings[0];

    // Reset recording status to allow retry
    const updateData = {
      upload_status: "uploading",
      verification_status: "pending",
      retry_count: (recording.retry_count || 0) + 1,
      last_error_message: null,
      updated_at: new Date().toISOString(),
    };

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recording_id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateData),
      },
    );

    if (!updateResponse.ok) {
      console.error("Failed to update recording:", updateResponse.status);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to reset recording status for retry",
        }),
      };
    }

    const updatedRecordings = await updateResponse.json();
    console.log(
      `✅ Recording ${recording_id} reset for retry (attempt ${updateData.retry_count})`,
    );

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        message: `Recording reset for retry attempt ${updateData.retry_count}`,
        recording: updatedRecordings[0],
      }),
    };
  } catch (error: any) {
    console.error(`Retry error for recording ${recording_id}:`, error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Retry failed",
        details: error.message,
      }),
    };
  }
};
