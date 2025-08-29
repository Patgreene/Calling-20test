import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Phone, PhoneOff, Volume2 } from "lucide-react";

export default function OpenAIRealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState("Ready to start test call");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCall = async () => {
    try {
      setIsConnecting(true);
      setStatus("Getting client secret...");

      // Step 1: Fetch client secret from server
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

      const { client_secret, config } = await response.json();
      console.log("Received config from server:", config);
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
      const dataChannel = peerConnection.createDataChannel('oai-events');

      dataChannel.addEventListener('open', () => {
        console.log('OpenAI data channel is open, sending session configuration...');

        const sessionUpdateEvent = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: config?.instructions || "You are a helpful assistant.",
            voice: config?.voice || "alloy",
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad' },
            temperature: 0.8,
            max_response_output_tokens: 4096
          }
        };

        console.log('Sending session update to OpenAI:', sessionUpdateEvent);
        dataChannel.send(JSON.stringify(sessionUpdateEvent));
        setStatus("Connected! Sam is configured and ready to start the interview.");
      });

      dataChannel.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received from OpenAI:', message);

          // Handle different event types
          if (message.type === 'session.created') {
            console.log('Session created successfully');
          } else if (message.type === 'session.updated') {
            console.log('Session updated successfully');
          } else if (message.type === 'error') {
            console.error('OpenAI error:', message.error);
            setStatus(`OpenAI error: ${message.error.message}`);
          }
        } catch (error) {
          console.error('Error parsing OpenAI message:', error);
        }
      });

      dataChannel.addEventListener('error', (error) => {
        console.error('Data channel error:', error);
        setStatus('Data channel error - configuration may have failed');
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
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setStatus("WebRTC connected, configuring OpenAI session...");
        } else if (peerConnection.connectionState === 'failed') {
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
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }

      setIsConnected(false);
      setIsConnecting(false);
      setIsMuted(false);
      setStatus("Call ended. Ready to start new test call.");
    } catch (error) {
      console.error("Error stopping call:", error);
      setStatus(
        `Error stopping call: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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


  // Audio visualization effect
  const [audioLevels, setAudioLevels] = useState(Array(20).fill(0));

  useEffect(() => {
    let animationFrame: number;

    if (isConnected && !isMuted) {
      const animate = () => {
        setAudioLevels(prev =>
          prev.map(() => Math.random() * 0.8 + 0.2)
        );
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
          <p className="text-blue-200 text-lg">
            Meet Sam, your AI interviewer
          </p>
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
                  width: '4px',
                  minHeight: '8px',
                  opacity: isConnected ? 0.8 : 0.3
                }}
              />
            ))}
          </div>

          {/* Status Display */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 bg-black/20 backdrop-blur-sm rounded-full px-6 py-3 border border-white/10">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-400 animate-pulse' :
                isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-white font-medium">{status}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center gap-4">
            {!isConnected && !isConnecting && (
              <button
                onClick={startCall}
                className="group relative w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Phone className="w-8 h-8 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-200"></div>
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
                      ? 'bg-gradient-to-r from-red-500 to-pink-600'
                      : 'bg-gradient-to-r from-blue-500 to-cyan-600'
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
                Speak naturally • Sam is listening
              </p>
            </div>
          )}

          {/* Hidden audio element for playing assistant responses */}
          <audio
            ref={audioRef}
            autoPlay
            style={{ display: 'none' }}
          />
        </div>

        {/* Footer Info */}
        <div className="text-center mt-6">
          <p className="text-white/40 text-sm">
            Powered by Vouch
          </p>
        </div>
      </div>
    </div>
  );
}
