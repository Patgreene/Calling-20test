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
    const formId = storedFormId || `test-form-${Date.now()}`;

    // Build URL with query parameters - try /v2/calls instead of /v2/calls/web
    const baseUrl = "https://api.synthflow.ai/v2/calls";
    const queryParams = new URLSearchParams({
      agent_id: "63e56c5a-2a00-447a-906a-131e89aa7ccd",
      name: userName || "Test User",
      form_id: formId,
      call_type: "web", // Specify this is a web call
    });
    const fullUrl = `${baseUrl}?${queryParams.toString()}`;

    console.log("🚀 Starting SynthFlow WebRTC call with:");
    console.log("📍 Full URL:", fullUrl);
    console.log("📋 Query Parameters:", {
      agent_id: "63e56c5a-2a00-447a-906a-131e89aa7ccd",
      name: userName || "Test User",
      form_id: formId,
      call_type: "web",
    });

    try {
      const response = await fetch(fullUrl, {
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

              {/* Check for iframe URL or session URL */}
              {(callSession.session_url ||
                callSession.iframe_url ||
                callSession.web_url) && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Web Call Interface:</h4>
                  <div
                    className="border rounded-lg overflow-hidden"
                    style={{ height: "400px" }}
                  >
                    <iframe
                      src={
                        callSession.session_url ||
                        callSession.iframe_url ||
                        callSession.web_url
                      }
                      className="w-full h-full border-0"
                      allow="microphone; camera; autoplay"
                      title="SynthFlow WebRTC Call"
                    />
                  </div>
                </div>
              )}

              {/* Check for external URL that needs to be opened */}
              {callSession.call_url &&
                !callSession.session_url &&
                !callSession.iframe_url && (
                  <div className="text-center space-y-4">
                    <p className="text-gray-600">
                      Click below to join the web call:
                    </p>
                    <Button
                      onClick={() =>
                        window.open(callSession.call_url, "_blank")
                      }
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      Join Web Call
                    </Button>
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
                  <strong>Agent ID:</strong>{" "}
                  63e56c5a-2a00-447a-906a-131e89aa7ccd
                </div>
                <div>
                  <strong>Method:</strong> GET /v2/calls/web
                </div>
                <div>
                  <strong>Parameters:</strong> agent_id, name, form_id
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
