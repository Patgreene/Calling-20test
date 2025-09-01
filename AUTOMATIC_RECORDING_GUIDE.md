# Automatic Interview Recording System

## Overview

The system now **automatically records every voice interview** when users click the call button on `/openai-realtime-test`. No manual intervention required - recordings start when calls begin and stop when calls end.

## How It Works

### 🎯 **Automatic Recording Flow**

1. **User clicks "Prepare Call"** - enters voucher/vouchee names
2. **User clicks the green call button** - starts interview with OpenAI
3. **Recording starts automatically** - when WebRTC connection is established
4. **Recording indicator appears** - shows "🔴 REC • Recording active"
5. **User has conversation** - entire interview is captured with high quality
6. **User ends call** - recording stops automatically and is saved
7. **Recording is stored** - with call metadata in Supabase

### 📱 **User Experience**
- **Zero friction**: Users don't need to think about recording
- **Visual indicator**: Clear "🔴 REC" indicator shows recording is active
- **Seamless integration**: Recording happens in the background
- **Reliable storage**: Multiple backup layers ensure no data loss

## Features

### 🎤 **Recording Quality**
- **High-quality audio**: 44.1kHz stereo, 128kbps bitrate
- **Noise suppression**: Automatic echo cancellation and gain control
- **Format optimization**: Automatically selects best browser-supported format
- **Real-time upload**: 30-second chunks uploaded during conversation

### 🛡️ **Reliability & Backup**
- **Triple redundancy**: Primary storage + backup + local browser cache
- **Automatic retry**: Failed uploads retry with exponential backoff
- **Chunk verification**: SHA-256 hash verification for data integrity  
- **Recovery system**: Can recover from network failures and browser crashes

### 📊 **Metadata Storage**
Each recording automatically captures:
- **Call Code**: Unique identifier (e.g. "CALL-ABC123")
- **Voucher Name**: Person making the call
- **Vouchee Name**: Person being vouched for
- **Duration**: Length of conversation
- **Timestamp**: When recording started/ended
- **File Info**: Size, format, quality metrics

## Database Storage

### Automatic Data Capture
```
interview_recordings table:
├── call_code: "CALL-ABC123"
├── voucher_name: "John Smith" 
├── vouchee_name: "Jane Doe"
├── duration_seconds: 180
├── file_size_bytes: 5242880
├── upload_status: "completed"
├── verification_status: "verified"
└── created_at: "2024-01-15T10:30:00Z"
```

### Related Tables
- `recording_chunks`: Individual file pieces for reliability
- `recording_events`: Complete audit trail of all recording events

## Admin Access

### 📋 **Recording Dashboard** (`/recording-admin`)
Admins can:
- View all recorded interviews
- See upload status and verification results
- Retry failed uploads if needed
- Delete recordings if necessary
- Monitor system statistics

### 🔍 **Monitoring Features**
- **Real-time status**: See active recordings in progress
- **Success rates**: Track upload reliability statistics  
- **Error handling**: View and resolve any recording issues
- **Backup management**: Clean up old local backup files

## Technical Implementation

### Integration Points
- **OpenAI Realtime Test Page**: `/openai-realtime-test`
- **Recording Service**: `RecordingService.ts` - handles all recording logic
- **API Endpoints**: `/api/admin/recordings/*` - server-side processing
- **Database**: Supabase tables for metadata and file storage

### Security
- **Admin authentication**: Recording management requires admin password
- **Private storage**: Audio files stored in private Supabase bucket
- **Audit logging**: Complete trail of all recording operations
- **Data integrity**: Hash verification prevents file corruption

## Setup Requirements

### ⚠️ **Database Setup Required**
Before the automatic recording works, you must run the SQL commands from `RECORDING_SETUP_INSTRUCTIONS.md` to create the necessary database tables in Supabase.

### Quick Setup Checklist
- [ ] Run SQL commands to create database tables
- [ ] Verify Supabase storage bucket exists (`interview-recordings`)
- [ ] Test recording on `/openai-realtime-test` page
- [ ] Check recordings appear in `/recording-admin` dashboard

## User Instructions

### For End Users (Interviewees)
1. Go to `/openai-realtime-test`
2. Enter your name and the person you're vouching for
3. Click "Prepare Call"
4. Click the green call button to start
5. **Recording starts automatically** - you'll see the red indicator
6. Have your conversation with Sam (the AI)
7. Click the red hang-up button when done
8. **Recording stops and saves automatically**

### For Admins
1. Access `/recording-admin` with password `vouch2024admin`
2. View all recorded interviews in the dashboard
3. Monitor upload status and success rates
4. Retry any failed uploads if needed
5. Manage storage and cleanup old backups

## Error Handling

### Automatic Recovery
- **Network issues**: Chunks retry automatically with backoff
- **Browser crashes**: Local backup recovers unsaved data
- **Upload failures**: Multiple retry attempts before marking as failed
- **Data corruption**: Hash verification catches and flags bad files

### Manual Recovery
- **Failed recordings**: Use "Retry" button in admin dashboard
- **Missing chunks**: System attempts recovery from local backup
- **Corrupted files**: Admin can delete and retry from backup

## Benefits

### 🎯 **For Users**
- **Zero effort**: Recording happens automatically
- **No tech skills needed**: Simple click-to-call interface
- **Peace of mind**: Visual confirmation recording is working
- **Reliable storage**: Multiple backups prevent data loss

### 🎯 **For Admins**  
- **Complete audit trail**: Every interview is captured
- **Quality assurance**: High-quality recordings with metadata
- **Easy management**: Simple dashboard for all recordings
- **Reliable system**: Built-in error handling and recovery

### 🎯 **For Business**
- **Compliance**: Automatic capture ensures no missed recordings
- **Quality control**: Review any interview for training/verification
- **Data insights**: Analyze conversation patterns and quality
- **Legal protection**: Complete record of all vouching conversations

## Troubleshooting

### Recording Not Starting
1. Check microphone permissions in browser
2. Verify database tables exist in Supabase
3. Check browser console for errors
4. Ensure `/api/admin/recordings` endpoint is working

### Recording Indicator Not Showing
1. Verify RecordingService import is working
2. Check browser supports MediaRecorder API
3. Look for JavaScript errors in console
4. Test with a different browser

### Recordings Not Appearing in Dashboard
1. Check Supabase database connection
2. Verify recording completed successfully
3. Look for upload errors in browser console
4. Try refreshing the admin dashboard

The automatic recording system is designed to be completely transparent to users while providing admins with comprehensive recording management and monitoring capabilities.
