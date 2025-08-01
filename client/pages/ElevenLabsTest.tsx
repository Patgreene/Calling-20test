import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ElevenLabsTest() {
  useEffect(() => {
    // Load ElevenLabs widget script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
    script.async = true;
    script.type = "text/javascript";
    document.body.appendChild(script);

    // Add form event listener
    const form = document.getElementById("vouch-form");
    const handleSubmit = (e: Event) => {
      e.preventDefault();

      const voucherFirst = (
        document.getElementById("voucherFirst") as HTMLInputElement
      ).value;
      const voucheeFirst = (
        document.getElementById("voucheeFirst") as HTMLInputElement
      ).value;

      // Clear previous widget if any
      const container = document.getElementById("widget-container");
      if (container) {
        container.innerHTML = "";

        // Inject the ElevenLabs AI widget
        const widget = document.createElement("elevenlabs-convai");
        widget.setAttribute("agent-id", "agent_7101k1jdynr4ewv8e9vnxs2fbtew");
        widget.setAttribute(
          "dynamic-variables",
          JSON.stringify({
            voucher_first: voucherFirst,
            vouchee_first: voucheeFirst,
          }),
        );

        container.appendChild(widget);
      }
    };

    if (form) {
      form.addEventListener("submit", handleSubmit);
    }

    // Cleanup
    return () => {
      if (form) {
        form.removeEventListener("submit", handleSubmit);
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

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

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center font-sans">
            ElevenLabs AI Call Test
          </h2>

          <form id="vouch-form" className="space-y-6">
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
                defaultValue="Patrick"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter voucher first name"
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
                defaultValue="Dominic"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter vouchee first name"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Start AI Call
            </Button>
          </form>
        </div>

        {/* Widget Container */}
        <div
          id="widget-container"
          className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 min-h-[200px] flex items-center justify-center"
        >
          <p className="text-gray-500 text-center">
            Click "Start AI Call" to load the ElevenLabs widget
          </p>
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
