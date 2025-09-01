import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

if (!openaiApiKey) {
  throw new Error('Missing OpenAI API key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
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

    console.log(`🎤 Starting transcription for recording: ${recording_id}`);

    // Get recording details from Supabase
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('*')
      .eq('id', recording_id)
      .single();

    if (recordingError || !recording) {
      console.error('Recording not found:', recordingError);
      return res.status(404).json({ error: 'Recording not found' });
    }

    if (recording.status !== 'completed') {
      return res.status(400).json({ error: 'Recording must be completed before transcription' });
    }

    // Check if transcription already exists
    const { data: existingTranscript } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('recording_id', recording_id)
      .single();

    if (existingTranscript && existingTranscript.status === 'completed') {
      console.log(`✅ Transcription already exists for ${recording_id}`);
      return res.status(200).json({
        success: true,
        message: 'Transcription already exists',
        transcript: existingTranscript
      });
    }

    // Update or create transcription record with "processing" status
    const transcriptionData = {
      recording_id,
      status: 'processing',
      started_at: new Date().toISOString(),
      voucher_name: recording.voucher_name,
      vouchee_name: recording.vouchee_name
    };

    const { data: transcription, error: transcriptionError } = await supabase
      .from('transcriptions')
      .upsert(transcriptionData, { onConflict: 'recording_id' })
      .select()
      .single();

    if (transcriptionError) {
      console.error('Failed to create transcription record:', transcriptionError);
      return res.status(500).json({ error: 'Failed to create transcription record' });
    }

    console.log(`📝 Transcription record created: ${transcription.id}`);

    // Get the final audio file URL from Supabase Storage
    const fileName = `${recording_id}.webm`;
    const { data: fileData } = supabase.storage
      .from('recordings')
      .getPublicUrl(fileName);

    const audioFileUrl = fileData.publicUrl;
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
      await supabase
        .from('transcriptions')
        .update({ 
          status: 'failed', 
          error_message: `OpenAI API error: ${whisperResponse.statusText}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', transcription.id);

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

    const { data: updatedTranscription, error: updateError } = await supabase
      .from('transcriptions')
      .update(updateData)
      .eq('id', transcription.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update transcription:', updateError);
      return res.status(500).json({ error: 'Failed to save transcription results' });
    }

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
        await supabase
          .from('transcriptions')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('recording_id', req.body.recording_id);
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
