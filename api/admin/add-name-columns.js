// Migration script to add voucher_name and vouchee_name columns to interview_recordings table
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function addNameColumns() {
  try {
    console.log("🔄 Adding voucher_name and vouchee_name columns to interview_recordings table...");

    // Add voucher_name column
    const addVoucherNameResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/sql`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE interview_recordings 
            ADD COLUMN IF NOT EXISTS voucher_name TEXT;
          `
        }),
      }
    );

    if (!addVoucherNameResponse.ok) {
      console.warn("Note: Could not add voucher_name column via RPC. This might be expected if using limited permissions.");
    } else {
      console.log("✅ voucher_name column added successfully");
    }

    // Add vouchee_name column
    const addVoucheeNameResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/sql`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            ALTER TABLE interview_recordings 
            ADD COLUMN IF NOT EXISTS vouchee_name TEXT;
          `
        }),
      }
    );

    if (!addVoucheeNameResponse.ok) {
      console.warn("Note: Could not add vouchee_name column via RPC. This might be expected if using limited permissions.");
    } else {
      console.log("✅ vouchee_name column added successfully");
    }

    return {
      success: true,
      message: "Columns addition attempted. If you have admin access to Supabase, please run the SQL manually.",
      sql: `
        ALTER TABLE interview_recordings 
        ADD COLUMN IF NOT EXISTS voucher_name TEXT,
        ADD COLUMN IF NOT EXISTS vouchee_name TEXT;
      `
    };

  } catch (error) {
    console.error("❌ Error adding name columns:", error);
    return {
      success: false,
      error: error.message,
      sql: `
        ALTER TABLE interview_recordings 
        ADD COLUMN IF NOT EXISTS voucher_name TEXT,
        ADD COLUMN IF NOT EXISTS vouchee_name TEXT;
      `
    };
  }
}

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

  if (req.method === "POST") {
    const { password } = req.body;

    // Simple password check
    if (password !== "vouch2024admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const result = await addNameColumns();
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          sql_to_run_manually: result.sql
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          sql_to_run_manually: result.sql
        });
      }

    } catch (error) {
      console.error("Migration error:", error);
      res.status(500).json({ 
        error: "Failed to add name columns",
        details: error.message,
        sql_to_run_manually: `
          ALTER TABLE interview_recordings 
          ADD COLUMN IF NOT EXISTS voucher_name TEXT,
          ADD COLUMN IF NOT EXISTS vouchee_name TEXT;
        `
      });
    }
  } else {
    res.status(405).json({ 
      error: "Method not allowed. Use POST with password to run migration.",
      sql_to_run_manually: `
        ALTER TABLE interview_recordings 
        ADD COLUMN IF NOT EXISTS voucher_name TEXT,
        ADD COLUMN IF NOT EXISTS vouchee_name TEXT;
      `
    });
  }
}
