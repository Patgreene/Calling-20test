const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

async function testColumns() {
  try {
    console.log("🔍 Testing if voucher_name and vouchee_name columns exist...");
    
    // Try to select these columns to see if they exist
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?select=id,voucher_name,vouchee_name&limit=1`,
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
      return true;
    } else {
      const errorText = await response.text();
      console.log("❌ Columns might not exist. Error:", response.status, errorText);
      return false;
    }
  } catch (error) {
    console.error("❌ Error testing columns:", error);
    return false;
  }
}

async function testUpdate() {
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
      console.log("❌ No recordings found to test with");
      return false;
    }

    const recordings = await getResponse.json();
    if (recordings.length === 0) {
      console.log("❌ No recordings found to test with");
      return false;
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
      return true;
    } else {
      const errorText = await updateResponse.text();
      console.log("❌ Update failed:", updateResponse.status, errorText);
      return false;
    }
  } catch (error) {
    console.error("❌ Error testing update:", error);
    return false;
  }
}

async function main() {
  console.log("🔄 Starting column test...");
  
  const columnsExist = await testColumns();
  
  if (columnsExist) {
    console.log("✅ Columns exist, testing update functionality...");
    const canUpdate = await testUpdate();
    
    if (canUpdate) {
      console.log("🎉 Everything works! The columns exist and can be updated.");
      console.log("The issue might be in the client code or API logic.");
    } else {
      console.log("❌ Columns exist but updates are failing. Check permissions or column constraints.");
    }
  } else {
    console.log("❌ Columns don't exist. You need to add them to your Supabase table.");
    console.log("\n📋 SQL to run in your Supabase SQL editor:");
    console.log("ALTER TABLE interview_recordings");
    console.log("ADD COLUMN voucher_name TEXT,");
    console.log("ADD COLUMN vouchee_name TEXT;");
  }
}

main().catch(console.error);
