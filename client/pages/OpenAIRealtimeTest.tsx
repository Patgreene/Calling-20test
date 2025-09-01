import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import RecordingService from "@/services/RecordingService";

export default function OpenAIRealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Ready to start test call");
  const [voucherName, setVoucherName] = useState("");
  const [voucheeName, setVoucheeName] = useState("");
  const [callCode, setCallCode] = useState<string | null>(null);
  const [preparedNames, setPreparedNames] = useState<{
    voucher_first: string;
    voucher_last: string;
    vouchee_first: string;
    vouchee_last: string;
  } | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string>("");
  const recordingService = useRef(RecordingService.getInstance());
  const currentRecordingId = useRef<string | null>(null);

  const startCall = async () => {
    try {
      // Generate a call code if one doesn't exist
      if (!callCode) {
        const newCallCode = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        setCallCode(newCallCode);
      }

      setIsConnecting(true);
      setStatus("Getting client secret...");

      // Step 1: Get fresh prompt data (from prepareCall) or fetch it now
      let promptData = (window as any).freshPromptData;
      if (!promptData) {
        console.log("⚠️ No fresh prompt data found, fetching now...");
        const promptResponse = await fetch("/api/active-prompt");
        if (!promptResponse.ok) {
          throw new Error("Failed to fetch active prompt");
        }
        promptData = await promptResponse.json();
        console.log("✅ Fetched prompt data for call:", promptData);
      }

      // Step 2: Fetch client secret from server (just for OpenAI API key)
      const response = await fetch("/api/realtime/client-secret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "alloy",
          prompt_id: "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get client secret: ${response.statusText}`);
      }

      const { client_secret } = await response.json();

      // Use fresh prompt data instead of server config
      const config = {
        instructions: promptData.instructions,
        sessionConfig: promptData.sessionConfig,
        model: "gpt-4o-realtime-preview-2024-12-17",
      };

      console.log("Using fresh prompt data for call:", {
        instructionsLength: config.instructions.length,
        sessionConfig: config.sessionConfig,
        promptId: promptData.id,
        fallback: promptData.fallback,
      });
      setStatus("Getting microphone access...");

      // Step 2: Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStatus("Setting up WebRTC connection...");

      // Step 3: Set up RTCPeerConnection
      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add audio track to peer connection
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Set up data channel for OpenAI events
      const dataChannel = peerConnection.createDataChannel("oai-events");

      dataChannel.addEventListener("open", () => {
        console.log(
          "OpenAI data channel is open, sending session configuration...",
        );

        // Substitute template variables in the instructions
        let instructions =
          config?.instructions || "You are a helpful assistant.";

        // Replace template variables with actual values from preparedNames
        // Use fallback values if names aren't prepared to ensure instructions always work
        const voucherFirst = preparedNames?.voucher_first || "the caller";
        const voucherLast = preparedNames?.voucher_last || "";
        const voucheeFirst =
          preparedNames?.vouchee_first || "the person being vouched for";
        const voucheeLast = preparedNames?.vouchee_last || "";

        instructions = instructions
          .replace(/{{voucher_first}}/g, voucherFirst)
          .replace(/{{voucher_last}}/g, voucherLast)
          .replace(/{{vouchee_first}}/g, voucheeFirst)
          .replace(/{{vouchee_last}}/g, voucheeLast);

        // Add English-only constraint
        instructions +=
          " You must respond only in English. Do not use any other language under any circumstances.";

        console.log("✅ Final instructions after variable substitution:");
        console.log("📏 Length:", instructions.length);
        console.log("🔍 Preview:", instructions.substring(0, 200) + "...");
        console.log(
          "🔗 Contains template variables:",
          instructions.includes("{{"),
        );

        const sessionUpdateEvent = {
          type: "session.update",
          session: {
            modalities: ["text", "audio"],
            instructions: instructions,
            voice: config?.sessionConfig?.voice || config?.voice || "alloy",
            speed: config?.sessionConfig?.speed || 1.0,
            input_audio_format: "pcm16",
            output_audio_format: "pcm16",
            input_audio_transcription: { model: "whisper-1" },
            turn_detection: config?.sessionConfig?.turn_detection || {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            temperature: config?.sessionConfig?.temperature || 0.8,
            max_response_output_tokens:
              config?.sessionConfig?.max_response_output_tokens || 4096,
          },
        };

        console.log(
          "Sending session update to OpenAI with call code:",
          callCode,
        );
        console.log("Prepared names used for substitution:", preparedNames);
        console.log("Session config from server:", config?.sessionConfig);
        console.log(
          "Final session being sent to OpenAI:",
          sessionUpdateEvent.session,
        );
        console.log("Voice settings:", {
          voice: sessionUpdateEvent.session.voice,
          speed: sessionUpdateEvent.session.speed,
          temperature: sessionUpdateEvent.session.temperature,
          turn_detection: sessionUpdateEvent.session.turn_detection,
        });
        dataChannel.send(JSON.stringify(sessionUpdateEvent));
        setStatus(`Connected! Sam is ready for call ${callCode}.`);

        // Start automatic recording when call is connected
        startAutomaticRecording();
      });

      dataChannel.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Received from OpenAI:", message);

          // Handle different event types
          if (message.type === "session.created") {
            console.log("Session created successfully");
          } else if (message.type === "session.updated") {
            console.log("Session updated successfully");
          } else if (message.type === "error") {
            console.error("OpenAI error:", message.error);
            setStatus(`OpenAI error: ${message.error.message}`);
          }
        } catch (error) {
          console.error("Error parsing OpenAI message:", error);
        }
      });

      dataChannel.addEventListener("error", (error) => {
        console.error("Data channel error:", error);
        setStatus("Data channel error - configuration may have failed");
      });

      // Handle incoming audio stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play();
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log("Connection state:", peerConnection.connectionState);
        if (peerConnection.connectionState === "connected") {
          setStatus("WebRTC connected, configuring OpenAI session...");
        } else if (peerConnection.connectionState === "failed") {
          setStatus("Connection failed");
        }
      };

      // Create and send SDP offer
      setStatus("Creating SDP offer...");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      setStatus("Connecting to OpenAI Realtime API...");

      // Send SDP offer to OpenAI Realtime API
      const model = config?.model || "gpt-4o-realtime-preview-2024-12-17";
      const offerResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=${model}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${client_secret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        },
      );

      let answerSdp;
      if (!offerResponse.ok) {
        const errorText = await offerResponse.text();
        throw new Error(
          `OpenAI API error: ${offerResponse.statusText} - ${errorText}`,
        );
      } else {
        answerSdp = await offerResponse.text();
      }

      // Set remote description from the answer
      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setIsConnected(true);
      setIsConnecting(false);
      setStatus("Connected! You can now speak to the AI assistant.");
    } catch (error) {
      console.error("Error starting call:", error);
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setIsConnecting(false);
      setIsConnected(false);

      // Cleanup on error
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    }
  };

  const stopCall = () => {
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }

      setIsConnected(false);
      setIsConnecting(false);
      setIsMuted(false);

      // Stop automatic recording when call ends
      await stopAutomaticRecording();

      setStatus(
        callCode
          ? `Call ${callCode} ended. Names still prepared.`
          : "Call ended. Ready to start new test call.",
      );
    } catch (error) {
      console.error("Error stopping call:", error);
      setStatus(
        `Error stopping call: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  // Automatic recording functions
  const startAutomaticRecording = async () => {
    try {
      setRecordingStatus("Starting recording...");
      setIsRecording(true);

      // Use admin password for recording - you may want to configure this differently
      const adminPassword = "vouch2024admin";

      const recordingId = await recordingService.current.startRecording(adminPassword);
      currentRecordingId.current = recordingId;

      // Update recording metadata with call information
      await updateRecordingMetadata(recordingId);

      setRecordingStatus("Recording active");
      console.log(`✅ Automatic recording started for call ${callCode}: ${recordingId}`);

    } catch (error) {
      console.error("❌ Failed to start automatic recording:", error);
      setRecordingStatus("Recording failed to start");
      setIsRecording(false);
    }
  };

  const stopAutomaticRecording = async () => {
    if (!currentRecordingId.current || !isRecording) return;

    try {
      setRecordingStatus("Stopping recording...");

      await recordingService.current.stopRecording();

      console.log(`✅ Automatic recording stopped for call ${callCode}: ${currentRecordingId.current}`);
      setRecordingStatus("Recording saved");
      setIsRecording(false);
      currentRecordingId.current = null;

      // Clear recording status after a few seconds
      setTimeout(() => {
        setRecordingStatus("");
      }, 3000);

    } catch (error) {
      console.error("❌ Failed to stop automatic recording:", error);
      setRecordingStatus("Recording stop failed");
    }
  };

  const updateRecordingMetadata = async (recordingId: string) => {
    try {
      // Update the recording with call metadata
      const response = await fetch(`/api/admin/recordings/${recordingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          call_code: callCode,
          voucher_name: preparedNames ? `${preparedNames.voucher_first} ${preparedNames.voucher_last}`.trim() : voucherName,
          vouchee_name: preparedNames ? `${preparedNames.vouchee_first} ${preparedNames.vouchee_last}`.trim() : voucheeName,
          password: "vouch2024admin"
        }),
      });

      if (!response.ok) {
        console.warn("Failed to update recording metadata:", response.status);
      }
    } catch (error) {
      console.warn("Error updating recording metadata:", error);
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const parseNameToFirstLast = (fullName: string) => {
    const cleanName = fullName.trim();
    console.log("Parsing name:", cleanName);

    if (!cleanName) return { first: "", last: "" };

    const parts = cleanName.split(/\s+/); // Split on any whitespace
    console.log("Name parts:", parts);

    if (parts.length === 0) return { first: "", last: "" };
    if (parts.length === 1) {
      console.log("Single name detected:", parts[0]);
      return { first: parts[0], last: "" };
    }

    const first = parts[0];
    const last = parts.slice(1).join(" ");
    console.log("Parsed result:", { first, last });

    return { first, last };
  };

  const generateCallCode = () => {
    return "CALL-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const prepareCall = async () => {
    if (!voucherName.trim() || !voucheeName.trim()) {
      alert("Please enter both names before preparing the call.");
      return;
    }

    setStatus("Preparing call and fetching latest prompt...");

    try {
      // Fetch the latest active prompt from Supabase
      console.log("🔄 Fetching latest active prompt from Supabase...");
      const promptResponse = await fetch("/api/active-prompt");

      if (!promptResponse.ok) {
        throw new Error("Failed to fetch active prompt");
      }

      const promptData = await promptResponse.json();
      console.log("✅ Fetched active prompt:", {
        length: promptData.instructions.length,
        id: promptData.id,
        fallback: promptData.fallback,
        created_at: promptData.created_at,
      });

      console.log("Preparing call with names:", { voucherName, voucheeName });

      const voucherParsed = parseNameToFirstLast(voucherName);
      const voucheeParsed = parseNameToFirstLast(voucheeName);
      const newCallCode = generateCallCode();

      const parsedNames = {
        voucher_first: voucherParsed.first,
        voucher_last: voucherParsed.last,
        vouchee_first: voucheeParsed.first,
        vouchee_last: voucheeParsed.last,
      };

      console.log(
        "Final parsed names that will be sent to OpenAI:",
        parsedNames,
      );

      setPreparedNames(parsedNames);
      setCallCode(newCallCode);

      // Store the fresh prompt data for use in the call
      (window as any).freshPromptData = promptData;

      setStatus(
        `Call prepared with code: ${newCallCode}. Using fresh prompt from Supabase${promptData.fallback ? " (fallback)" : ""}.`,
      );
    } catch (error) {
      console.error("Error preparing call:", error);
      setStatus("Error preparing call. Please try again.");
    }
  };

  const resetCall = () => {
    setCallCode(null);
    setPreparedNames(null);
    setVoucherName("");
    setVoucheeName("");
    setStatus("Ready to start test call");
  };

  // Audio visualization effect
  const [audioLevels, setAudioLevels] = useState(Array(20).fill(0));

  useEffect(() => {
    let animationFrame: number;

    if (isConnected && !isMuted) {
      const animate = () => {
        setAudioLevels((prev) => prev.map(() => Math.random() * 0.8 + 0.2));
        animationFrame = requestAnimationFrame(animate);
      };
      animate();
    } else {
      setAudioLevels(Array(20).fill(0.1));
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isConnected, isMuted]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-15 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-slate-400 rounded-full mix-blend-multiply filter blur-xl opacity-8 animate-pulse delay-500"></div>
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Voice Interview
          </h1>
          <p className="text-blue-200 text-lg">Meet Sam, your AI interviewer</p>
        </div>

        {/* Input Fields */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl mb-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="voucher"
                className="block text-white/80 text-sm font-medium mb-2"
              >
                Your Name
              </label>
              <input
                type="text"
                id="voucher"
                name="voucher"
                value={voucherName}
                onChange={(e) => setVoucherName(e.target.value)}
                placeholder="Full name"
                disabled={!!callCode}
                className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ${callCode ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label
                htmlFor="vouchee"
                className="block text-white/80 text-sm font-medium mb-2"
              >
                Who are you Vouching for?
              </label>
              <input
                type="text"
                id="vouchee"
                name="vouchee"
                value={voucheeName}
                onChange={(e) => setVoucheeName(e.target.value)}
                placeholder="Full name"
                disabled={!!callCode}
                className={`w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ${callCode ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>

            {/* Call Preparation Controls */}
            <div className="flex gap-3 pt-2">
              {!callCode ? (
                <button
                  onClick={prepareCall}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                >
                  Prepare Call
                </button>
              ) : (
                <>
                  <div className="flex-1 bg-green-500/20 border border-green-400/30 text-green-300 px-4 py-3 rounded-xl font-medium text-center">
                    Code: {callCode}
                  </div>
                  <button
                    onClick={resetCall}
                    className="bg-red-500/20 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl hover:bg-red-500/30 transition-all duration-200"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>

            {/* Show parsed names preview when call is prepared */}
            {callCode && preparedNames && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-400/20 rounded-xl">
                <h4 className="text-white/80 text-sm font-medium mb-2">
                  Names prepared for OpenAI:
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white/5 p-2 rounded">
                    <div className="text-white/60">Voucher (You):</div>
                    <div className="text-white">
                      First: "{preparedNames.voucher_first}"
                    </div>
                    <div className="text-white">
                      Last: "{preparedNames.voucher_last}"
                    </div>
                  </div>
                  <div className="bg-white/5 p-2 rounded">
                    <div className="text-white/60">Vouchee:</div>
                    <div className="text-white">
                      First: "{preparedNames.vouchee_first}"
                    </div>
                    <div className="text-white">
                      Last: "{preparedNames.vouchee_last}"
                    </div>
                  </div>
                </div>
                <div className="text-white/50 text-xs mt-2">
                  Template variables will be substituted:{" "}
                  {`{{voucher_first}} → ${preparedNames.voucher_first}, {{vouchee_first}} → ${preparedNames.vouchee_first}`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main calling interface */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
          {/* Audio Visualization */}
          <div className="flex items-end justify-center space-x-1 h-32 mb-8">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full transition-all duration-150 ease-out"
                style={{
                  height: `${level * 100}%`,
                  width: "4px",
                  minHeight: "8px",
                  opacity: isConnected ? 0.8 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Status Display */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected
                    ? "bg-green-400 animate-pulse"
                    : isConnecting
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-400"
                }`}
              ></div>
              <span className="text-white font-medium">{status}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center gap-4">
            {!isConnected && !isConnecting && (
              <button
                onClick={startCall}
                disabled={!callCode}
                className={`group relative w-20 h-20 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                  callCode
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 cursor-pointer"
                    : "bg-gray-500 cursor-not-allowed opacity-50"
                }`}
              >
                <Phone className="w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                {callCode && (
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                )}
              </button>
            )}

            {isConnecting && (
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full shadow-lg flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {isConnected && (
              <>
                {/* Mute Button */}
                <button
                  onClick={toggleMute}
                  className={`group relative w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isMuted
                      ? "bg-gradient-to-r from-red-500 to-pink-600"
                      : "bg-gradient-to-r from-blue-500 to-cyan-600"
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  ) : (
                    <Mic className="w-6 h-6 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  )}
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                </button>

                {/* Stop Call Button */}
                <button
                  onClick={stopCall}
                  className="group relative w-20 h-20 bg-gradient-to-r from-red-500 to-rose-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  <PhoneOff className="w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
                </button>

                {/* Volume Indicator */}
                <div className="w-16 h-16 bg-white/10 rounded-full shadow-lg flex items-center justify-center border border-white/20">
                  <Volume2 className="w-6 h-6 text-white/70" />
                </div>
              </>
            )}
          </div>

          {/* Additional Info */}
          {isConnected && (
            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm">
                Speak naturally • Sam is listening • English only
              </p>
              {callCode && (
                <p className="text-white/40 text-xs mt-1">
                  Call Code: {callCode}
                </p>
              )}
            </div>
          )}

          {!isConnected && !callCode && (
            <div className="mt-8 text-center">
              <p className="text-white/60 text-sm">
                Enter full names (First Last) and prepare call first
              </p>
            </div>
          )}

          {/* Hidden audio element for playing assistant responses */}
          <audio ref={audioRef} autoPlay style={{ display: "none" }} />
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-sm">
            Powered by Vouch • English-only interviews
          </p>
        </div>
      </div>
    </div>
  );
}
