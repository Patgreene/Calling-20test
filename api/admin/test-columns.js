const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,POST",
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
    try {
      console.log("🔍 Testing if voucher_name and vouchee_name columns exist...");
      
      // Try to select these columns to see if they exist
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
          message: "Columns might not exist",
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
    }
  } else if (req.method === "POST") {
    const { password, test_update } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (test_update) {
      try {
        console.log("🔍 Testing if we can update a record with voucher_name and vouchee_name...");
        
        // First get a recording ID
        const getResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/interview_recordings?select=id&limit=1`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!getResponse.ok) {
          return res.json({
            success: false,
            message: "No recordings found to test with"
          });
        }

        const recordings = await getResponse.json();
        if (recordings.length === 0) {
          return res.json({
            success: false,
            message: "No recordings found to test with"
          });
        }

        const recordingId = recordings[0].id;
        console.log("📝 Testing update with recording ID:", recordingId);

        // Try to update it with the name fields
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recordingId}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              voucher_name: "Test Voucher",
              vouchee_name: "Test Vouchee"
            }),
          }
        );

        if (updateResponse.ok) {
          const updatedData = await updateResponse.json();
          console.log("✅ Update successful! Updated data:", updatedData);
          
          res.json({
            success: true,
            message: "Update test successful",
            updated_data: updatedData,
            can_update: true
          });
        } else {
          const errorText = await updateResponse.text();
          console.log("❌ Update failed:", updateResponse.status, errorText);
          
          res.json({
            success: false,
            message: "Update test failed",
            error: errorText,
            status: updateResponse.status,
            can_update: false,
            sql_to_run: `
ALTER TABLE interview_recordings 
ADD COLUMN voucher_name TEXT,
ADD COLUMN vouchee_name TEXT;
            `
          });
        }
      } catch (error) {
        console.error("❌ Error testing update:", error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    } else {
      res.status(400).json({ error: "Missing test_update parameter" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
