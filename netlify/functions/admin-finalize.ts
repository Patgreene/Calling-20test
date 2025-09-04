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

  const { recording_id, total_chunks, total_duration } = requestBody;

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
    console.log(`🏁 Finalizing recording ${recording_id} with ${total_chunks} chunks, ${total_duration}s duration`);

    // Get current recording details
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
      throw new Error("Failed to fetch recording");
    }

    const recordings = await recordingResponse.json();
    if (recordings.length === 0) {
      throw new Error("Recording not found");
    }

    // Get all chunks for verification
    const chunksResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recording_id}&upload_status=eq.uploaded&order=chunk_number.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!chunksResponse.ok) {
      throw new Error("Failed to fetch chunks");
    }

    const chunks = await chunksResponse.json();
    
    // Verify chunk integrity
    const uploadedChunks = chunks.length;
    const expectedChunks = total_chunks || uploadedChunks;
    const missingChunks = [];
    
    for (let i = 0; i < expectedChunks; i++) {
      if (!chunks.find((chunk: any) => chunk.chunk_number === i)) {
        missingChunks.push(i);
      }
    }

    // Calculate total size
    const totalSize = chunks.reduce((sum: number, chunk: any) => sum + (chunk.size_bytes || 0), 0);

    // Determine upload and verification status
    let uploadStatus = "completed";
    let verificationStatus = "verified";
    let verificationResults: any = {
      expected_chunks: expectedChunks,
      uploaded_chunks: uploadedChunks,
      missing_chunks: missingChunks,
      total_size: totalSize,
    };

    if (missingChunks.length > 0) {
      uploadStatus = "failed";
      verificationStatus = "corrupted";
    }

    // Update recording record
    const updateData = {
      upload_status: uploadStatus,
      verification_status: verificationStatus,
      duration_seconds: total_duration,
      file_size_bytes: totalSize,
      chunks_total: expectedChunks,
      chunks_uploaded: uploadedChunks,
      completed_at: new Date().toISOString(),
      verification_results: verificationResults,
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
      const errorText = await updateResponse.text();
      console.error("Failed to update recording:", errorText);
      throw new Error(`Failed to update recording: ${updateResponse.status} ${errorText}`);
    }

    const updatedRecordings = await updateResponse.json();
    const updatedRecording = updatedRecordings[0];

    console.log(`✅ Recording ${recording_id} finalized successfully`);
    console.log(`📊 Status: ${uploadStatus}, Verification: ${verificationStatus}`);
    console.log(`📈 Chunks: ${uploadedChunks}/${expectedChunks}, Size: ${Math.round(totalSize / 1024)}KB, Duration: ${total_duration}s`);

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
        message: "Recording finalized successfully",
        recording: updatedRecording,
        verification_results: verificationResults,
      }),
    };
  } catch (error: any) {
    console.error("💥 Recording finalization error:", error);

    // Try to update recording status to failed
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recording_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            upload_status: "failed",
            verification_status: "corrupted",
            last_error_message: error.message,
            completed_at: new Date().toISOString(),
          }),
        },
      );
    } catch (updateError) {
      console.error("Failed to update failed status:", updateError);
    }

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Recording finalization failed",
        message: error.message,
      }),
    };
  }
};
