const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function getRecordingChunks(recordingId: string) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recordingId}&order=chunk_number.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      return await response.json();
    } else {
      console.error("Failed to load recording chunks:", response.status);
      return [];
    }
  } catch (error) {
    console.error("Error loading recording chunks:", error);
    return [];
  }
}

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

  // Extract recording ID from path
  const pathParts = event.path.split("/");
  const idIndex = pathParts.findIndex((part) => part === "recordings") + 1;
  const id = pathParts[idIndex];

  if (!id) {
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
    console.log(`🔧 Fixing stuck recording ${id}`);

    // Get recording details
    const recordingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
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

    // Get all chunks for this recording
    const chunks = await getRecordingChunks(id);

    // Calculate verification stats
    const totalChunks = chunks.length;
    const uploadedChunks = chunks.filter(
      (c: any) => c.upload_status === "uploaded",
    ).length;
    const failedChunks = chunks.filter(
      (c: any) => c.upload_status === "failed",
    ).length;

    // Determine new status
    let uploadStatus = recording.upload_status;
    let verificationStatus = recording.verification_status;
    let message = "Recording status checked";

    if (totalChunks === 0) {
      uploadStatus = "failed";
      verificationStatus = "missing";
      message = "No chunks found - marking as failed";
    } else if (uploadedChunks > 0 && failedChunks === 0) {
      // All available chunks are uploaded successfully
      uploadStatus = "completed";
      verificationStatus = "verified";
      message = `All ${uploadedChunks} chunks verified - marking as completed`;
    } else if (uploadedChunks > 0) {
      // Some chunks uploaded, some failed
      if (uploadedChunks >= totalChunks * 0.8) {
        // If 80% or more chunks are uploaded, consider it completed with warning
        uploadStatus = "completed";
        verificationStatus = "verified";
        message = `Mostly complete - ${uploadedChunks}/${totalChunks} chunks uploaded`;
      } else {
        uploadStatus = "failed";
        verificationStatus =
          failedChunks > uploadedChunks ? "corrupted" : "missing";
        message = `Partial upload detected - ${uploadedChunks}/${totalChunks} chunks`;
      }
    } else {
      uploadStatus = "failed";
      verificationStatus = "missing";
      message = "No successful uploads found";
    }

    // Update recording status with corrected chunk counts
    const actualTotalChunks = Math.max(
      recording.chunks_total || 0,
      totalChunks,
      uploadedChunks,
    );

    const updateData: any = {
      upload_status: uploadStatus,
      verification_status: verificationStatus,
      chunks_total: actualTotalChunks,
      chunks_uploaded: uploadedChunks,
      updated_at: new Date().toISOString(),
    };

    if (uploadedChunks > 0) {
      const uploadedChunkData = chunks.filter(
        (c: any) => c.upload_status === "uploaded",
      );
      const totalSize = uploadedChunkData.reduce(
        (sum: number, chunk: any) => sum + (chunk.chunk_size_bytes || 0),
        0,
      );
      updateData.file_size_bytes = totalSize;
    }

    if (uploadStatus === "failed") {
      updateData.last_error_message = `Fix attempted: ${message}`;
    }

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
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
        body: JSON.stringify({ error: "Failed to update recording status" }),
      };
    }

    const updatedRecordings = await updateResponse.json();
    console.log(`✅ Recording ${id} fixed: ${message}`);

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
        message: message,
        recording: updatedRecordings[0],
        stats: {
          totalChunks,
          uploadedChunks,
          failedChunks,
          newStatus: uploadStatus,
          newVerification: verificationStatus,
        },
      }),
    };
  } catch (error: any) {
    console.error(`Fix error for recording ${id}:`, error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Fix failed",
        details: error.message,
      }),
    };
  }
};
