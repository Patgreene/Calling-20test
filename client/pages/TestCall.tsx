import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function TestCall() {
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [callSession, setCallSession] = useState<any>(null);
  const [userName, setUserName] = useState("Patrick");

  const startSynthflowCall = async () => {
    setIsCallInProgress(true);

    // Get form_id from localStorage or generate one
    const storedFormId = localStorage.getItem("form_id");
    const formId = storedFormId || `web_call_${Date.now()}`;

    const requestBody = {
      agent_id: "63e56c5a-2a00-447a-906a-131e89aa7ccd",
      name: userName,
      metadata: {
        form_id: formId,
      },
    };

    console.log("🚀 Starting SynthFlow WebRTC call with:");
    console.log("📍 Endpoint: https://api.synthflow.ai/v2/calls/web");
    console.log("📋 Request Body:", requestBody);

    try {
      const response = await fetch("https://api.synthflow.ai/v2/calls/web", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer 8RXXy1DFjppf7W1wzgSds6NAm03cM_Xu6MW9PfT9U9E",
        },
        body: JSON.stringify(requestBody),
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
          `Call initiation failed: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      console.log("✅ API Success Response:", data);

      // Store session information
      setCallSession(data);

      // Store form_id if we generated one
      if (!storedFormId) {
        localStorage.setItem("form_id", formId);
      }

      alert("Web call session started successfully!");
    } catch (error) {
      console.error("💥 Error starting call:", error);
      alert(`Failed to start call: ${error.message}`);
      setIsCallInProgress(false);
    }
  };

  const endCall = () => {
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
            SynthFlow Test Call
          </h2>

          {isCallInProgress ? (
            /* Call in Progress Display */
            <div className="text-center space-y-6">
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
                  Call in Progress
                </h3>
                <p className="text-gray-600">
                  SynthFlow call has been initiated...
                </p>
              </div>

              <Button
                onClick={() => setIsCallInProgress(false)}
                variant="outline"
                className="mt-6"
              >
                Reset
              </Button>
            </div>
          ) : (
            /* Start Call Button */
            <div className="text-center space-y-6">
              <p className="text-gray-600 mb-6">
                Click the button below to initiate a test call using SynthFlow
                API.
              </p>

              <Button
                onClick={startSynthflowCall}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Start Call
              </Button>

              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded-lg">
                <strong>Agent ID:</strong> 63e56c5a-2a00-447a-906a-131e89aa7ccd
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
