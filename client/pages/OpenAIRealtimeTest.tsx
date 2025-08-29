import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

export default function OpenAIRealtimeTest() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState("Ready to start test call");
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startCall = async () => {
    try {
      setIsConnecting(true);
      setStatus("Getting client secret...");

      // Step 1: Fetch client secret from server
      const response = await fetch('/api/realtime/client-secret', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2024-10-01",
          voice: "alloy",
          prompt_id: "pmpt_68b0e33b10988196b3452dce0bc38d190bcafb85e4681be3"
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
      setStatus("Setting up WebRTC connection...");

      // Step 3: Set up RTCPeerConnection
      const configuration = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      };
      
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      // Add audio track to peer connection
      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      // Handle incoming audio stream
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play();
        }
      };

      // Create and send SDP offer
      setStatus("Creating SDP offer...");
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      setStatus("Connecting to OpenAI Realtime API...");

      // Send SDP offer to OpenAI Realtime API with configuration
      const offerResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${client_secret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'offer',
          sdp: offer.sdp,
          model: config?.model || "gpt-4o-realtime-preview-2024-10-01",
          voice: config?.voice || "alloy",
          instructions: config?.instructions || "You are a helpful AI assistant.",
        }),
      });

      if (!offerResponse.ok) {
        const errorText = await offerResponse.text();
        throw new Error(`OpenAI API error: ${offerResponse.statusText} - ${errorText}`);
      }

      const responseData = await offerResponse.json();

      // Set remote description from the answer
      if (responseData.sdp) {
        await peerConnection.setRemoteDescription({
          type: 'answer',
          sdp: responseData.sdp,
        });
      } else {
        throw new Error('No SDP answer received from OpenAI API');
      }

      setIsConnected(true);
      setIsConnecting(false);
      setStatus("Connected! You can now speak to the AI assistant.");

    } catch (error) {
      console.error('Error starting call:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
      }

      setIsConnected(false);
      setIsConnecting(false);
      setStatus("Call ended. Ready to start new test call.");
    } catch (error) {
      console.error('Error stopping call:', error);
      setStatus(`Error stopping call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center space-y-6 bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900">
          OpenAI Realtime Test
        </h1>
        
        <div className="space-y-4">
          <p className="text-sm text-gray-600 bg-gray-100 p-3 rounded">
            Status: {status}
          </p>
          
          {!isConnected && !isConnecting && (
            <Button 
              onClick={startCall}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
            >
              Start Test Call
            </Button>
          )}
          
          {isConnecting && (
            <Button 
              disabled
              className="w-full bg-gray-400 text-white py-3"
            >
              Connecting...
            </Button>
          )}
          
          {isConnected && (
            <Button 
              onClick={stopCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
            >
              Stop Call
            </Button>
          )}
          
          {/* Hidden audio element for playing assistant responses */}
          <audio 
            ref={audioRef}
            autoPlay
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
