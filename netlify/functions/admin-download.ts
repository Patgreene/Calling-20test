const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Extract recording ID from path or query parameters
  let id = event.queryStringParameters?.id;

  if (!id) {
    // Path format: /api/admin/recordings/{id}/download
    // Split: ["", "api", "admin", "recordings", "{id}", "download"]
    const pathParts = event.path.split("/");
    const recordingsIndex = pathParts.findIndex(
      (part) => part === "recordings",
    );

    if (recordingsIndex >= 0 && recordingsIndex + 1 < pathParts.length) {
      const potentialId = pathParts[recordingsIndex + 1];
      // Make sure we got the ID and not "download"
      if (potentialId && potentialId !== "download") {
        id = potentialId;
      }
    }
  }

  // Also try to get from request body
  if (!id && event.body) {
    try {
      const body = JSON.parse(event.body);
      id = body.recording_id || body.id;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Check authentication
  const authHeader = event.headers.authorization || event.headers.Authorization;
  const password = authHeader ? authHeader.replace('Bearer ', '') : null;
  let bodyPassword = null;

  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      bodyPassword = body.password;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  if (password !== "Tim&Pat95" && bodyPassword !== "Tim&Pat95") {
    return {
      statusCode: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Unauthorized" }),
    };
  }

  if (!id) {
    console.error("❌ No recording ID found in request", {
      path: event.path,
      queryParams: event.queryStringParameters,
      body: event.body ? event.body.substring(0, 100) : null
    });
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Recording ID is required" }),
    };
  }

  // Admin pages are already protected by AdminProtectedRoute
  // No additional password check needed

  try {
    console.log(`🔽 Downloading recording ${id}`, {
      path: event.path,
      method: event.httpMethod,
      hasBody: !!event.body
    });

    // Get recording details
    const recordingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${id}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!recordingResponse.ok) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Recording not found" }),
      };
    }

    const recordings = await recordingResponse.json();
    if (recordings.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Recording not found" }),
      };
    }

    const recording = recordings[0];

    // Get recording chunks
    const chunksResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${id}&upload_status=eq.uploaded&order=chunk_number.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!chunksResponse.ok) {
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Failed to load chunks" }),
      };
    }

    const chunks = await chunksResponse.json();

    if (chunks.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No audio chunks found" }),
      };
    }

    // Sort chunks by number
    chunks.sort((a: any, b: any) => a.chunk_number - b.chunk_number);

    // Download and concatenate chunks
    const chunkBuffers = [];
    let totalSize = 0;

    for (const chunk of chunks) {
      try {
        // Fetch chunk data from Supabase storage
        const chunkUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-chunks/${chunk.storage_path}`;
        const chunkResponse = await fetch(chunkUrl);

        if (chunkResponse.ok) {
          const chunkBuffer = await chunkResponse.arrayBuffer();
          chunkBuffers.push(new Uint8Array(chunkBuffer));
          totalSize += chunkBuffer.byteLength;
        } else {
          console.warn(
            `Failed to download chunk ${chunk.chunk_number}: ${chunkResponse.status}`,
          );
        }
      } catch (error) {
        console.warn(`Error downloading chunk ${chunk.chunk_number}:`, error);
      }
    }

    if (chunkBuffers.length === 0) {
      return {
        statusCode: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "No chunks could be downloaded" }),
      };
    }

    // Concatenate all chunks
    const concatenatedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const buffer of chunkBuffers) {
      concatenatedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    // Return the binary audio data directly
    return {
      statusCode: 200,
      headers: {
        "Content-Type": recording.mime_type || "audio/webm",
        "Content-Disposition": `attachment; filename="${recording.file_name}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: Buffer.from(concatenatedBuffer).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    console.error(`Download error for recording ${id}:`, error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Download failed",
        details: error.message,
      }),
    };
  }
};
