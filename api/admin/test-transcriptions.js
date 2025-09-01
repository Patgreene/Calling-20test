// Test endpoint to check if transcriptions table exists and has data
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

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

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🧪 Testing transcriptions table...");

    // Test 1: Check if transcriptions table exists by fetching structure
    console.log("🔍 Test 1: Checking table structure...");
    const structureResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions?select=*&limit=0`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`📡 Structure check response: ${structureResponse.status}`);

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error("❌ Table doesn't exist or no access:", errorText);
      return res.status(200).json({
        table_exists: false,
        structure_check: {
          status: structureResponse.status,
          error: errorText
        }
      });
    }

    // Test 2: Count total transcriptions
    console.log("🔍 Test 2: Counting transcriptions...");
    const countResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions?select=count&head=true`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Range: "0-0"
        },
      }
    );

    let totalCount = 0;
    if (countResponse.ok) {
      const contentRange = countResponse.headers.get('content-range');
      console.log("📊 Content-Range header:", contentRange);
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        totalCount = match ? parseInt(match[1]) : 0;
      }
    }

    // Test 3: Get sample transcriptions
    console.log("🔍 Test 3: Fetching sample transcriptions...");
    const sampleResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions?select=*&limit=5`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    let sampleData = [];
    if (sampleResponse.ok) {
      sampleData = await sampleResponse.json();
      console.log(`📝 Found ${sampleData.length} sample transcriptions`);
      sampleData.forEach((t, i) => {
        console.log(`📄 Sample ${i + 1}: id=${t.id}, recording_id=${t.recording_id}, status=${t.status}, hasText=${!!t.transcript_text}`);
      });
    } else {
      const errorText = await sampleResponse.text();
      console.error("❌ Sample fetch error:", errorText);
    }

    // Test 4: Check specific recording IDs from server logs
    const testRecordingIds = [
      'b14a6688-ab40-42f0-9670-be530b93a8ae',
      '0580c782-512f-460d-9f80-e8edbf039902'
    ];

    const specificChecks = [];
    for (const recordingId of testRecordingIds) {
      console.log(`🔍 Test 4: Checking transcription for recording ${recordingId}...`);
      const specificResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/transcriptions?recording_id=eq.${recordingId}&select=*`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (specificResponse.ok) {
        const specificData = await specificResponse.json();
        console.log(`📋 Recording ${recordingId}: ${specificData.length} transcriptions found`);
        specificChecks.push({
          recording_id: recordingId,
          found: specificData.length > 0,
          transcriptions: specificData
        });
      } else {
        console.error(`❌ Failed to check recording ${recordingId}`);
        specificChecks.push({
          recording_id: recordingId,
          found: false,
          error: await specificResponse.text()
        });
      }
    }

    const result = {
      table_exists: true,
      total_count: totalCount,
      sample_data: sampleData,
      specific_checks: specificChecks,
      timestamp: new Date().toISOString()
    };

    console.log("✅ Transcriptions test completed:", JSON.stringify(result, null, 2));

    return res.status(200).json(result);

  } catch (error) {
    console.error("💥 Transcriptions test error:", error);
    return res.status(500).json({
      error: "Test failed",
      message: error.message,
      stack: error.stack
    });
  }
}
