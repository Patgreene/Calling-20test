import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
=======
import { useState, useEffect } from "react";
>>>>>>> a1093ab68bfe373879fc8848056dec7d8a5d61b0
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ElevenLabsTest() {
<<<<<<< HEAD
  const [formData, setFormData] = useState({
    voucherFirst: "Patrick",
    voucherLast: "Greene",
    voucheeFirst: "Dominic",
    voucheeLast: "Smith",
    voucherEmail: "patrick@vouchprofile.com",
    formId: "123-test-id",
  });

  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load ElevenLabs script
    if (!scriptLoadedRef.current) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      document.body.appendChild(script);
      scriptLoadedRef.current = true;

      return () => {
        // Cleanup script on unmount
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!widgetContainerRef.current) return;

    // Clear existing widget
    widgetContainerRef.current.innerHTML = "";

    // Create ElevenLabs ConvAI widget
    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", "agent_7101k1jdynr4ewv8e9vnxs2fbtew");
    widget.setAttribute(
      "dynamic-variables",
      JSON.stringify({
        voucher_first: formData.voucherFirst,
        voucher_last: formData.voucherLast,
        voucher_email: formData.voucherEmail,
        vouchee_first: formData.voucheeFirst,
        vouchee_last: formData.voucheeLast,
        form_id: formData.formId,
      }),
    );

    widgetContainerRef.current.appendChild(widget);
  };

=======
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

>>>>>>> a1093ab68bfe373879fc8848056dec7d8a5d61b0
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
<<<<<<< HEAD
      <div className="w-full max-w-md space-y-8">
=======
      <div className="w-full max-w-2xl space-y-8">
>>>>>>> a1093ab68bfe373879fc8848056dec7d8a5d61b0
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

<<<<<<< HEAD
        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center font-sans">
            ElevenLabs AI Test
          </h2>

          <form id="vouch-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Voucher First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucherFirst"
                className="text-sm font-medium text-gray-700"
              >
                Voucher First Name
              </Label>
              <Input
                id="voucherFirst"
                name="voucherFirst"
                type="text"
                required
                value={formData.voucherFirst}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Voucher Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucherLast"
                className="text-sm font-medium text-gray-700"
              >
                Voucher Last Name
              </Label>
              <Input
                id="voucherLast"
                name="voucherLast"
                type="text"
                required
                value={formData.voucherLast}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Vouchee First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucheeFirst"
                className="text-sm font-medium text-gray-700"
              >
                Vouchee First Name
              </Label>
              <Input
                id="voucheeFirst"
                name="voucheeFirst"
                type="text"
                required
                value={formData.voucheeFirst}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Vouchee Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucheeLast"
                className="text-sm font-medium text-gray-700"
              >
                Vouchee Last Name
              </Label>
              <Input
                id="voucheeLast"
                name="voucheeLast"
                type="text"
                required
                value={formData.voucheeLast}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Voucher Email */}
            <div className="space-y-2">
              <Label
                htmlFor="voucherEmail"
                className="text-sm font-medium text-gray-700"
              >
                Voucher Email
              </Label>
              <Input
                id="voucherEmail"
                name="voucherEmail"
                type="email"
                required
                value={formData.voucherEmail}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Form ID */}
            <div className="space-y-2">
              <Label
                htmlFor="formId"
                className="text-sm font-medium text-gray-700"
              >
                Form ID
              </Label>
              <Input
                id="formId"
                name="formId"
                type="text"
                required
                value={formData.formId}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mt-8"
            >
              Start AI Call
            </Button>
          </form>

          {/* Widget Container */}
          <div className="mt-8">
            <div
              id="widget-container"
              ref={widgetContainerRef}
              className="min-h-[200px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-500"
            >
              <p>AI widget will appear here after clicking "Start AI Call"</p>
            </div>
          </div>
=======
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
>>>>>>> a1093ab68bfe373879fc8848056dec7d8a5d61b0
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
