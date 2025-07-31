import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function TestCall() {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [callSession, setCallSession] = useState<any>(null);
  const [userName, setUserName] = useState("Patrick");
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [wsStatus, setWsStatus] = useState<string>("disconnected");
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const startSynthflowCall = async () => {
    setIsCallInProgress(true);

    // Get form_id from localStorage or generate one
    const storedFormId = localStorage.getItem("form_id");
    const formId = storedFormId || `test-form-${Date.now()}`;

    // Use the correct SynthFlow widget endpoint for WebSocket token
    const assistantId = "63e56c5a-2a00-447a-906a-131e89aa7ccd";
    const tokenUrl = `https://widget.synthflow.ai/websocket/token/${assistantId}`;

    console.log("🚀 Requesting SynthFlow WebSocket session with:");
    console.log("📍 URL:", tokenUrl);
    console.log("📋 Assistant ID:", assistantId);
    console.log("📋 Form ID:", formId);
    console.log("📋 User Name:", userName);

    try {
      const response = await fetch(tokenUrl, {
        method: "GET",
        headers: {
          Authorization: "Bearer 8RXXy1DFjppf7W1wzgSds6NAm03cM_Xu6MW9PfT9U9E",
        },
      });

      console.log("📡 Response Status:", response.status, response.statusText);
      console.log(
        "📡 Response Headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error Response:", errorText);
        throw new Error(
          `Token request failed: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("✅ WebSocket Token Response:", data);

      // Store session information
      setCallSession(data);

      // Store form_id if we generated one
      if (!storedFormId) {
        localStorage.setItem("form_id", formId);
      }

      alert("WebSocket session token obtained successfully!");
    } catch (error) {
      console.error("💥 Error getting WebSocket token:", error);
      alert(`Failed to get session token: ${error.message}`);
      setIsCallInProgress(false);
    }
  };

  const requestMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      setAudioStream(stream);
      console.log("��� Microphone access granted");
      return stream;
    } catch (error) {
      console.error("❌ Microphone access denied:", error);
      alert("Microphone access is required for voice calls");
      throw error;
    }
  };

  const startAudioCapture = (ws: WebSocket, stream: MediaStream) => {
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)({
      sampleRate: 48000,
    });
    setAudioContext(audioCtx);

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    processor.onaudioprocess = (event) => {
      if (ws.readyState === WebSocket.OPEN && isRecording) {
        const inputBuffer = event.inputBuffer.getChannelData(0);
        // Convert Float32Array to PCM16
        const pcm16 = new Int16Array(inputBuffer.length);
        for (let i = 0; i < inputBuffer.length; i++) {
          pcm16[i] = Math.max(-32768, Math.min(32767, inputBuffer[i] * 32768));
        }
        ws.send(pcm16.buffer);
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    setIsRecording(true);
    console.log("🎵 Audio capture started");
  };

  const playAgentAudio = (audioData: ArrayBuffer) => {
    if (!audioContext) return;

    try {
      // Convert PCM16 to Float32Array
      const pcm16 = new Int16Array(audioData);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      // Create audio buffer (16kHz mono from agent)
      const audioBuffer = audioContext.createBuffer(1, float32.length, 16000);
      audioBuffer.getChannelData(0).set(float32);

      // Play the audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      console.log("🔊 Playing agent audio");
    } catch (error) {
      console.error("❌ Error playing audio:", error);
    }
  };

  const connectToWebSocket = async () => {
    if (!callSession?.sessionURL) {
      alert("No WebSocket URL available");
      return;
    }

    try {
      setWsStatus("connecting");

      // Request microphone access first
      const stream = await requestMicrophone();

      const ws = new WebSocket(callSession.sessionURL);

      ws.onopen = () => {
        console.log("✅ WebSocket connected successfully");
        setWsStatus("connected");
        setWsConnection(ws);

        // Send client ready status
        ws.send(JSON.stringify({ type: "status_client_ready" }));

        // Start audio capture
        startAudioCapture(ws, stream);
      };

      ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          console.log("📩 Received JSON message:", event.data);
          const message = JSON.parse(event.data);
          if (message.type === "status_agent_ready") {
            console.log("🤖 Agent is ready to receive audio");
          }
        } else {
          console.log(
            "🎵 Received audio data from agent, size:",
            event.data.byteLength,
          );
          playAgentAudio(event.data);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        setWsStatus("error");
        alert("WebSocket connection failed");
      };

      ws.onclose = (event) => {
        console.log(
          "🔌 WebSocket disconnected. Code:",
          event.code,
          "Reason:",
          event.reason,
        );
        setWsStatus("disconnected");
        setWsConnection(null);
        setIsRecording(false);
      };
    } catch (error) {
      console.error("💥 Error connecting:", error);
      setWsStatus("error");
      alert(`Failed to connect: ${error.message}`);
    }
  };

  const disconnectWebSocket = () => {
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
      setWsStatus("disconnected");
    }

    // Clean up audio resources
    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }

    setIsRecording(false);
  };

  const endCall = () => {
    disconnectWebSocket();
    setIsCallInProgress(false);
    setCallSession(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Test Call Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center font-sans">
            SynthFlow WebRTC Test
          </h2>

          {callSession ? (
            /* Web Call Interface */
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                      <Phone className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute inset-0 w-16 h-16 bg-green-400 rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-green-600">
                    Web Call Active
                  </h3>
                  <p className="text-gray-600">
                    SynthFlow WebRTC session established
                  </p>
                </div>
              </div>

              {/* Display session information */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <h4 className="font-semibold mb-2">Session Information:</h4>
                <pre className="text-xs overflow-auto bg-white p-2 rounded border">
                  {JSON.stringify(callSession, null, 2)}
                </pre>
              </div>

              {/* Check for WebSocket session URL */}
              {callSession.sessionURL && (
                <div className="space-y-4">
                  <h4 className="font-semibold">WebSocket Session Ready:</h4>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-blue-800">
                        WebSocket URL obtained successfully!
                      </p>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          wsStatus === "connected"
                            ? "bg-green-100 text-green-800"
                            : wsStatus === "connecting"
                              ? "bg-yellow-100 text-yellow-800"
                              : wsStatus === "error"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {wsStatus}
                      </div>
                    </div>

                    {wsStatus === "connected" ? (
                      <div className="text-sm text-green-700">
                        <p className="font-medium">
                          🎉 Connected to SynthFlow AI Agent!
                        </p>
                        <p>
                          You can now speak and the AI will respond in
                          real-time.
                        </p>
                        {isRecording && (
                          <div className="flex items-center gap-2 mt-2 text-red-600">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium">
                              Recording audio...
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>
                          Use the sessionURL to establish WebSocket connection
                        </li>
                        <li>
                          Send/receive real-time audio data (PCM16 format)
                        </li>
                        <li>Implement voice interaction with the AI agent</li>
                      </ul>
                    )}
                  </div>

                  <div className="text-xs bg-gray-100 p-3 rounded border overflow-auto">
                    <strong>Session URL:</strong>
                    <br />
                    <code className="break-all">{callSession.sessionURL}</code>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="flex flex-wrap gap-2 justify-center">
                      <Button
                        onClick={() =>
                          navigator.clipboard.writeText(callSession.sessionURL)
                        }
                        variant="outline"
                        size="sm"
                        className="text-xs"
                      >
                        Copy URL
                      </Button>

                      {wsStatus === "connected" ? (
                        <Button
                          onClick={disconnectWebSocket}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          onClick={connectToWebSocket}
                          disabled={wsStatus === "connecting"}
                          className="bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
                        >
                          {wsStatus === "connecting"
                            ? "Connecting..."
                            : "Connect to Agent"}
                        </Button>
                      )}
                    </div>

                    {wsStatus === "disconnected" && (
                      <p className="text-xs text-gray-600 mt-2">
                        Click "Connect to Agent" to establish real-time voice
                        connection with SynthFlow AI.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Show if no recognized session data */}
              {!callSession.sessionURL && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Unexpected response format. Check session data below for
                    details.
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={endCall}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  End Call
                </Button>
              </div>
            </div>
          ) : isCallInProgress ? (
            /* Loading State */
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                    <Phone className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 bg-blue-400 rounded-full animate-ping opacity-75"></div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-blue-600">
                  Connecting...
                </h3>
                <p className="text-gray-600">Setting up WebRTC session...</p>
              </div>
            </div>
          ) : (
            /* Start Call Form */
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="userName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Your Name
                  </label>
                  <input
                    id="userName"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your name"
                  />
                </div>

                <p className="text-gray-600 text-sm">
                  Click the button below to start a WebRTC call using SynthFlow.
                </p>

                <Button
                  onClick={startSynthflowCall}
                  disabled={!userName.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Phone className="w-5 h-5" />
                  Start Web Call
                </Button>
              </div>

              <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                <div>
                  <strong>Assistant ID:</strong>{" "}
                  63e56c5a-2a00-447a-906a-131e89aa7ccd
                </div>
                <div>
                  <strong>Method:</strong> GET /websocket/token/
                  {"{assistant_id}"}
                </div>
                <div>
                  <strong>Endpoint:</strong> widget.synthflow.ai
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-6 left-6">
        <Link to="/">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
      </div>
    </div>
  );
}
