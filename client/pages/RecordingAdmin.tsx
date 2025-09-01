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
  Square,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  Mic,
  MicOff,
  RefreshCw,
  Lock,
  FileAudio,
  HardDrive,
  Shield,
  Trash2,
  Archive,
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
}

export default function RecordingAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<{
    id: string;
    duration: number;
    chunks: number;
    status: string;
  } | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "warning";
    text: string;
  } | null>(null);

  // Recording service
  const recordingService = useRef(RecordingService.getInstance());
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    totalRecordings: 0,
    totalDuration: 0,
    totalSize: 0,
    successRate: 0,
    activeUploads: 0,
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
        setMessage({ type: "error", text: "Failed to load recordings" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error loading recordings" });
    }
    setIsLoading(false);
  };

  const calculateStats = (recordings: Recording[]) => {
    const total = recordings.length;
    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
    const totalSize = recordings.reduce((sum, r) => sum + (r.file_size_bytes || 0), 0);
    const completed = recordings.filter(r => r.upload_status === 'completed').length;
    const activeUploads = recordings.filter(r => r.upload_status === 'uploading').length;
    
    setStats({
      totalRecordings: total,
      totalDuration,
      totalSize,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      activeUploads,
    });
  };

  const startRecording = async () => {
    try {
      setMessage({ type: "success", text: "Starting recording session..." });
      
      // Get microphone access with high quality settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 2,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      streamRef.current = stream;

      // Determine the best MIME type for recording
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/wav',
        'audio/webm'
      ];
      
      let selectedMimeType = 'audio/wav';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      // Create MediaRecorder with high quality settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000, // High quality bitrate
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Create recording session in database
      const sessionResponse = await fetch("/api/admin/recordings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start_recording",
          call_code: `REC-${Date.now()}`,
          mime_type: selectedMimeType,
          password: password,
        }),
      });

      if (!sessionResponse.ok) {
        throw new Error("Failed to create recording session");
      }

      const { recording_id } = await sessionResponse.json();
      recordingIdRef.current = recording_id;

      // Handle data available (every 30 seconds for chunked upload)
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          
          // Upload chunk immediately for reliability
          await uploadChunk(event.data, chunksRef.current.length - 1);
          
          setCurrentRecording(prev => prev ? {
            ...prev,
            chunks: chunksRef.current.length,
          } : null);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        await finalizeRecording();
      };

      // Start recording with 30-second chunks
      mediaRecorder.start(30000); // 30 seconds per chunk
      setIsRecording(true);
      
      setCurrentRecording({
        id: recording_id,
        duration: 0,
        chunks: 0,
        status: "Recording in progress...",
      });

      // Update duration every second
      const durationInterval = setInterval(() => {
        setCurrentRecording(prev => prev ? {
          ...prev,
          duration: prev.duration + 1,
        } : null);
      }, 1000);

      // Store interval reference for cleanup
      (window as any).recordingDurationInterval = durationInterval;

      setMessage({ 
        type: "success", 
        text: `Recording started with ${selectedMimeType}. Uploading chunks in real-time for maximum reliability.` 
      });

    } catch (error) {
      console.error("Recording start error:", error);
      setMessage({ 
        type: "error", 
        text: `Failed to start recording: ${error.message}` 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop duration tracking
      if ((window as any).recordingDurationInterval) {
        clearInterval((window as any).recordingDurationInterval);
      }
      
      // Stop media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setMessage({ type: "success", text: "Recording stopped. Finalizing upload..." });
    }
  };

  const uploadChunk = async (chunk: Blob, chunkIndex: number) => {
    if (!recordingIdRef.current) return;

    try {
      const formData = new FormData();
      formData.append('chunk', chunk);
      formData.append('recording_id', recordingIdRef.current);
      formData.append('chunk_index', chunkIndex.toString());
      formData.append('password', password);

      const response = await fetch("/api/admin/recordings/chunk", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.statusText}`);
      }

      console.log(`✅ Chunk ${chunkIndex} uploaded successfully`);
      
    } catch (error) {
      console.error(`❌ Chunk ${chunkIndex} upload failed:`, error);
      setMessage({ 
        type: "error", 
        text: `Chunk ${chunkIndex} upload failed. Will retry automatically.` 
      });
    }
  };

  const finalizeRecording = async () => {
    if (!recordingIdRef.current) return;

    try {
      setCurrentRecording(prev => prev ? {
        ...prev,
        status: "Finalizing recording...",
      } : null);

      const response = await fetch("/api/admin/recordings/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recording_id: recordingIdRef.current,
          total_chunks: chunksRef.current.length,
          total_duration: currentRecording?.duration || 0,
          password: password,
        }),
      });

      if (response.ok) {
        setMessage({ 
          type: "success", 
          text: "Recording completed and verified successfully!" 
        });
        setCurrentRecording(null);
        recordingIdRef.current = null;
        loadRecordings(); // Refresh the list
      } else {
        throw new Error("Failed to finalize recording");
      }

    } catch (error) {
      console.error("Finalization error:", error);
      setMessage({ 
        type: "error", 
        text: "Recording completed but finalization failed. Check the recordings list." 
      });
    }
  };

  const retryFailedUpload = async (recordingId: string) => {
    try {
      const response = await fetch("/api/admin/recordings/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recording_id: recordingId,
          password: password,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Retry initiated successfully" });
        loadRecordings();
      } else {
        setMessage({ type: "error", text: "Failed to retry upload" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error retrying upload" });
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!confirm("Are you sure you want to delete this recording? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/recordings/${recordingId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Recording deleted successfully" });
        loadRecordings();
      } else {
        setMessage({ type: "error", text: "Failed to delete recording" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error deleting recording" });
    }
  };

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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Recording Admin
          </h1>
          <p className="text-blue-200 text-lg">Interview Recording Management & Monitoring</p>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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

          <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
            <CardContent className="flex items-center p-6">
              <Upload className="h-8 w-8 text-orange-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-white/70">Active Uploads</p>
                <p className="text-2xl font-bold text-white">{stats.activeUploads}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recording Controls */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Recording Controls
                </CardTitle>
                <CardDescription className="text-white/70">
                  Start and manage interview recordings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      size="lg"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                      size="lg"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop Recording
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    onClick={loadRecordings}
                    disabled={isLoading}
                    className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                    />
                    Refresh List
                  </Button>
                </div>

                {/* Current Recording Status */}
                {currentRecording && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-red-300 font-medium">RECORDING LIVE</span>
                    </div>
                    <div className="space-y-2 text-sm text-white/80">
                      <div>Duration: {formatDuration(currentRecording.duration)}</div>
                      <div>Chunks Uploaded: {currentRecording.chunks}</div>
                      <div>Status: {currentRecording.status}</div>
                    </div>
                  </div>
                )}

                {/* Recording Tips */}
                <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h4 className="text-blue-300 font-medium mb-2">Recording Tips:</h4>
                  <ul className="text-sm text-blue-200 space-y-1">
                    <li>• Ensure stable internet connection</li>
                    <li>• Use headphones to prevent echo</li>
                    <li>• Speak clearly and at normal volume</li>
                    <li>• Upload happens automatically in chunks</li>
                    <li>• Do not close browser during recording</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recordings List */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Interview Recordings</CardTitle>
                    <CardDescription className="text-white/70">
                      Manage and monitor all recorded interviews
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {recordings.length} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {recordings.length === 0 ? (
                    <div className="text-center py-8">
                      <FileAudio className="w-12 h-12 text-white/30 mx-auto mb-4" />
                      <p className="text-white/50">No recordings found</p>
                      <p className="text-white/30 text-sm">Start your first recording above</p>
                    </div>
                  ) : (
                    recordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-white font-medium">{recording.call_code}</h3>
                              <Badge className={getStatusColor(recording.upload_status)}>
                                {recording.upload_status}
                              </Badge>
                              <Badge className={getVerificationColor(recording.verification_status)}>
                                {recording.verification_status}
                              </Badge>
                            </div>
                            <div className="text-sm text-white/60 space-y-1">
                              <div>Created: {new Date(recording.created_at).toLocaleString()}</div>
                              {recording.voucher_name && (
                                <div>Voucher: {recording.voucher_name}</div>
                              )}
                              {recording.vouchee_name && (
                                <div>Vouchee: {recording.vouchee_name}</div>
                              )}
                              <div className="flex gap-4">
                                {recording.duration_seconds && (
                                  <span>Duration: {formatDuration(recording.duration_seconds)}</span>
                                )}
                                {recording.file_size_bytes && (
                                  <span>Size: {formatFileSize(recording.file_size_bytes)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
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

                        {/* Upload Progress */}
                        {recording.chunks_total && recording.chunks_uploaded && (
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-white/60 mb-1">
                              <span>Upload Progress</span>
                              <span>{recording.chunks_uploaded}/{recording.chunks_total} chunks</span>
                            </div>
                            <Progress
                              value={(recording.chunks_uploaded / recording.chunks_total) * 100}
                              className="h-2"
                            />
                          </div>
                        )}

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

        {/* Quick Actions */}
        <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20"
                onClick={() => window.open("/admin", "_blank")}
              >
                Prompt Admin
              </Button>
              <Button
                variant="outline"
                className="bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20"
                onClick={() => window.open("/openai-realtime-test", "_blank")}
              >
                Test Interview
              </Button>
              <Button
                variant="outline"
                className="bg-slate-500/10 border-slate-500/30 text-slate-300 hover:bg-slate-500/20"
                onClick={() => setIsAuthenticated(false)}
              >
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
