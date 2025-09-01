// Vercel serverless function for /api/admin/recordings/[id]
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function getRecordingDetails(recordingId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}&select=*`,
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
      return data.length > 0 ? data[0] : null;
    } else {
      console.error("Failed to load recording details:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error loading recording details:", error);
    return null;
  }
}

async function getRecordingChunks(recordingId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recordingId}&order=chunk_number.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
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

async function deleteChunksFromStorage(chunks) {
  let deletedCount = 0;
  const deleteResults = [];

  for (const chunk of chunks) {
    if (chunk.storage_path) {
      try {
        // Delete chunk from Supabase Storage
        const response = await fetch(
          `${SUPABASE_URL}/storage/v1/object/interview-recordings/${chunk.storage_path}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
          }
        );

        if (response.ok) {
          deletedCount++;
          deleteResults.push({
            chunk_number: chunk.chunk_number,
            storage_path: chunk.storage_path,
            status: 'deleted'
          });
          console.log(`✅ Deleted chunk ${chunk.chunk_number} from storage`);
        } else {
          console.warn(`⚠️ Failed to delete chunk ${chunk.chunk_number} from storage:`, response.status);
          deleteResults.push({
            chunk_number: chunk.chunk_number,
            storage_path: chunk.storage_path,
            status: 'failed',
            error: `Storage deletion failed: ${response.status}`
          });
        }
      } catch (error) {
        console.error(`❌ Error deleting chunk ${chunk.chunk_number} from storage:`, error);
        deleteResults.push({
          chunk_number: chunk.chunk_number,
          storage_path: chunk.storage_path,
          status: 'error',
          error: error.message
        });
      }
    } else {
      deleteResults.push({
        chunk_number: chunk.chunk_number,
        status: 'skipped',
        reason: 'No storage path'
      });
    }
  }

  return {
    total_chunks: chunks.length,
    deleted_count: deletedCount,
    results: deleteResults
  };
}

async function deleteRecordingChunks(recordingId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recordingId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      }
    );

    if (response.ok) {
      console.log(`✅ Deleted chunk records for recording ${recordingId}`);
      return true;
    } else {
      console.error("Failed to delete recording chunks from database:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error deleting recording chunks from database:", error);
    return false;
  }
}

async function deleteRecordingEvents(recordingId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_events?recording_id=eq.${recordingId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      }
    );

    if (response.ok) {
      console.log(`✅ Deleted event records for recording ${recordingId}`);
      return true;
    } else {
      console.error("Failed to delete recording events from database:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error deleting recording events from database:", error);
    return false;
  }
}

async function deleteRecordingRecord(recordingId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
      {
        method: "DELETE",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      }
    );

    if (response.ok) {
      console.log(`✅ Deleted recording record ${recordingId}`);
      return true;
    } else {
      console.error("Failed to delete recording from database:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error deleting recording from database:", error);
    return false;
  }
}

async function logRecordingEvent(recordingId, eventType, eventData = {}) {
  try {
    const eventRecord = {
      recording_id: recordingId,
      event_type: eventType,
      event_data: eventData
    };

    const response = await fetch(`${SUPABASE_URL}/rest/v1/recording_events`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(eventRecord),
    });

    if (!response.ok) {
      console.warn("Failed to log recording event:", response.status);
    }
  } catch (error) {
    console.warn("Error logging recording event:", error);
  }
}

async function deleteRecording(recordingId) {
  const deleteOperation = {
    recording_id: recordingId,
    started_at: new Date().toISOString(),
    steps: [],
    errors: []
  };

  try {
    console.log(`🗑️ Starting deletion process for recording ${recordingId}`);

    // Step 1: Get recording details for logging
    const recording = await getRecordingDetails(recordingId);
    if (!recording) {
      throw new Error("Recording not found");
    }

    deleteOperation.recording_details = {
      call_code: recording.call_code,
      created_at: recording.created_at,
      file_size: recording.file_size_bytes,
      duration: recording.duration_seconds
    };

    // Step 2: Log deletion start event
    await logRecordingEvent(recordingId, 'deletion_started', deleteOperation);

    // Step 3: Get all chunks
    const chunks = await getRecordingChunks(recordingId);
    deleteOperation.steps.push({
      step: 'get_chunks',
      status: 'completed',
      chunks_found: chunks.length
    });

    // Step 4: Delete chunks from storage
    const storageDeleteResult = await deleteChunksFromStorage(chunks);
    deleteOperation.steps.push({
      step: 'delete_storage_files',
      status: storageDeleteResult.deleted_count === chunks.length ? 'completed' : 'partial',
      result: storageDeleteResult
    });

    if (storageDeleteResult.deleted_count < chunks.length) {
      deleteOperation.errors.push(`Only ${storageDeleteResult.deleted_count}/${chunks.length} chunks deleted from storage`);
    }

    // Step 5: Delete chunk records from database
    const chunksDeleted = await deleteRecordingChunks(recordingId);
    deleteOperation.steps.push({
      step: 'delete_chunk_records',
      status: chunksDeleted ? 'completed' : 'failed'
    });

    if (!chunksDeleted) {
      deleteOperation.errors.push("Failed to delete chunk records from database");
    }

    // Step 6: Delete event records from database (except the deletion events)
    const eventsDeleted = await deleteRecordingEvents(recordingId);
    deleteOperation.steps.push({
      step: 'delete_event_records',
      status: eventsDeleted ? 'completed' : 'failed'
    });

    if (!eventsDeleted) {
      deleteOperation.errors.push("Failed to delete event records from database");
    }

    // Step 7: Delete the main recording record
    const recordingDeleted = await deleteRecordingRecord(recordingId);
    deleteOperation.steps.push({
      step: 'delete_recording_record',
      status: recordingDeleted ? 'completed' : 'failed'
    });

    if (!recordingDeleted) {
      deleteOperation.errors.push("Failed to delete recording record from database");
      throw new Error("Failed to delete recording record");
    }

    deleteOperation.completed_at = new Date().toISOString();
    deleteOperation.success = deleteOperation.errors.length === 0;

    console.log(`✅ Recording ${recordingId} deletion completed with ${deleteOperation.errors.length} errors`);

    return deleteOperation;

  } catch (error) {
    deleteOperation.completed_at = new Date().toISOString();
    deleteOperation.success = false;
    deleteOperation.errors.push(error.message);

    console.error(`❌ Recording ${recordingId} deletion failed:`, error);

    // Try to log the deletion failure (if the recording still exists)
    try {
      await logRecordingEvent(recordingId, 'deletion_failed', deleteOperation);
    } catch (logError) {
      console.warn("Failed to log deletion failure:", logError);
    }

    throw error;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: "Recording ID is required" });
  }

  if (req.method === "DELETE") {
    const { password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const deleteResult = await deleteRecording(id);

      if (deleteResult.success) {
        res.json({
          success: true,
          recording_id: id,
          delete_operation: deleteResult,
          message: "Recording deleted successfully"
        });
      } else {
        res.status(400).json({
          success: false,
          recording_id: id,
          delete_operation: deleteResult,
          error: "Recording deletion completed with errors",
          errors: deleteResult.errors
        });
      }

    } catch (error) {
      console.error("Delete recording error:", error);
      res.status(500).json({ 
        error: "Failed to delete recording",
        details: error.message 
      });
    }
  } 
  else if (req.method === "GET") {
    // Get specific recording details
    try {
      const recording = await getRecordingDetails(id);
      
      if (!recording) {
        return res.status(404).json({ error: "Recording not found" });
      }

      const chunks = await getRecordingChunks(id);
      
      res.json({
        success: true,
        recording: recording,
        chunks: chunks,
        chunk_count: chunks.length
      });

    } catch (error) {
      console.error("Get recording error:", error);
      res.status(500).json({ 
        error: "Failed to get recording details",
        details: error.message 
      });
    }
  }
  else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
