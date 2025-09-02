import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Lock,
  FileAudio,
  HardDrive,
  Shield,
  Trash2,
  FileText,
  Loader2,
} from "lucide-react";
import RecordingService from "@/services/RecordingService";

interface Recording {
  id: string;
  created_at: string;
  call_code: string;
  voucher_name?: string;
  vouchee_name?: string;
  duration_seconds?: number;
  file_name: string;
  file_size_bytes?: number;
  upload_status: 'uploading' | 'completed' | 'failed' | 'verifying';
  verification_status: 'pending' | 'verified' | 'corrupted' | 'missing';
  retry_count: number;
  chunks_total?: number;
  chunks_uploaded?: number;
  last_error_message?: string;
  transcription?: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    transcript_text?: string;
    duration?: number;
    language?: string;
    error_message?: string;
    completed_at?: string;
  };
}

export default function RecordingAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);
  const [transcribingIds, setTranscribingIds] = useState<Set<string>>(new Set());


  // Statistics
  const [stats, setStats] = useState({
    totalRecordings: 0,
    totalDuration: 0,
    totalSize: 0,
    successRate: 0,
  });

  // Simple admin authentication
  const handleAuth = () => {
    if (password === "vouch2024admin") {
      setIsAuthenticated(true);
      loadRecordings();
    } else {
      setMessage({ type: "error", text: "Invalid admin password" });
    }
  };

  const loadRecordings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/recordings");

      if (response.ok) {
        const data = await response.json();
        setRecordings(data.recordings || []);
        calculateStats(data.recordings || []);
      } else {
        console.error("Failed to load recordings:", response.status);
        setMessage({ type: "error", text: "Failed to load recordings" });
      }
    } catch (error) {
      console.error("Error loading recordings:", error);
      setMessage({ type: "error", text: "Error loading recordings" });
    }
    setIsLoading(false);
  };


  const calculateStats = (recordings: Recording[]) => {
    const total = recordings.length;
    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const totalSize = recordings.reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);
    const completed = recordings.filter(r => r.upload_status === 'completed').length;

    setStats({
      totalRecordings: total,
      totalDuration,
      totalSize,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  };

  const downloadRecording = async (recordingId: string, fileName: string) => {
    try {
      setMessage({ type: "success", text: "Preparing download..." });

      // Get all chunks for this recording
      const response = await fetch(`/api/admin/recordings/${recordingId}/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || `recording_${recordingId}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setMessage({ type: "success", text: "Download started!" });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: "error", text: "Download failed. Recording may still be processing." });
    }
  };

  const toggleAudioPlayback = async (recordingId: string) => {
    try {
      // Stop any currently playing audio
      if (playingAudio && playingAudio !== recordingId) {
        const currentAudio = audioElements.get(playingAudio);
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
        setPlayingAudio(null);
      }

      // Get or create audio element for this recording
      let audio = audioElements.get(recordingId);

      if (!audio) {
        setLoadingAudio(recordingId);
        setMessage({ type: "success", text: "Loading audio..." });

        // Download the audio file and create a blob URL
        const response = await fetch(`/api/admin/recordings/${recordingId}/download`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: password })
        });

        if (!response.ok) {
          throw new Error('Failed to load audio');
        }

        const blob = await response.blob();
        const audioUrl = window.URL.createObjectURL(blob);

        audio = new Audio(audioUrl);
        audio.onended = () => {
          setPlayingAudio(null);
        };
        audio.onerror = (e) => {
          console.error('Audio playback error:', e);
          setMessage({ type: "error", text: "Failed to play audio. The recording may be corrupted." });
          setPlayingAudio(null);
          setLoadingAudio(null);
        };
        audio.onloadeddata = () => {
          setLoadingAudio(null);
          setMessage({ type: "success", text: "Audio loaded successfully!" });
        };

        // Store the audio element
        const newAudioElements = new Map(audioElements);
        newAudioElements.set(recordingId, audio);
        setAudioElements(newAudioElements);
      }

      if (playingAudio === recordingId) {
        // Currently playing this audio, so pause it
        audio.pause();
        setPlayingAudio(null);
      } else {
        // Start playing this audio
        setLoadingAudio(null);
        await audio.play();
        setPlayingAudio(recordingId);
        setMessage({ type: "success", text: "Playing audio..." });
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setMessage({ type: "error", text: "Failed to play audio. The recording may still be processing or unavailable." });
      setPlayingAudio(null);
      setLoadingAudio(null);
    }
  };

  const fixStuckRecording = async (recordingId: string) => {
    try {
      setMessage({ type: "success", text: "Attempting to fix stuck recording..." });

      const response = await fetch(`/api/admin/recordings/${recordingId}/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: "success", text: result.message || "Recording fixed successfully" });
        loadRecordings();
      } else {
        setMessage({ type: "error", text: "Failed to fix recording" });
      }
    } catch (error) {
      setMessage({ type: "error", text: `Fix failed: ${error.message}` });
    }
  };

  const retryFailedUpload = async (recordingId: string) => {
    try {
      setMessage({ type: "success", text: "Starting retry process..." });

      const response = await fetch("/api/admin/recordings/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recording_id: recordingId,
          password: password,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Retry completed" });
      } else {
        setMessage({ type: "error", text: "Retry failed" });
      }

      loadRecordings();
    } catch (error) {
      setMessage({ type: "error", text: `Retry failed: ${error.message}` });
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!confirm("Are you sure you want to delete this recording? This action cannot be undone.")) {
      return;
    }

    try {
      setMessage({ type: "warning", text: "Deleting recording..." });

      const response = await fetch(`/api/admin/recordings/${recordingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: "success", text: "Recording deleted successfully" });
        loadRecordings();
        console.log("✅ Recording deletion completed:", result);
      } else {
        const errorData = await response.text();
        console.error("❌ Delete request failed:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        setMessage({
          type: "error",
          text: `Failed to delete recording: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      console.error("❌ Delete request error:", error);
      setMessage({
        type: "error",
        text: `Error deleting recording: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const startTranscription = async (recordingId: string) => {
    try {
      setTranscribingIds(prev => new Set(prev).add(recordingId));
      setMessage({ type: "success", text: "Starting transcription with OpenAI Whisper..." });

      const response = await fetch('/api/admin/recordings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: recordingId,
          password: password
        })
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: "success", text: "Transcription completed successfully!" });

        // Force refresh with a small delay to ensure data is saved
        setTimeout(() => {
          loadRecordings();
        }, 1000);
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Unknown error';
        } catch (jsonError) {
          // If response isn't JSON, use status text
          errorMessage = `${response.status} ${response.statusText}`;
        }
        setMessage({ type: "error", text: `Transcription failed: ${errorMessage}` });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setMessage({ type: "error", text: `Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setTranscribingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recordingId);
        return newSet;
      });
    }
  };

  const saveTranscriptChanges = async (recordingId: string, transcriptText: string) => {
    try {
      setMessage({ type: "success", text: "Saving transcript changes..." });

      const response = await fetch('/api/admin/recordings/transcript', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_id: recordingId,
          transcript_text: transcriptText,
          password: password
        })
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Transcript saved successfully!" });
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Unknown error';
        } catch (jsonError) {
          errorMessage = `${response.status} ${response.statusText}`;
        }

        console.error("❌ Save transcript failed:", errorMessage);
        setMessage({
          type: "error",
          text: `Failed to save transcript: ${errorMessage}`
        });
      }
    } catch (error) {
      console.error("❌ Save transcript error:", error);
      setMessage({
        type: "error",
        text: `Error saving transcript: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const getTranscriptionColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'processing': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Filter recordings based on search term
  const filteredRecordings = recordings.filter(recording => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      recording.call_code.toLowerCase().includes(searchLower) ||
      recording.voucher_name?.toLowerCase().includes(searchLower) ||
      recording.vouchee_name?.toLowerCase().includes(searchLower)
    );
  });

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatRecordingTitle = (recording: Recording): { title: string; subtitle?: string } => {
    if (recording.voucher_name && recording.vouchee_name) {
      return {
        title: `${recording.voucher_name} → ${recording.vouchee_name}`,
        subtitle: recording.call_code
      };
    } else if (recording.voucher_name) {
      return {
        title: `${recording.voucher_name} - Interview Recording`,
        subtitle: recording.call_code
      };
    } else {
      return {
        title: recording.call_code,
        subtitle: undefined
      };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'uploading': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'verifying': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'corrupted': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'missing': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getCallStatus = (durationSeconds?: number): string => {
    if (!durationSeconds) return 'Call incomplete';
    return durationSeconds >= 120 ? 'Call complete' : 'Call incomplete';
  };

  const getCallStatusColor = (durationSeconds?: number) => {
    const status = getCallStatus(durationSeconds);
    return status === 'Call complete'
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-orange-500/20 text-orange-300 border-orange-500/30';
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Auto-refresh recordings every 30 seconds if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(loadRecordings, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      // Stop and cleanup all audio elements
      audioElements.forEach((audio) => {
        audio.pause();
        if (audio.src.startsWith('blob:')) {
          window.URL.revokeObjectURL(audio.src);
        }
      });
      setAudioElements(new Map());
    };
  }, []);


  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Recording Admin Access
            </CardTitle>
            <CardDescription className="text-white/70">
              Enter admin password to manage interview recordings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              onKeyDown={(e) => e.key === "Enter" && handleAuth()}
            />
            <Button
              onClick={handleAuth}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Access Recording Admin
            </Button>
            {message && message.type === "error" && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-300">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
              Recording Admin
            </h1>
            <p className="text-blue-200 text-lg">Interview Recording Management & Monitoring</p>
          </div>
          <div className="absolute top-0 right-0 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20"
              onClick={() => window.open("/admin", "_blank")}
            >
              Prompt Admin
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20"
              onClick={() => window.open("/openai-realtime-test", "_blank")}
            >
              Test Interview
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20"
              onClick={() => setIsAuthenticated(false)}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {message && (
          <Alert
            className={`${
              message.type === "success"
                ? "border-green-500/50 bg-green-500/10"
                : message.type === "warning"
                ? "border-yellow-500/50 bg-yellow-500/10"
                : "border-red-500/50 bg-red-500/10"
            }`}
          >
            <AlertDescription
              className={
                message.type === "success" 
                  ? "text-green-300" 
                  : message.type === "warning"
                  ? "text-yellow-300"
                  : "text-red-300"
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
            <CardContent className="flex items-center p-6">
              <FileAudio className="h-8 w-8 text-blue-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-white/70">Total Recordings</p>
                <p className="text-2xl font-bold text-white">{stats.totalRecordings}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
            <CardContent className="flex items-center p-6">
              <Clock className="h-8 w-8 text-green-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-white/70">Total Duration</p>
                <p className="text-2xl font-bold text-white">{formatDuration(stats.totalDuration)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
            <CardContent className="flex items-center p-6">
              <HardDrive className="h-8 w-8 text-purple-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-white/70">Total Size</p>
                <p className="text-2xl font-bold text-white">{formatFileSize(stats.totalSize)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
            <CardContent className="flex items-center p-6">
              <Shield className="h-8 w-8 text-yellow-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-white/70">Success Rate</p>
                <p className="text-2xl font-bold text-white">{stats.successRate}%</p>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Recordings List */}
        <div className="w-full">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Interview Recordings</CardTitle>
                    <CardDescription className="text-white/70">
                      Manage and monitor all recorded interviews
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {filteredRecordings.length} {searchTerm ? 'found' : 'total'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMessage({ type: "success", text: "Refreshing recordings..." });
                        loadRecordings();
                      }}
                      className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                      title="Refresh all recordings and transcripts"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Refresh All
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mb-9">
                {/* Search Bar */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search by name or call code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                  />
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto mb-48 pb-14">
                  {filteredRecordings.length === 0 ? (
                    <div className="text-center py-8">
                      <FileAudio className="w-12 h-12 text-white/30 mx-auto mb-4" />
                      {searchTerm ? (
                        <>
                          <p className="text-white/50">No recordings found for "{searchTerm}"</p>
                          <p className="text-white/30 text-sm">Try a different search term</p>
                        </>
                      ) : (
                        <>
                          <p className="text-white/50">No recordings found</p>
                          <p className="text-white/30 text-sm">Start your first recording above</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredRecordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            {(() => {
                              const titleInfo = formatRecordingTitle(recording);
                              return (
                                <>
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-white font-medium">{titleInfo.title}</h3>
                                    <Badge className={getStatusColor(recording.upload_status)}>
                                      {recording.upload_status === 'completed' ? 'upload complete' : recording.upload_status}
                                    </Badge>
                                    <Badge className={getCallStatusColor(recording.duration_seconds)}>
                                      {getCallStatus(recording.duration_seconds)}
                                    </Badge>
                                    {recording.transcription && (
                                      <Badge className={getTranscriptionColor(recording.transcription.status)}>
                                        transcript: {recording.transcription.status}
                                      </Badge>
                                    )}
                                  </div>
                                  {titleInfo.subtitle && (
                                    <div className="text-xs text-white/40 mb-2">
                                      Call ID: {titleInfo.subtitle}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <div className="text-sm text-white/60 space-y-1">
                              <div>Created: {new Date(recording.created_at).toLocaleString()}</div>
                              <div className="flex gap-4">
                                {recording.duration_seconds && (
                                  <span>Duration: {formatDuration(recording.duration_seconds)}</span>
                                )}
                                {recording.file_size_bytes && (
                                  <span>Size: {formatFileSize(recording.file_size_bytes)}</span>
                                )}
                                {recording.chunks_total && recording.chunks_uploaded && (
                                  <span>Chunks: {recording.chunks_uploaded}/{recording.chunks_total}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Simple Transcript Text Box */}
                          <div className="flex-1 min-w-0">
                            <div className="bg-black/20 border border-white/10 rounded-lg p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-green-400 font-medium">Transcript</span>
                              </div>

                              {/* Show transcript text if available */}
                              {recording.transcription?.transcript_text ? (
                                <>
                                  <textarea
                                    value={recording.transcription.transcript_text}
                                    onChange={(e) => {
                                      // Update the transcript text in state (for editing)
                                      const newRecordings = recordings.map(r => {
                                        if (r.id === recording.id) {
                                          return {
                                            ...r,
                                            transcription: {
                                              ...r.transcription,
                                              transcript_text: e.target.value
                                            }
                                          };
                                        }
                                        return r;
                                      });
                                      setRecordings(newRecordings);
                                    }}
                                    className="w-full h-24 text-xs text-white/80 bg-transparent border-none resize-none focus:outline-none leading-relaxed"
                                    placeholder="Transcript will appear here..."
                                  />
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() => navigator.clipboard.writeText(recording.transcription!.transcript_text!)}
                                      className="text-xs text-blue-400 hover:text-blue-300"
                                      title="Copy transcript"
                                    >
                                      Copy
                                    </button>
                                    <button
                                      onClick={() => saveTranscriptChanges(recording.id, recording.transcription!.transcript_text!)}
                                      className="text-xs text-green-400 hover:text-green-300"
                                      title="Save transcript changes"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </>
                              ) : recording.upload_status === 'completed' && recording.verification_status === 'verified' ? (
                                /* Two buttons: Generate and Load transcript */
                                <div className="w-full h-24 flex flex-col gap-2 p-2">
                                  <div className="flex gap-2 flex-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => startTranscription(recording.id)}
                                      disabled={transcribingIds.has(recording.id)}
                                      className="flex-1 bg-purple-500/10 border-purple-500/30 text-purple-300 hover:bg-purple-500/20 h-8"
                                      title="Generate new transcript with OpenAI Whisper"
                                    >
                                      {transcribingIds.has(recording.id) ? (
                                        <>
                                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                          <span className="text-xs">Generating...</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText className="w-3 h-3 mr-1" />
                                          <span className="text-xs">📝 Generate</span>
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setMessage({ type: "success", text: "Refreshing transcripts..." });
                                        loadRecordings();
                                      }}
                                      className="flex-1 bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20 h-8"
                                      title="Refresh to load any new transcripts"
                                    >
                                      <RefreshCw className="w-3 h-3 mr-1" />
                                      <span className="text-xs">🔄 Refresh</span>
                                    </Button>
                                  </div>
                                  <div className="text-xs text-white/40 text-center">
                                    Generate new transcript or refresh to load existing
                                  </div>
                                </div>
                              ) : (
                                /* No transcript available */
                                <div className="w-full h-24 flex items-center justify-center bg-black/10 border border-white/5 rounded-lg">
                                  <span className="text-xs text-white/40">
                                    {recording.upload_status !== 'completed'
                                      ? 'Recording must be completed first'
                                      : recording.verification_status !== 'verified'
                                      ? 'Recording must be verified first'
                                      : 'No transcript available'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {/* Play/Pause Button */}
                            {recording.upload_status === 'completed' && recording.verification_status === 'verified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleAudioPlayback(recording.id)}
                                disabled={loadingAudio === recording.id}
                                className="bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20"
                                title={playingAudio === recording.id ? "Pause Audio" : "Play Audio"}
                              >
                                {loadingAudio === recording.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : playingAudio === recording.id ? (
                                  <Pause className="w-3 h-3" />
                                ) : (
                                  <Play className="w-3 h-3" />
                                )}
                              </Button>
                            )}



                            {/* Download Button */}
                            {recording.upload_status === 'completed' && recording.verification_status === 'verified' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => downloadRecording(recording.id, recording.file_name)}
                                className="bg-green-500/10 border-green-500/30 text-green-300 hover:bg-green-500/20"
                                title="Download Recording"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            )}

                            {/* Fix Stuck Recording Button */}
                            {(recording.upload_status === 'uploading' || recording.upload_status === 'verifying') && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fixStuckRecording(recording.id)}
                                className="bg-orange-500/10 border-orange-500/30 text-orange-300 hover:bg-orange-500/20"
                                title="Fix Stuck Recording"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            )}

                            {recording.upload_status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryFailedUpload(recording.id)}
                                className="bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRecording(recording.id)}
                              className="bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>




                        {/* Error Message */}
                        {recording.last_error_message && (
                          <Alert className="border-red-500/50 bg-red-500/10 mt-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-red-300 text-xs">
                              {recording.last_error_message}
                              {recording.retry_count > 0 && (
                                <span className="ml-2">(Retried {recording.retry_count} times)</span>
                              )}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
      </div>
    </div>
  );
}
