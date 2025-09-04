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

  let requestBody;
  try {
    requestBody = JSON.parse(event.body || "{}");
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Invalid JSON in request body" }),
    };
  }

  const { recording_id } = requestBody;

  if (!recording_id) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Recording ID is required" }),
    };
  }

  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "OpenAI API key not configured" }),
    };
  }

  try {
    console.log(`🎙️ Starting transcription for recording ${recording_id}`);

    // Get recording details
    const recordingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recording_id}`,
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

    // Create transcription record
    const transcriptionRecord = {
      recording_id: recording_id,
      status: "processing",
      created_at: new Date().toISOString(),
    };

    const transcriptionResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(transcriptionRecord),
      },
    );

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error("Failed to create transcription record:", errorText);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          error: "Failed to create transcription record",
        }),
      };
    }

    const transcriptionArray = await transcriptionResponse.json();
    const transcription = transcriptionArray[0];
    console.log(`📝 Transcription record created: ${transcription.id}`);

    // Get recording chunks and download audio
    const chunksResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/recording_chunks?recording_id=eq.${recording_id}&upload_status=eq.uploaded&order=chunk_number.asc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!chunksResponse.ok) {
      throw new Error("Failed to load recording chunks");
    }

    const chunks = await chunksResponse.json();
    if (chunks.length === 0) {
      throw new Error("No audio chunks found for recording");
    }

    // Download and concatenate chunks
    const chunkBuffers = [];
    let totalSize = 0;

    for (const chunk of chunks) {
      try {
        const chunkUrl = `${SUPABASE_URL}/storage/v1/object/public/audio-chunks/${chunk.storage_path}`;
        const chunkResponse = await fetch(chunkUrl);

        if (chunkResponse.ok) {
          const chunkBuffer = await chunkResponse.arrayBuffer();
          chunkBuffers.push(new Uint8Array(chunkBuffer));
          totalSize += chunkBuffer.byteLength;
        }
      } catch (error) {
        console.warn(`Failed to download chunk ${chunk.chunk_number}:`, error);
      }
    }

    if (chunkBuffers.length === 0) {
      throw new Error("Failed to download any audio chunks");
    }

    // Concatenate chunks
    const concatenatedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    for (const buffer of chunkBuffers) {
      concatenatedBuffer.set(buffer, offset);
      offset += buffer.length;
    }

    console.log(`📦 Downloaded ${concatenatedBuffer.byteLength} bytes`);

    // Create simple form data using FormData web API
    // Note: Using native FormData which should work in Netlify Functions
    const formData = new FormData();

    // Create a Blob from the buffer
    const audioBlob = new Blob([concatenatedBuffer], { type: "audio/webm" });

    formData.append("file", audioBlob, `${recording_id}.webm`);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");

    console.log(`🤖 Sending to OpenAI Whisper API...`);

    // Call OpenAI Whisper API
    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          // Let fetch set the Content-Type with boundary automatically
        },
        body: formData,
      },
    );

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error("OpenAI API error:", errorText);

      // Update transcription record with error
      await fetch(
        `${SUPABASE_URL}/rest/v1/transcriptions?id=eq.${transcription.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "failed",
            error_message: `OpenAI API error: ${whisperResponse.statusText}`,
            completed_at: new Date().toISOString(),
          }),
        },
      );

      throw new Error(
        `OpenAI API error: ${whisperResponse.statusText} - ${errorText}`,
      );
    }

    const transcriptionResult = await whisperResponse.json();
    console.log(
      `✅ Received transcription from OpenAI (${transcriptionResult.text.length} characters)`,
    );

    // Update transcription record with results
    const updateData = {
      status: "completed",
      transcript_text: transcriptionResult.text,
      transcript_json: transcriptionResult,
      completed_at: new Date().toISOString(),
      duration: transcriptionResult.duration,
      language: transcriptionResult.language,
    };

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions?id=eq.${transcription.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(updateData),
      },
    );

    if (!updateResponse.ok) {
      console.error("Failed to update transcription:", updateResponse.status);
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Failed to save transcription results" }),
      };
    }

    const updatedTranscriptionArray = await updateResponse.json();
    const updatedTranscription = updatedTranscriptionArray[0];

    console.log(`🎉 Transcription completed successfully for ${recording_id}`);

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
        message: "Transcription completed successfully",
        transcript: updatedTranscription,
      }),
    };
  } catch (error: any) {
    console.error("💥 Transcription error:", error);

    // Try to update transcription status to failed if we have the recording_id
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/transcriptions?recording_id=eq.${recording_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "failed",
            error_message: error.message,
            completed_at: new Date().toISOString(),
          }),
        },
      );
    } catch (updateError) {
      console.error("Failed to update failed status:", updateError);
    }

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Transcription failed",
        message: error.message,
      }),
    };
  }
};
