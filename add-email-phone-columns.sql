-- Add email and phone columns for the person making the vouch
-- Run this SQL in your Supabase SQL editor

ALTER TABLE interview_recordings 
ADD COLUMN voucher_email TEXT,
ADD COLUMN voucher_phone TEXT;
