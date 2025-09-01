// Vercel serverless function for /api/admin/recordings/chunk
const formidable = require('formidable');
const crypto = require('crypto');

const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

// Disable body parsing for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

async function uploadChunkToSupabase(recordingId, chunkNumber, chunkData) {
  try {
    const fileName = `recordings/${recordingId}/chunk_${chunkNumber.toString().padStart(4, '0')}.webm`;
    
    // Calculate hash for integrity verification
    const hash = crypto.createHash('sha256').update(chunkData).digest('hex');
    
    // Upload to Supabase Storage
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/interview-recordings/${fileName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'no-cache',
        },
        body: chunkData,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Supabase upload failed: ${uploadResponse.status} - ${errorText}`);
    }

    // Record chunk in database
    const chunkRecord = {
      recording_id: recordingId,
      chunk_number: chunkNumber,
      chunk_size_bytes: chunkData.length,
      chunk_hash: hash,
      upload_status: 'uploaded',
      storage_path: fileName,
    };

    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/recording_chunks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(chunkRecord),
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      throw new Error(`Database insert failed: ${dbResponse.status} - ${errorText}`);
    }

    // Update recording progress
    await updateRecordingProgress(recordingId, chunkNumber + 1);

    // Log successful chunk upload
    await logRecordingEvent(recordingId, 'chunk_uploaded', {
      chunk_number: chunkNumber,
      chunk_size: chunkData.length,
      storage_path: fileName,
      hash: hash
    });

    console.log(`✅ Chunk ${chunkNumber} uploaded successfully for recording ${recordingId}`);
    return { success: true, chunk_number: chunkNumber, hash: hash, storage_path: fileName };

  } catch (error) {
    console.error(`❌ Chunk ${chunkNumber} upload failed for recording ${recordingId}:`, error);
    
    // Log failed chunk upload
    await logRecordingEvent(recordingId, 'chunk_upload_failed', {
      chunk_number: chunkNumber,
      error: error.message
    });

    // Record failed chunk in database
    const failedChunkRecord = {
      recording_id: recordingId,
      chunk_number: chunkNumber,
      chunk_size_bytes: chunkData.length,
      upload_status: 'failed',
    };

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/recording_chunks`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(failedChunkRecord),
      });
    } catch (dbError) {
      console.error("Failed to record chunk failure in database:", dbError);
    }

    throw error;
  }
}

async function updateRecordingProgress(recordingId, chunksUploaded) {
  try {
    const updateData = {
      chunks_uploaded: chunksUploaded,
      updated_at: new Date().toISOString()
    };

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
        body: JSON.stringify(updateData),
      }
    );

    if (!response.ok) {
      console.warn("Failed to update recording progress:", response.status);
    }
  } catch (error) {
    console.warn("Error updating recording progress:", error);
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

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({
      maxFileSize: 50 * 1024 * 1024, // 50MB max chunk size
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
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

  try {
    const { fields, files } = await parseForm(req);
    
    const recordingId = Array.isArray(fields.recording_id) ? fields.recording_id[0] : fields.recording_id;
    const chunkIndex = Array.isArray(fields.chunk_index) ? parseInt(fields.chunk_index[0]) : parseInt(fields.chunk_index);
    const password = Array.isArray(fields.password) ? fields.password[0] : fields.password;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!recordingId || chunkIndex === undefined || !files.chunk) {
      return res.status(400).json({ 
        error: "recording_id, chunk_index, and chunk file are required" 
      });
    }

    // Read chunk data
    const fs = require('fs');
    const chunkFile = Array.isArray(files.chunk) ? files.chunk[0] : files.chunk;
    const chunkData = fs.readFileSync(chunkFile.filepath);

    if (chunkData.length === 0) {
      return res.status(400).json({ error: "Empty chunk data" });
    }

    console.log(`📤 Uploading chunk ${chunkIndex} for recording ${recordingId} (${chunkData.length} bytes)`);

    // Upload chunk with retry logic
    let uploadResult;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        uploadResult = await uploadChunkToSupabase(recordingId, chunkIndex, chunkData);
        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error; // Max retries reached, throw the error
        }
        console.log(`⚠️ Chunk upload attempt ${retryCount} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
      }
    }

    res.json({
      success: true,
      recording_id: recordingId,
      chunk_index: chunkIndex,
      chunk_size: chunkData.length,
      hash: uploadResult.hash,
      storage_path: uploadResult.storage_path,
      retry_count: retryCount,
      message: `Chunk ${chunkIndex} uploaded successfully`
    });

  } catch (error) {
    console.error("Chunk upload error:", error);
    res.status(500).json({ 
      error: "Failed to upload chunk",
      details: error.message 
    });
  }
}
