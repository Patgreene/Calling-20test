# Interview Recording System Setup Instructions

This document provides complete setup instructions for the robust interview recording system with excellent quality, reliability, and backup strategies.

## Database Setup Required

**IMPORTANT**: You need to set up these database tables in your Supabase instance before the recording system will work.

### 1. Create Main Recordings Table

```sql
-- Main recordings table
CREATE TABLE interview_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Recording Metadata
  call_code TEXT NOT NULL,
  voucher_name TEXT,
  vouchee_name TEXT,
  duration_seconds INTEGER,
  
  -- File Information
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT DEFAULT 'audio/wav',
  bitrate INTEGER DEFAULT 48000,
  
  -- Storage & Backup
  primary_storage_path TEXT,
  backup_storage_path TEXT,
  local_backup_path TEXT,
  
  -- Status & Reliability
  upload_status TEXT CHECK (upload_status IN ('uploading', 'completed', 'failed', 'verifying')) DEFAULT 'uploading',
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'corrupted', 'missing')) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  
  -- Quality Assurance  
  file_hash TEXT,
  chunks_total INTEGER,
  chunks_uploaded INTEGER DEFAULT 0,
  
  -- Admin tracking
  admin_notes TEXT,
  archived BOOLEAN DEFAULT FALSE
);
```

### 2. Create Recording Chunks Table

```sql
-- Recording chunks table (for reliable chunked uploads)
CREATE TABLE recording_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES interview_recordings(id) ON DELETE CASCADE,
  chunk_number INTEGER NOT NULL,
  chunk_size_bytes INTEGER,
  chunk_hash TEXT,
  upload_status TEXT CHECK (upload_status IN ('pending', 'uploaded', 'failed')) DEFAULT 'pending',
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Create Events Log Table

```sql
-- Recording events log (for audit trail)
CREATE TABLE recording_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID REFERENCES interview_recordings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Create Indexes for Performance

```sql
-- Create indexes for better performance
CREATE INDEX idx_interview_recordings_call_code ON interview_recordings(call_code);
CREATE INDEX idx_interview_recordings_status ON interview_recordings(upload_status, verification_status);
CREATE INDEX idx_interview_recordings_created ON interview_recordings(created_at DESC);
CREATE INDEX idx_recording_chunks_recording_id ON recording_chunks(recording_id);
CREATE INDEX idx_recording_events_recording_id ON recording_events(recording_id);
```

### 5. Set Up Supabase Storage Bucket

```sql
-- Create storage bucket for recordings (run in Supabase SQL editor)
INSERT INTO storage.buckets (id, name, public) VALUES ('interview-recordings', 'interview-recordings', false);

-- Set up storage policies (adjust as needed for your security requirements)
CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'interview-recordings');
CREATE POLICY "Allow authenticated reads" ON storage.objects FOR SELECT USING (bucket_id = 'interview-recordings');
CREATE POLICY "Allow authenticated deletes" ON storage.objects FOR DELETE USING (bucket_id = 'interview-recordings');
```

## Features Implemented

### 🎯 Core Recording Features
- **High-Quality Audio**: 44.1kHz, stereo, 128kbps with noise suppression
- **Real-Time Chunked Upload**: 30-second chunks uploaded immediately
- **Format Auto-Detection**: Automatically selects best supported audio format
- **Live Progress Monitoring**: Real-time status updates during recording

### 🛡️ Reliability & Backup
- **Triple Redundancy**: Primary storage + backup storage + local IndexedDB cache
- **Automatic Retry Logic**: Exponential backoff with up to 5 retry attempts
- **Chunk Verification**: SHA-256 hash verification for each chunk
- **Recovery System**: Can recover from IndexedDB if server uploads fail

### 🔧 Error Handling
- **Network Failure Recovery**: Automatic retry with exponential backoff
- **Browser Crash Protection**: IndexedDB backup survives browser crashes  
- **Upload Monitoring**: Real-time tracking of chunk upload success/failure
- **Comprehensive Logging**: Complete audit trail of all recording events

### 🎛️ Admin Features
- **Recording Dashboard**: Live monitoring of all recordings
- **Manual Retry**: Force retry of failed uploads
- **Backup Cleanup**: Remove old local backups to save space
- **Status Tracking**: Upload progress, verification status, error details

## How to Use

### 1. Access Recording Admin
Navigate to `/recording-admin` and log in with the admin password (`vouch2024admin`).

### 2. Start Recording
- Click "Start Recording" button
- Grant microphone permissions when prompted
- Recording starts immediately with real-time chunk uploads
- Monitor progress in the live status panel

### 3. Monitor Upload Status
- Chunks upload automatically every 30 seconds
- Failed chunks are automatically retried
- Backup copies saved to browser's IndexedDB
- Real-time statistics show upload progress

### 4. Stop Recording
- Click "Stop Recording" when finished
- System finalizes recording and verifies all chunks
- Complete audit trail saved to database
- Recording appears in admin dashboard

### 5. Recovery Options
- **Server Retry**: Use "Retry" button for failed recordings
- **Backup Recovery**: System automatically tries IndexedDB backup if server fails
- **Manual Cleanup**: Use "Cleanup Backups" to remove old local files

## Testing Checklist

### ✅ Pre-Testing Setup
- [ ] Database tables created in Supabase
- [ ] Storage bucket created and configured
- [ ] Recording Admin page accessible at `/recording-admin`
- [ ] Admin password working (`vouch2024admin`)

### ✅ Basic Recording Test
- [ ] Can start recording (microphone permission granted)
- [ ] Real-time status updates working
- [ ] Chunks uploading automatically (check browser network tab)
- [ ] Can stop recording successfully
- [ ] Recording appears in admin dashboard

### ✅ Quality Test
- [ ] Audio quality is excellent (clear, no distortion)
- [ ] Recording captures full conversation
- [ ] File size appropriate for duration
- [ ] Playback works correctly

### ✅ Reliability Test
- [ ] Simulate network interruption during recording
- [ ] Verify chunks retry automatically
- [ ] Check IndexedDB backup creation
- [ ] Test recovery from backup
- [ ] Verify data integrity after recovery

### ✅ Error Handling Test
- [ ] Test microphone permission denial
- [ ] Test server error during upload
- [ ] Test browser refresh during recording
- [ ] Verify error messages are helpful
- [ ] Check audit log captures all events

## Architecture Overview

```
📱 Client (RecordingAdmin.tsx)
    ↓ uses
🔧 RecordingService.ts (Main Logic)
    ├── MediaRecorder API (High-quality capture)
    ├── IndexedDB (Local backup)
    └── Chunked Upload (Real-time reliability)
        ↓ uploads to
🌐 API Endpoints (/api/admin/recordings/*)
    ├── /recordings (Start/list sessions)
    ├── /chunk (Upload individual chunks)
    ├── /finalize (Complete recording)
    ├── /retry (Retry failed uploads)
    └── /[id] (Delete recordings)
        ↓ stores in
🗄️ Supabase
    ├── PostgreSQL (Metadata & status)
    └── Storage (Audio files)
```

## Security Notes

- Admin authentication required for all recording operations
- Audio files stored in private Supabase storage bucket
- Comprehensive audit logging for compliance
- Local backup data automatically cleaned up
- SHA-256 integrity verification prevents corruption

## Troubleshooting

### Recording Won't Start
1. Check microphone permissions in browser
2. Verify admin password is correct
3. Check browser console for errors
4. Ensure Supabase tables exist

### Chunks Not Uploading
1. Check network connectivity
2. Verify Supabase storage bucket exists
3. Check API endpoint responses in network tab
4. Look for retry attempts in browser console

### Poor Audio Quality
1. Check microphone hardware
2. Verify browser supports high-quality codecs
3. Test different audio input devices
4. Check for background noise interference

### Recovery Issues
1. Check IndexedDB in browser dev tools
2. Verify backup chunks exist locally
3. Test manual retry functionality
4. Check Supabase logs for upload errors

The system is designed to be extremely reliable with multiple layers of backup and recovery. Contact support if issues persist.
