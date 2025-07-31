import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export default function TestCall() {
  const [isCallInProgress, setIsCallInProgress] = useState(false);

  const startSynthflowCall = async () => {
    setIsCallInProgress(true);

    try {
      const response = await fetch("https://api.synthflow.ai/api/calls/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer FlT1-eljHprcbqvlL5AeHQDkm-MaWPTvIF-YURu0aF0",
        },
        body: JSON.stringify({
          agent_id: "63e56c5a-2a00-447a-906a-131e89aa7ccd",
        }),
      });

      if (!response.ok) throw new Error("Call initiation failed");

      const data = await response.json();
      console.log("Call started:", data);
      alert("Call started successfully!");
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Failed to start call.");
      setIsCallInProgress(false);
    }
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
