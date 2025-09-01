// Vercel serverless function for /api/admin/recordings
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function createRecordingSession(callCode, mimeType, voucherName = null, voucheeName = null) {
  try {
    const recordingData = {
      call_code: callCode,
      file_name: `${callCode}_${Date.now()}.${getFileExtension(mimeType)}`,
      mime_type: mimeType,
      upload_status: 'uploading',
      verification_status: 'pending',
      retry_count: 0,
      chunks_uploaded: 0,
      voucher_name: voucherName,
      vouchee_name: voucheeName
    };

    console.log('💾 About to insert recording data into Supabase:', recordingData);

    const response = await fetch(`${SUPABASE_URL}/rest/v1/interview_recordings`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(recordingData),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Recording session created:", data[0].id);
      console.log("📊 Saved recording data:", {
        id: data[0].id,
        call_code: data[0].call_code,
        voucher_name: data[0].voucher_name,
        vouchee_name: data[0].vouchee_name,
        file_name: data[0].file_name
      });

      // Log the creation event
      await logRecordingEvent(data[0].id, 'recording_session_created', {
        call_code: callCode,
        mime_type: mimeType,
        voucher_name: voucherName,
        vouchee_name: voucheeName
      });

      return data[0];
    } else {
      console.error("Failed to create recording session:", response.status);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return null;
    }
  } catch (error) {
    console.error("Error creating recording session:", error);
    return null;
  }
}

async function loadRecordings() {
  try {
    // First get recordings
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
    console.log(`📊 Loaded ${recordings.length} recordings from database`);

    // Get transcriptions for all recordings
    console.log(`🔍 Fetching transcriptions from: ${SUPABASE_URL}/rest/v1/transcriptions?select=*`);
    const transcriptionsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions?select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`📡 Transcriptions response status: ${transcriptionsResponse.status}`);

    let transcriptions = [];
    if (transcriptionsResponse.ok) {
      transcriptions = await transcriptionsResponse.json();
      console.log(`📝 Loaded ${transcriptions.length} transcriptions from database`);

      // Debug: Log details about transcriptions
      transcriptions.forEach(t => {
        console.log(`📄 Transcription ${t.id}: recording_id=${t.recording_id}, status=${t.status}, hasText=${!!t.transcript_text}, textLength=${t.transcript_text?.length || 0}`);
      });
    } else {
      console.error("❌ Failed to load transcriptions:", transcriptionsResponse.status);
      const errorText = await transcriptionsResponse.text();
      console.error("❌ Transcriptions error details:", errorText);
      console.error("❌ Response headers:", [...transcriptionsResponse.headers.entries()]);
    }

    // Debug: Show all recording IDs and transcription recording_ids for comparison
    console.log("🔍 DEBUGGING FOREIGN KEY RELATIONSHIPS:");
    console.log("📊 Recording IDs from interview_recordings table:");
    recordings.forEach(r => {
      console.log(`  📝 Recording: ${r.call_code} -> ID: ${r.id}`);
    });

    console.log("📄 Transcription recording_ids from transcriptions table:");
    transcriptions.forEach(t => {
      console.log(`  📋 Transcription: ${t.id} -> points to recording_id: ${t.recording_id} (status: ${t.status})`);
    });

    // Merge transcription data with recordings
    const recordingsWithTranscriptions = recordings.map(recording => {
      const transcription = transcriptions.find(t => t.recording_id === recording.id);
      console.log(`🔗 Recording ${recording.id} (${recording.call_code}): ${transcription ? `✅ matched with transcription ${transcription.id} (status: ${transcription.status})` : '❌ no transcription found'}`);

      if (transcription) {
        console.log(`  📄 Transcript text length: ${transcription.transcript_text?.length || 0} characters`);
        console.log(`  📄 Transcript preview: "${transcription.transcript_text?.substring(0, 50) || 'NO TEXT'}..."`);
      }

      return {
        ...recording,
        transcription: transcription || null
      };
    });

    const recordingsWithTranscriptText = recordingsWithTranscriptions.filter(r => r.transcription?.transcript_text);
    console.log(`✅ Final result: ${recordingsWithTranscriptText.length} recordings have transcript text`);

    // Debug: Show which recording IDs don't have matching transcriptions
    const recordingIdsWithoutTranscripts = recordings
      .filter(r => !transcriptions.find(t => t.recording_id === r.id))
      .map(r => ({ id: r.id, call_code: r.call_code }));

    if (recordingIdsWithoutTranscripts.length > 0) {
      console.log("❌ Recording IDs that don't have transcriptions:");
      recordingIdsWithoutTranscripts.forEach(r => {
        console.log(`  📝 ${r.call_code} -> ${r.id}`);
      });
    }

    // Debug: Show which transcription recording_ids don't match any recordings
    const orphanedTranscriptions = transcriptions
      .filter(t => !recordings.find(r => r.id === t.recording_id))
      .map(t => ({ transcription_id: t.id, recording_id: t.recording_id, status: t.status }));

    if (orphanedTranscriptions.length > 0) {
      console.log("❌ Transcription recording_ids that don't match any recordings:");
      orphanedTranscriptions.forEach(t => {
        console.log(`  📄 Transcription ${t.transcription_id} -> points to non-existent recording_id: ${t.recording_id}`);
      });
    }

    return recordingsWithTranscriptions;
  } catch (error) {
    console.error("Error loading recordings:", error);
    return [];
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

function getFileExtension(mimeType) {
  switch (mimeType) {
    case 'audio/webm;codecs=opus':
    case 'audio/webm':
      return 'webm';
    case 'audio/mp4;codecs=mp4a.40.2':
    case 'audio/mp4':
      return 'mp4';
    case 'audio/wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    default:
      return 'webm'; // Default fallback
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

  if (req.method === "GET") {
    const { test_columns, debug_last_request } = req.query;

    if (debug_last_request === "true") {
      // Return what the last request contained for debugging
      res.json({
        success: true,
        message: "Debug endpoint - last request data would be logged server-side",
        instructions: "Check server logs for the detailed request data"
      });
      return;
    }

    if (test_columns === "true") {
      // Test if voucher_name and vouchee_name columns exist
      try {
        console.log("🔍 Testing if voucher_name and vouchee_name columns exist...");

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/interview_recordings?select=id,call_code,voucher_name,vouchee_name&limit=3`,
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
          console.log("✅ Columns exist! Sample data:", data);

          res.json({
            success: true,
            message: "voucher_name and vouchee_name columns exist",
            sample_data: data,
            columns_exist: true
          });
        } else {
          const errorText = await response.text();
          console.log("❌ Columns might not exist. Error:", response.status, errorText);

          res.json({
            success: false,
            message: "Columns don't exist - you need to add them to Supabase",
            error: errorText,
            status: response.status,
            columns_exist: false,
            sql_to_run: `
ALTER TABLE interview_recordings
ADD COLUMN voucher_name TEXT,
ADD COLUMN vouchee_name TEXT;
            `
          });
        }
        return;
      } catch (error) {
        console.error("❌ Error testing columns:", error);
        res.status(500).json({
          success: false,
          error: error.message,
          sql_to_run: `
ALTER TABLE interview_recordings
ADD COLUMN voucher_name TEXT,
ADD COLUMN vouchee_name TEXT;
          `
        });
        return;
      }
    }

    // Load all recordings (default behavior)
    try {
      const recordings = await loadRecordings();
      res.json({
        success: true,
        recordings: recordings,
        total: recordings.length
      });
    } catch (error) {
      console.error("GET /api/admin/recordings error:", error);
      res.status(500).json({
        error: "Failed to load recordings",
        details: error.message
      });
    }
  } 
  else if (req.method === "POST") {
    const { action, call_code, mime_type, password, voucher_name, vouchee_name } = req.body;

    console.log('📥 Received POST request to /api/admin/recordings:', {
      action,
      call_code,
      mime_type,
      password: password ? '[PROVIDED]' : '[MISSING]',
      voucher_name,
      vouchee_name
    });

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (action === "start_recording") {
      if (!call_code || !mime_type) {
        return res.status(400).json({
          error: "call_code and mime_type are required"
        });
      }

      try {
        console.log('🚀 Creating recording session with names:', {
          call_code,
          mime_type,
          voucher_name,
          vouchee_name
        });

        const recording = await createRecordingSession(call_code, mime_type, voucher_name, vouchee_name);

        if (recording) {
          console.log(`✅ Recording session created with names: voucher="${voucher_name}", vouchee="${vouchee_name}"`);
          res.json({
            success: true,
            recording_id: recording.id,
            voucher_name: recording.voucher_name,
            vouchee_name: recording.vouchee_name,
            message: "Recording session created successfully"
          });
        } else {
          res.status(500).json({
            error: "Failed to create recording session"
          });
        }
      } catch (error) {
        console.error("POST /api/admin/recordings error:", error);
        res.status(500).json({
          error: "Failed to create recording session",
          details: error.message
        });
      }
    } else {
      res.status(400).json({ error: "Invalid action. Use 'start_recording'" });
    }
  } 
  else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
