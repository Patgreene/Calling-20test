import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";
import RecordingService from "@/services/RecordingService";

export default function OpenAIRealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Push button to start interview with Sam");
  const [voucherName, setVoucherName] = useState("");
  const [voucheeName, setVoucheeName] = useState("");
  const [voucherEmail, setVoucherEmail] = useState("");
  const [voucherPhone, setVoucherPhone] = useState("");
  const [callCode, setCallCode] = useState<string | null>(null);
  const [preparedNames, setPreparedNames] = useState<{
    voucher_first: string;
    voucher_last: string;
    vouchee_first: string;
    vouchee_last: string;
  } | null>(null);
  const [currentStep, setCurrentStep] = useState<'form' | 'call'>('form');
  const [conversationStep, setConversationStep] = useState(0); // 0 = opening, 1-5 = exploration steps

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
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
      setStatus("Connecting to Sam...");

      // Get fresh prompt data (from prepareCall) or fetch it now
      let promptData = (window as any).freshPromptData;
      if (!promptData) {
        const promptResponse = await fetch("/api/active-prompt");
        if (!promptResponse.ok) {
          throw new Error("Failed to fetch active prompt");
        }
        promptData = await promptResponse.json();
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
      setStatus("Setting up microphone...");

      // Step 2: Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStatus("Establishing connection...");

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

        dataChannel.send(JSON.stringify(sessionUpdateEvent));
        setStatus("Say Hello");

        // Reset conversation step when call starts
        setConversationStep(0);

        // Change status to "Connected" after 10 seconds
        setTimeout(() => {
          setStatus("Connected");
        }, 10000);

        // Start automatic recording when call is connected
        startAutomaticRecording();
      });

      dataChannel.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "error") {
            setStatus(`OpenAI error: ${message.error.message}`);
          } else if (message.type === "response.audio_transcript.done" && message.transcript) {
            // Detect conversation step from AI's transcript
            detectConversationStep(message.transcript);
          } else if (message.type === "conversation.item.created" && message.item?.content?.[0]?.transcript) {
            // Alternative transcript location
            detectConversationStep(message.item.content[0].transcript);
          }
        } catch (error) {
          console.error("Error parsing OpenAI message:", error);
        }
      });

      dataChannel.addEventListener("error", (error) => {
        setStatus("Connection error - please try again");
      });

      // Handle incoming audio stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play();

          // If recording is already active, connect the AI audio to it
          if (isRecording && currentRecordingId.current) {
            recordingService.current.connectAIAudioToRecording(audioRef.current);
          }
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === "connected") {
          setStatus("Almost ready...");
        } else if (peerConnection.connectionState === "failed") {
          setStatus("Connection failed");
        }
      };

      // Create and send SDP offer
      setStatus("Finalizing connection...");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      setStatus("Connecting to Sam...");

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
      setStatus("Connected! Start speaking whenever you're ready.");
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

  const stopCall = async () => {
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
          ? "Call ended. Push button to start a new interview."
          : "Push button to start interview with Sam.",
      );
    } catch (error) {
      console.error("Error stopping call:", error);
      setStatus(
        "Error ending call. Push button to start interview with Sam.",
      );
    }
  };

  // Automatic recording functions
  const startAutomaticRecording = async () => {
    try {
      setIsRecording(true);

      const adminPassword = "vouch2024admin";
      const voucherNameForRecording = preparedNames ? `${preparedNames.voucher_first} ${preparedNames.voucher_last}`.trim() : voucherName;
      const voucheeNameForRecording = preparedNames ? `${preparedNames.vouchee_first} ${preparedNames.vouchee_last}`.trim() : voucheeName;

      const recordingId = await recordingService.current.startRecording(
        audioRef.current || undefined,
        voucherNameForRecording,
        voucheeNameForRecording,
        callCode || undefined,
        voucherEmail,
        voucherPhone
      );
      currentRecordingId.current = recordingId;
    } catch (error) {
      setIsRecording(false);
    }
  };

  const stopAutomaticRecording = async () => {
    if (!currentRecordingId.current || !isRecording) return;

    try {
      await recordingService.current.stopRecording();
      setIsRecording(false);
      currentRecordingId.current = null;

    } catch (error) {
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
    if (!cleanName) return { first: "", last: "" };

    const parts = cleanName.split(/\s+/);
    if (parts.length === 0) return { first: "", last: "" };
    if (parts.length === 1) return { first: parts[0], last: "" };

    const first = parts[0];
    const last = parts.slice(1).join(" ");
    return { first, last };
  };

  const generateCallCode = () => {
    return "CALL-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

  const proceedToCall = async () => {
    if (!voucherName.trim() || !voucheeName.trim()) {
      alert("Please enter both names before proceeding.");
      return;
    }

    setStatus("Getting ready...");

    try {
      // Fetch the latest active prompt from Supabase
      const promptResponse = await fetch("/api/active-prompt");
      if (!promptResponse.ok) {
        throw new Error("Failed to fetch active prompt");
      }
      const promptData = await promptResponse.json();

      const voucherParsed = parseNameToFirstLast(voucherName);
      const voucheeParsed = parseNameToFirstLast(voucheeName);
      const newCallCode = generateCallCode();

      const parsedNames = {
        voucher_first: voucherParsed.first,
        voucher_last: voucherParsed.last,
        vouchee_first: voucheeParsed.first,
        vouchee_last: voucheeParsed.last,
      };

      setPreparedNames(parsedNames);
      setCallCode(newCallCode);

      // Store the fresh prompt data for use in the call
      (window as any).freshPromptData = promptData;

      setStatus("Push green button to start call");
      setCurrentStep('call');
    } catch (error) {
      setStatus("Something went wrong. Please try again.");
    }
  };

  const resetCall = () => {
    setCallCode(null);
    setPreparedNames(null);
    setVoucherName("");
    setVoucheeName("");
    setVoucherEmail("");
    setVoucherPhone("");
    setCurrentStep('form');
    setStatus("Push button to start interview with Sam");
  };

  const goBackToForm = () => {
    setCurrentStep('form');
  };

  // Detect conversation step based on AI response content
  const detectConversationStep = (text: string) => {
    const lowerText = text.toLowerCase();

    // Check each step's keywords
    for (let step = 5; step >= 1; step--) {
      const keywords = stepKeywords[step as keyof typeof stepKeywords];
      const hasKeyword = keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));

      if (hasKeyword && step > conversationStep) {
        console.log(`🎯 Detected transition to Step ${step}: ${conversationSteps[step].label}`);
        setConversationStep(step);
        return;
      }
    }
  };

  // Audio visualization effect
  const [audioLevels, setAudioLevels] = useState(Array(20).fill(0));
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);

  // Conversation step definitions
  const conversationSteps = [
    { label: "Opening", description: "Setting the scene" },
    { label: "Broad Context", description: "Daily collaboration" },
    { label: "Core Strengths", description: "Key qualities" },
    { label: "Performance", description: "Strengths & teamwork" },
    { label: "Development", description: "Growth areas" },
    { label: "Final Rating", description: "Overall recommendation" }
  ];

  // Keywords to detect step transitions
  const stepKeywords = {
    1: ["can you set the scene", "how did your roles overlap"],
    2: ["if you were recommending", "how would you describe them"],
    3: ["performance or main strengths", "teamwork and working relationships"],
    4: ["areas they could develop or grow", "nobody is perfect what are some"],
    5: ["on a scale from one to ten", "how strongly would you recommend"]
  };

  useEffect(() => {
    let animationFrame: number;

    if (isConnected && !isMuted && streamRef.current) {
      // Set up audio analysis
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(streamRef.current);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7; // More responsive but still smooth
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      audioAnalyserRef.current = analyser;
      audioDataRef.current = dataArray;

      const animate = () => {
        if (audioAnalyserRef.current && audioDataRef.current) {
          audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);

          // Create smooth, voice-responsive visualization
          const newLevels = Array(20).fill(0).map((_, index) => {
            // Focus on voice frequency range (0-40% of spectrum) and spread across all bars
            const voiceRangeEnd = Math.floor(audioDataRef.current!.length * 0.4);
            const dataIndex = Math.floor((index / 20) * voiceRangeEnd);

            // Get base level from frequency data
            let rawLevel = audioDataRef.current![dataIndex] / 255;

            // Add some spreading from adjacent frequencies for more bars to react
            const spread = 3; // Number of adjacent frequencies to include
            for (let i = 1; i <= spread && dataIndex + i < audioDataRef.current!.length; i++) {
              rawLevel = Math.max(rawLevel, (audioDataRef.current![dataIndex + i] / 255) * (0.7 / i));
            }
            for (let i = 1; i <= spread && dataIndex - i >= 0; i++) {
              rawLevel = Math.max(rawLevel, (audioDataRef.current![dataIndex - i] / 255) * (0.7 / i));
            }

            // Apply gentle smoothing for natural voice response
            const smoothedLevel = Math.pow(rawLevel, 1.2);
            const responsiveLevel = smoothedLevel * 1.6 + 0.03;

            return Math.min(responsiveLevel, 0.95);
          });

          setAudioLevels(newLevels);
        }
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

  // Cleanup recording on component unmount
  useEffect(() => {
    return () => {
      if (isRecording && currentRecordingId.current) {
        recordingService.current.stopRecording().catch(() => {
          // Cleanup failed, but we're unmounting anyway
        });
      }
    };
  }, [isRecording]);

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
            Vouch Interview
          </h1>
          <p className="text-blue-200 text-lg">
            {currentStep === 'form' ? 'Fill in your details' : 'Meet Sam, your AI interviewer'}
          </p>
        </div>

        {/* Step 1: Form */}
        {currentStep === 'form' && (
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label
                  htmlFor="voucher-email"
                  className="block text-white/80 text-sm font-medium mb-2"
                >
                  Your Email
                </label>
                <input
                  type="email"
                  id="voucher-email"
                  name="voucher-email"
                  value={voucherEmail}
                  onChange={(e) => setVoucherEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div>
                <label
                  htmlFor="voucher-phone"
                  className="block text-white/80 text-sm font-medium mb-2"
                >
                  Your Phone
                </label>
                <input
                  type="tel"
                  id="voucher-phone"
                  name="voucher-phone"
                  value={voucherPhone}
                  onChange={(e) => setVoucherPhone(e.target.value)}
                  placeholder="+64 21 123 4567"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={proceedToCall}
                  disabled={!voucherName.trim() || !voucheeName.trim() || !voucherEmail.trim() || !voucherPhone.trim()}
                  className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    voucherName.trim() && voucheeName.trim() && voucherEmail.trim() && voucherPhone.trim()
                      ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
                      : "bg-gray-500 text-gray-300 cursor-not-allowed opacity-50"
                  }`}
                >
                  Next
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Step 2: Calling Interface */}
        {currentStep === 'call' && (
          <>
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl relative">
              {/* Conversation Progress Bar */}
              {isConnected && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white/70 text-sm font-medium">
                      {conversationStep === 0 ? "Opening" : conversationSteps[conversationStep]?.label || "Opening"}
                    </span>
                    <span className="text-white/50 text-xs">
                      {conversationStep === 0 ? "Getting started" : `${conversationStep}/5`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <div
                        key={step}
                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                          step <= conversationStep
                            ? "bg-gradient-to-r from-blue-400 to-cyan-400"
                            : "bg-white/20"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-white/50 text-xs mt-1">
                    {conversationStep === 0
                      ? "Setting the scene and context"
                      : conversationSteps[conversationStep]?.description || ""}
                  </p>
                </div>
              )}

              {/* Audio Visualization */}
          <div className="flex items-end justify-center space-x-1 h-32 mb-8">
            {audioLevels.map((level, index) => (
              <div
                key={index}
                className="bg-gradient-to-t from-cyan-500 to-blue-500 rounded-full transition-all duration-500 ease-out"
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



              {/* Hidden audio element for playing assistant responses */}
              <audio ref={audioRef} autoPlay style={{ display: "none" }} />

              {/* Discrete Back Button - Bottom Left */}
              <button
                onClick={goBackToForm}
                className="absolute bottom-4 left-4 text-white/40 hover:text-white/70 text-sm transition-all duration-200 underline"
              >
                ← Back
              </button>
            </div>
          </>
        )}

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-sm">
            Powered by Vouch
          </p>
          {currentStep === 'form' && (
            <p className="text-white/30 text-xs mt-2">
              Step 1 of 2
            </p>
          )}
          {currentStep === 'call' && (
            <p className="text-white/30 text-xs mt-2">
              Step 2 of 2
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
