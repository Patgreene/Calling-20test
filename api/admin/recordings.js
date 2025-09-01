// Vercel serverless function for /api/admin/recordings
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function createRecordingSession(callCode, mimeType) {
  try {
    const recordingData = {
      call_code: callCode,
      file_name: `${callCode}_${Date.now()}.${getFileExtension(mimeType)}`,
      mime_type: mimeType,
      upload_status: 'uploading',
      verification_status: 'pending',
      retry_count: 0,
      chunks_uploaded: 0
    };

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
      
      // Log the creation event
      await logRecordingEvent(data[0].id, 'recording_session_created', {
        call_code: callCode,
        mime_type: mimeType
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
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?select=*&order=created_at.desc&limit=100`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      return data;
    } else {
      console.error("Failed to load recordings:", response.status);
      return [];
    }
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
    // Load all recordings
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
    const { action, call_code, mime_type, password } = req.body;

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
        const recording = await createRecordingSession(call_code, mime_type);
        
        if (recording) {
          res.json({
            success: true,
            recording_id: recording.id,
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
