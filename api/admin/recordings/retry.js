// Vercel serverless function for /api/admin/recordings/retry
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

async function getFailedChunks(recordingId) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recordingId}&upload_status=eq.failed&order=chunk_number.asc`,
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
      console.error("Failed to load failed chunks:", response.status);
      return [];
    }
  } catch (error) {
    console.error("Error loading failed chunks:", error);
    return [];
  }
}

async function retryFailedChunks(recordingId, failedChunks) {
  let retriedChunks = 0;
  let successfulRetries = 0;
  const retryResults = [];

  for (const chunk of failedChunks) {
    try {
      // Attempt to re-upload chunk from backup storage or regenerate if possible
      // For now, we'll mark the chunk for manual intervention and update its status
      
      console.log(`🔄 Attempting to retry chunk ${chunk.chunk_number} for recording ${recordingId}`);
      
      // In a production environment, you would:
      // 1. Check if the chunk exists in backup storage
      // 2. Re-upload from backup to primary storage
      // 3. Verify the upload
      // 4. Update the chunk status
      
      // For this implementation, we'll simulate a retry by checking if the file exists in storage
      const storageCheckResult = await checkChunkInStorage(recordingId, chunk.chunk_number);
      
      if (storageCheckResult.exists) {
        // Update chunk status to uploaded
        await updateChunkStatus(chunk.id, 'uploaded', storageCheckResult.storage_path);
        successfulRetries++;
        retryResults.push({
          chunk_number: chunk.chunk_number,
          status: 'success',
          message: 'Found in storage and marked as uploaded'
        });
      } else {
        // Mark for manual intervention
        await updateChunkStatus(chunk.id, 'failed', null, 'Chunk not found in storage - requires manual intervention');
        retryResults.push({
          chunk_number: chunk.chunk_number,
          status: 'failed',
          message: 'Chunk not found in storage'
        });
      }
      
      retriedChunks++;
      
    } catch (error) {
      console.error(`Failed to retry chunk ${chunk.chunk_number}:`, error);
      retryResults.push({
        chunk_number: chunk.chunk_number,
        status: 'error',
        message: error.message
      });
    }
  }

  return {
    total_retried: retriedChunks,
    successful_retries: successfulRetries,
    results: retryResults
  };
}

async function checkChunkInStorage(recordingId, chunkNumber) {
  try {
    const fileName = `recordings/${recordingId}/chunk_${chunkNumber.toString().padStart(4, '0')}.webm`;
    
    // Check if file exists in Supabase Storage
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/info/interview-recordings/${fileName}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (response.ok) {
      const fileInfo = await response.json();
      return {
        exists: true,
        storage_path: fileName,
        size: fileInfo.metadata?.size || 0
      };
    } else {
      return { exists: false };
    }
  } catch (error) {
    console.error(`Error checking chunk ${chunkNumber} in storage:`, error);
    return { exists: false };
  }
}

async function updateChunkStatus(chunkId, status, storagePath = null, errorMessage = null) {
  try {
    const updateData = {
      upload_status: status,
      updated_at: new Date().toISOString()
    };

    if (storagePath) {
      updateData.storage_path = storagePath;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?id=eq.${chunkId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      console.warn(`Failed to update chunk ${chunkId} status:`, response.status);
    }
  } catch (error) {
    console.warn(`Error updating chunk ${chunkId} status:`, error);
  }
}

async function updateRecordingRetryCount(recordingId) {
  try {
    // Get current retry count
    const recording = await getRecordingDetails(recordingId);
    if (!recording) return;

    const newRetryCount = (recording.retry_count || 0) + 1;

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          retry_count: newRetryCount,
          updated_at: new Date().toISOString()
        }),
      }
    );

    if (!response.ok) {
      console.warn("Failed to update recording retry count:", response.status);
    }
  } catch (error) {
    console.warn("Error updating recording retry count:", error);
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

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { recording_id, password } = req.body;

  // Simple password check
  if (password !== "vouch2024admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!recording_id) {
    return res.status(400).json({ error: "recording_id is required" });
  }

  try {
    console.log(`🔄 Starting retry process for recording ${recording_id}`);

    // Get recording details
    const recording = await getRecordingDetails(recording_id);
    if (!recording) {
      return res.status(404).json({ error: "Recording not found" });
    }

    // Get failed chunks
    const failedChunks = await getFailedChunks(recording_id);
    
    if (failedChunks.length === 0) {
      return res.json({
        success: true,
        recording_id: recording_id,
        message: "No failed chunks found - recording may already be complete",
        retry_results: { total_retried: 0, successful_retries: 0, results: [] }
      });
    }

    console.log(`Found ${failedChunks.length} failed chunks to retry`);

    // Attempt to retry failed chunks
    const retryResults = await retryFailedChunks(recording_id, failedChunks);

    // Update recording retry count
    await updateRecordingRetryCount(recording_id);

    // Log retry attempt
    await logRecordingEvent(recording_id, 'retry_attempted', {
      failed_chunks_count: failedChunks.length,
      retry_results: retryResults
    });

    // Determine if we should update recording status
    if (retryResults.successful_retries > 0) {
      // Re-run verification to check if recording is now complete
      // This would typically call the finalize endpoint logic
      console.log(`✅ ${retryResults.successful_retries} chunks recovered for recording ${recording_id}`);
    }

    res.json({
      success: true,
      recording_id: recording_id,
      failed_chunks_found: failedChunks.length,
      retry_results: retryResults,
      message: `Retry completed: ${retryResults.successful_retries}/${failedChunks.length} chunks recovered`
    });

  } catch (error) {
    console.error("Retry recording error:", error);
    
    // Log retry failure
    await logRecordingEvent(recording_id, 'retry_failed', {
      error: error.message
    });

    res.status(500).json({ 
      error: "Failed to retry recording",
      details: error.message 
    });
  }
}
