import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ElevenLabsTest() {
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    setIsLoading(true);
    try {
      // Request microphone and audio permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("🎤 Microphone access granted for ElevenLabs");
      setHasPermissions(true);

      // Stop the stream since we just needed permission
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("❌ Failed to get microphone permission:", error);
      alert(
        "Microphone access is required for voice conversations. Please allow access and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load the ElevenLabs script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center font-sans">
            ElevenLabs ConvAI Test
          </h2>

          {!hasPermissions ? (
            /* Permission Request */
            <div className="text-center space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Microphone Access Required
                </h3>
                <p className="text-blue-800 text-sm">
                  This ElevenLabs voice assistant needs microphone access to
                  have conversations with you. Click the button below to grant
                  permission.
                </p>
              </div>

              <Button
                onClick={requestPermissions}
                disabled={isLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? "Requesting Access..."
                  : "🎤 Enable Microphone Access"}
              </Button>

              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
                <p>
                  <strong>Agent ID:</strong> agent_7101k1jdynr4ewv8e9vnxs2fbtew
                </p>
                <p>
                  <strong>Provider:</strong> ElevenLabs ConvAI
                </p>
              </div>
            </div>
          ) : (
            /* ElevenLabs Widget */
            <div className="space-y-6">
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-800 font-medium">
                    ✅ Microphone access granted! The voice assistant is ready.
                  </p>
                  <p className="text-green-700 text-sm mt-1">
                    You can now have a natural conversation with the AI agent.
                  </p>
                </div>

                {/* ElevenLabs ConvAI Widget */}
                <div className="bg-gray-50 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
                  <div className="text-center">
                    <elevenlabs-convai
                      agent-id="agent_7101k1jdynr4ewv8e9vnxs2fbtew"
                      style={{
                        width: "100%",
                        minHeight: "250px",
                        border: "none",
                        borderRadius: "8px",
                      }}
                    ></elevenlabs-convai>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
                  <p>
                    <strong>Status:</strong> ElevenLabs ConvAI Widget Active
                  </p>
                  <p>
                    <strong>Agent:</strong> agent_7101k1jdynr4ewv8e9vnxs2fbtew
                  </p>
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
