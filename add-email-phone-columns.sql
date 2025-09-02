-- Add email and phone columns to interview_recordings table
-- Run this SQL in your Supabase SQL editor to add the new columns

ALTER TABLE interview_recordings 
ADD COLUMN voucher_email TEXT,
ADD COLUMN voucher_phone TEXT,
ADD COLUMN vouchee_email TEXT,
ADD COLUMN vouchee_phone TEXT;

-- Optional: Add comments to document the new columns
COMMENT ON COLUMN interview_recordings.voucher_email IS 'Email address of the person making the vouch';
COMMENT ON COLUMN interview_recordings.voucher_phone IS 'Phone number of the person making the vouch';
COMMENT ON COLUMN interview_recordings.vouchee_email IS 'Email address of the person being vouched for';
COMMENT ON COLUMN interview_recordings.vouchee_phone IS 'Phone number of the person being vouched for';

-- Create indexes for performance on email columns (useful for lookups)
CREATE INDEX IF NOT EXISTS idx_interview_recordings_voucher_email ON interview_recordings(voucher_email);
CREATE INDEX IF NOT EXISTS idx_interview_recordings_vouchee_email ON interview_recordings(vouchee_email);
