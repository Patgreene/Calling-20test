import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ElevenLabsTest() {
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
