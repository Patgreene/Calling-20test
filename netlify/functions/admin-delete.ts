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
        "Access-Control-Allow-Methods": "DELETE, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "DELETE") {
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

  // Admin pages are already protected by AdminProtectedRoute
  // No additional password check needed

  try {
    console.log(`🗑️ Starting deletion process for recording ${id}`);

    // Get recording details first
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

    // Delete chunks from storage
    for (const chunk of chunks) {
      if (chunk.upload_status === "uploaded" && chunk.storage_path) {
        try {
          const deleteChunkResponse = await fetch(
            `${SUPABASE_URL}/storage/v1/object/audio-chunks/${chunk.storage_path}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              },
            },
          );

          if (deleteChunkResponse.ok) {
            console.log(`✅ Deleted chunk ${chunk.chunk_number} from storage`);
          } else {
            console.warn(
              `⚠️ Failed to delete chunk ${chunk.chunk_number} from storage:`,
              deleteChunkResponse.status,
            );
          }
        } catch (error) {
          console.error(
            `❌ Error deleting chunk ${chunk.chunk_number} from storage:`,
            error,
          );
        }
      }
    }

    // Delete chunk records from database
    const deleteChunksResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      },
    );

    if (deleteChunksResponse.ok) {
      console.log(`✅ Deleted chunk records for recording ${id}`);
    } else {
      console.error(
        "Failed to delete recording chunks from database:",
        deleteChunksResponse.status,
      );
    }

    // Delete event records
    const deleteEventsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_events?recording_id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      },
    );

    if (deleteEventsResponse.ok) {
      console.log(`✅ Deleted event records for recording ${id}`);
    } else {
      console.error(
        "Failed to delete recording events from database:",
        deleteEventsResponse.status,
      );
    }

    // Delete transcription records (if any)
    try {
      const deleteTranscriptionsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/transcriptions?recording_id=eq.${id}`,
        {
          method: "DELETE",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
        },
      );

      if (deleteTranscriptionsResponse.ok) {
        console.log(`✅ Deleted transcription records for recording ${id}`);
      }
    } catch (error) {
      console.warn("Error deleting transcriptions:", error);
    }

    // Finally, delete the main recording record
    const deleteRecordingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      },
    );

    if (deleteRecordingResponse.ok) {
      console.log(`✅ Successfully deleted recording ${id}`);
      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "DELETE, OPTIONS",
        },
        body: JSON.stringify({
          success: true,
          message: `Recording ${id} and all associated data deleted successfully`,
          deletedChunks: chunks.length,
        }),
      };
    } else {
      console.error(
        "Failed to delete main recording:",
        deleteRecordingResponse.status,
      );
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to delete recording record",
          details: `Status: ${deleteRecordingResponse.status}`,
        }),
      };
    }
  } catch (error: any) {
    console.error(`Delete error for recording ${id}:`, error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Delete failed",
        details: error.message,
      }),
    };
  }
};
