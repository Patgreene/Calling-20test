const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export const handler = async (event: any, context: any) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  try {
    // Parse multipart form data
    let recording_id: string;
    let chunk_index: number;
    let chunkBuffer: Buffer;

    if (event.headers["content-type"]?.includes("multipart/form-data")) {
      // Simple multipart parsing for chunks
      const body = Buffer.from(
        event.body,
        event.isBase64Encoded ? "base64" : "utf8",
      );
      const boundary = event.headers["content-type"]
        .split("boundary=")[1]
        ?.replace(/"/g, "");

      if (!boundary) {
        throw new Error("No boundary found in multipart data");
      }

      const parts = body.toString("binary").split(`--${boundary}`);

      for (const part of parts) {
        if (part.includes('name="recording_id"')) {
          recording_id = part.split("\r\n\r\n")[1]?.split("\r\n")[0];
        } else if (part.includes('name="chunk_index"')) {
          chunk_index = parseInt(part.split("\r\n\r\n")[1]?.split("\r\n")[0]);
        } else if (part.includes('name="chunk"')) {
          const dataStart = part.indexOf("\r\n\r\n") + 4;
          const dataEnd = part.lastIndexOf("\r\n");
          chunkBuffer = Buffer.from(part.slice(dataStart, dataEnd), "binary");
        }
      }
    } else {
      // Try JSON body as fallback
      const requestBody = JSON.parse(event.body || "{}");
      recording_id = requestBody.recording_id;
      chunk_index = requestBody.chunk_index;

      if (requestBody.chunk_data) {
        chunkBuffer = Buffer.from(requestBody.chunk_data, "base64");
      }
    }

    if (!recording_id || chunk_index === undefined || !chunkBuffer) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error:
            "Missing required fields: recording_id, chunk_index, or chunk data",
        }),
      };
    }

    console.log(
      `📦 Uploading chunk ${chunk_index} for recording ${recording_id} (${chunkBuffer.length} bytes)`,
    );

    // Generate unique storage path for this chunk
    const storagePath = `${recording_id}/chunk_${chunk_index.toString().padStart(4, "0")}.webm`;

    // Upload chunk to Supabase storage
    const uploadResponse = await fetch(
      `${SUPABASE_URL}/storage/v1/object/audio-chunks/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "audio/webm",
        },
        body: chunkBuffer,
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Storage upload failed:", errorText);
      throw new Error(
        `Storage upload failed: ${uploadResponse.status} ${errorText}`,
      );
    }

    // Create or update chunk record in database
    const chunkRecord = {
      recording_id: recording_id,
      chunk_number: chunk_index,
      storage_path: storagePath,
      size_bytes: chunkBuffer.length,
      upload_status: "uploaded",
      uploaded_at: new Date().toISOString(),
    };

    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/recording_chunks`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(chunkRecord),
    });

    if (!dbResponse.ok) {
      const errorText = await dbResponse.text();
      console.error("Database insert failed:", errorText);
      throw new Error(
        `Database insert failed: ${dbResponse.status} ${errorText}`,
      );
    }

    console.log(`✅ Chunk ${chunk_index} uploaded successfully`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: JSON.stringify({
        success: true,
        message: "Chunk uploaded successfully",
        chunk_number: chunk_index,
        storage_path: storagePath,
        size: chunkBuffer.length,
      }),
    };
  } catch (error: any) {
    console.error("💥 Chunk upload error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Chunk upload failed",
        message: error.message,
      }),
    };
  }
};
