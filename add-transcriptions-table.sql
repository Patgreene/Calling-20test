-- Create transcriptions table to store transcript data
CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id uuid NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  transcript_text text,
  transcript_json jsonb,
  voucher_name text,
  vouchee_name text,
  duration decimal,
  language text DEFAULT 'en',
  error_message text,
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add unique constraint to ensure one transcription per recording
ALTER TABLE transcriptions ADD CONSTRAINT unique_recording_id UNIQUE (recording_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transcriptions_recording_id ON transcriptions(recording_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_status ON transcriptions(status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at ON transcriptions(created_at);

-- Add RLS policies (Row Level Security)
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users (admin access)
CREATE POLICY "Enable all access for authenticated users" ON transcriptions
  FOR ALL USING (auth.role() = 'authenticated');

-- Policy to allow read access for anonymous users with correct password (if needed)
CREATE POLICY "Enable read access for all users" ON transcriptions
  FOR SELECT USING (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transcriptions_updated_at BEFORE UPDATE
    ON transcriptions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add some helpful comments
COMMENT ON TABLE transcriptions IS 'Stores transcript data for audio recordings using OpenAI Whisper';
COMMENT ON COLUMN transcriptions.transcript_text IS 'Plain text transcript from Whisper API';
COMMENT ON COLUMN transcriptions.transcript_json IS 'Full JSON response from Whisper API including timestamps and segments';
COMMENT ON COLUMN transcriptions.status IS 'Current status of transcription process';
COMMENT ON COLUMN transcriptions.duration IS 'Duration of audio in seconds from Whisper API';
COMMENT ON COLUMN transcriptions.language IS 'Detected language code from Whisper API';
