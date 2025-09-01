// Vercel serverless function for transcription
const SUPABASE_URL = "https://xbcmpkkqqfqsuapbvvkp.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik";

// Use the environment variable or fall back to the one from your existing API
const openaiApiKey = process.env.OPENAI_API_KEY;

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recording_id, password } = req.body;

    // Verify admin password
    if (password !== 'vouch2024admin') {
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (!recording_id) {
      return res.status(400).json({ error: 'Recording ID is required' });
    }

    if (!openaiApiKey) {
      console.error('OpenAI API key not found');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log(`🎤 Starting transcription for recording: ${recording_id}`);

    // Get recording details from Supabase using direct fetch
    const recordingResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/interview_recordings?id=eq.${recording_id}&select=*`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!recordingResponse.ok) {
      console.error('Failed to fetch recording:', recordingResponse.status);
      return res.status(404).json({ error: 'Recording not found' });
    }

    const recordings = await recordingResponse.json();
    if (!recordings || recordings.length === 0) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    const recording = recordings[0];

    if (recording.upload_status !== 'completed') {
      return res.status(400).json({ error: 'Recording must be completed before transcription' });
    }

    // Check if transcription already exists
    const transcriptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions?recording_id=eq.${recording_id}`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (transcriptResponse.ok) {
      const existingTranscripts = await transcriptResponse.json();
      if (existingTranscripts.length > 0 && existingTranscripts[0].status === 'completed') {
        console.log(`✅ Transcription already exists for ${recording_id}`);
        return res.status(200).json({
          success: true,
          message: 'Transcription already exists',
          transcript: existingTranscripts[0]
        });
      }
    }

    // Create transcription record with "processing" status
    const transcriptionData = {
      recording_id,
      status: 'processing',
      started_at: new Date().toISOString(),
      voucher_name: recording.voucher_name,
      vouchee_name: recording.vouchee_name
    };

    const createTranscriptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/transcriptions`,
      {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(transcriptionData),
      }
    );

    if (!createTranscriptResponse.ok) {
      console.error('Failed to create transcription record:', createTranscriptResponse.status);
      return res.status(500).json({ error: 'Failed to create transcription record' });
    }

    const transcriptionArray = await createTranscriptResponse.json();
    const transcription = transcriptionArray[0];

    console.log(`📝 Transcription record created: ${transcription.id}`);

    // Get the final audio file URL from Supabase Storage
    const fileName = `${recording_id}.webm`;
    const audioFileUrl = `${SUPABASE_URL}/storage/v1/object/public/recordings/${fileName}`;
    console.log(`📁 Audio file URL: ${audioFileUrl}`);

    // Download the audio file
    console.log(`⬇️ Downloading audio file...`);
    const audioResponse = await fetch(audioFileUrl);

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio file: ${audioResponse.statusText}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log(`📦 Downloaded ${audioBuffer.byteLength} bytes`);

    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type: 'audio/webm' }), fileName);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');

    console.log(`🤖 Sending to OpenAI Whisper API...`);

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI API error:', errorText);

      // Update transcription status to failed
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
            status: 'failed',
            error_message: `OpenAI API error: ${whisperResponse.statusText}`,
            completed_at: new Date().toISOString()
          }),
        }
      );

      throw new Error(`OpenAI API error: ${whisperResponse.statusText} - ${errorText}`);
    }

    const transcriptionResult = await whisperResponse.json();
    console.log(`✅ Received transcription from OpenAI (${transcriptionResult.text.length} characters)`);

    // Update transcription record with results
    const updateData = {
      status: 'completed',
      transcript_text: transcriptionResult.text,
      transcript_json: transcriptionResult,
      completed_at: new Date().toISOString(),
      duration: transcriptionResult.duration,
      language: transcriptionResult.language
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
      }
    );

    if (!updateResponse.ok) {
      console.error('Failed to update transcription:', updateResponse.status);
      return res.status(500).json({ error: 'Failed to save transcription results' });
    }

    const updatedTranscriptionArray = await updateResponse.json();
    const updatedTranscription = updatedTranscriptionArray[0];

    console.log(`🎉 Transcription completed successfully for ${recording_id}`);

    return res.status(200).json({
      success: true,
      message: 'Transcription completed successfully',
      transcript: updatedTranscription
    });

  } catch (error) {
    console.error('💥 Transcription error:', error);

    // Try to update transcription status to failed if we have the recording_id
    if (req.body.recording_id) {
      try {
        await fetch(
          `${SUPABASE_URL}/rest/v1/transcriptions?recording_id=eq.${req.body.recording_id}`,
          {
            method: "PATCH",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: 'failed',
              error_message: error.message,
              completed_at: new Date().toISOString()
            }),
          }
        );
      } catch (updateError) {
        console.error('Failed to update failed status:', updateError);
      }
    }

    return res.status(500).json({
      error: 'Transcription failed',
      message: error.message
    });
  }
}
