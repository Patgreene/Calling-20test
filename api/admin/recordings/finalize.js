// Vercel serverless function for /api/admin/recordings/finalize
const crypto = require('crypto');

const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

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

async function verifyChunkIntegrity(chunks) {
  const verificationResults = {
    totalChunks: chunks.length,
    uploadedChunks: 0,
    failedChunks: 0,
    missingChunks: [],
    corruptedChunks: [],
    totalSize: 0
  };

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    if (chunk.upload_status === 'uploaded') {
      verificationResults.uploadedChunks++;
      verificationResults.totalSize += chunk.chunk_size_bytes || 0;
      
      // Verify chunk sequence (should be consecutive)
      if (chunk.chunk_number !== i) {
        verificationResults.missingChunks.push(i);
      }
      
      // TODO: In a production environment, you might want to:
      // 1. Download the chunk from storage
      // 2. Recalculate its hash
      // 3. Compare with stored hash
      // For now, we trust the stored hash from upload time
      
    } else {
      verificationResults.failedChunks++;
      verificationResults.missingChunks.push(i);
    }
  }

  return verificationResults;
}

async function finalizeRecording(recordingId, totalChunks, totalDuration) {
  try {
    // Get all chunks for this recording
    const chunks = await getRecordingChunks(recordingId);
    
    console.log(`🔍 Verifying ${chunks.length} chunks for recording ${recordingId}`);
    
    // Verify chunk integrity
    const verification = await verifyChunkIntegrity(chunks);
    
    // Calculate final hash of all chunks combined
    const chunkHashes = chunks
      .filter(c => c.chunk_hash)
      .sort((a, b) => a.chunk_number - b.chunk_number)
      .map(c => c.chunk_hash);
    
    const finalHash = crypto
      .createHash('sha256')
      .update(chunkHashes.join(''))
      .digest('hex');

    // Determine verification status
    let verificationStatus = 'verified';
    let uploadStatus = 'completed';
    
    if (verification.failedChunks > 0 || verification.missingChunks.length > 0) {
      verificationStatus = verification.failedChunks > verification.uploadedChunks ? 'corrupted' : 'missing';
      uploadStatus = 'failed';
    }

    // Update recording with final details
    const updateData = {
      upload_status: uploadStatus,
      verification_status: verificationStatus,
      duration_seconds: totalDuration,
      file_size_bytes: verification.totalSize,
      chunks_total: totalChunks,
      chunks_uploaded: verification.uploadedChunks,
      file_hash: finalHash,
      updated_at: new Date().toISOString()
    };

    // Add error message if there were issues
    if (uploadStatus === 'failed') {
      updateData.last_error_message = `Verification failed: ${verification.failedChunks} failed chunks, ${verification.missingChunks.length} missing chunks`;
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update recording: ${response.status}`);
    }

    // Log finalization event
    await logRecordingEvent(recordingId, 'recording_finalized', {
      verification_results: verification,
      final_hash: finalHash,
      upload_status: uploadStatus,
      verification_status: verificationStatus,
      total_duration: totalDuration
    });

    console.log(`✅ Recording ${recordingId} finalized: ${uploadStatus} (${verificationStatus})`);

    return {
      success: uploadStatus === 'completed',
      verification: verification,
      upload_status: uploadStatus,
      verification_status: verificationStatus,
      final_hash: finalHash,
      total_size: verification.totalSize,
      total_duration: totalDuration
    };

  } catch (error) {
    console.error(`❌ Failed to finalize recording ${recordingId}:`, error);
    
    // Log finalization failure
    await logRecordingEvent(recordingId, 'finalization_failed', {
      error: error.message
    });

    // Update recording with error status
    try {
      await fetch(
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
            upload_status: 'failed',
            verification_status: 'corrupted',
            last_error_message: `Finalization failed: ${error.message}`,
            updated_at: new Date().toISOString()
          }),
        }
      );
    } catch (updateError) {
      console.error("Failed to update recording with error status:", updateError);
    }

    throw error;
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

  const { recording_id, total_chunks, total_duration, password } = req.body;

  // Simple password check
  if (password !== "vouch2024admin") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!recording_id) {
    return res.status(400).json({ error: "recording_id is required" });
  }

  try {
    console.log(`🏁 Finalizing recording ${recording_id} (${total_chunks} chunks, ${total_duration}s)`);

    const result = await finalizeRecording(recording_id, total_chunks, total_duration);

    if (result.success) {
      res.json({
        success: true,
        recording_id: recording_id,
        verification_results: result.verification,
        upload_status: result.upload_status,
        verification_status: result.verification_status,
        final_hash: result.final_hash,
        total_size: result.total_size,
        total_duration: result.total_duration,
        message: "Recording finalized and verified successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        recording_id: recording_id,
        verification_results: result.verification,
        upload_status: result.upload_status,
        verification_status: result.verification_status,
        error: "Recording verification failed",
        details: result.verification
      });
    }

  } catch (error) {
    console.error("Finalize recording error:", error);
    res.status(500).json({ 
      error: "Failed to finalize recording",
      details: error.message 
    });
  }
}
