import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function InterviewTest() {
  const [formData, setFormData] = useState({
    name: "",
    vouchingFor: "",
  });
  const [formId, setFormId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callStarted, setCallStarted] = useState(false);
  const [error, setError] = useState("");

  // Generate unique form_id on component mount
  useEffect(() => {
    const generateFormId = () => {
      return 'form_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    };
    setFormId(generateFormId());
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // Validate inputs
      if (!formData.name.trim() || !formData.vouchingFor.trim()) {
        throw new Error("Please fill in all fields");
      }

      // Prepare the payload for Make.com webhook
      const payload = {
        form_id: formId,
        name: formData.name,
        vouching_for: formData.vouchingFor,
        timestamp: new Date().toISOString(),
      };

      console.log("Sending data to Make.com webhook with payload:", payload);

      // Make API call to Make.com webhook
      const response = await fetch("https://hook.eu2.make.com/008su7o1nauoaqj3i02fgzdh3aawu7wc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook call failed: ${response.status}`);
      }

      console.log("Data sent successfully to Make.com");

      // Show success state
      setCallStarted(true);

    } catch (error) {
      console.error("Error sending data:", error);
      setError(error instanceof Error ? error.message : "Failed to send data");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (callStarted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#F8F8F8" }}
      >
        <div className="text-center space-y-8 max-w-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
              alt="Vouch Logo"
              className="h-16 md:h-20 object-contain"
            />
          </div>

          {/* Success Message */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-sans mb-4">
                Data Sent Successfully!
              </h1>
              <p className="text-lg text-gray-600 leading-relaxed">
                Your information has been sent to the webhook for processing.
              </p>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">
                  <strong>Form ID:</strong> {formId}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Name:</strong> {formData.name}
                </p>
                <p className="text-sm text-gray-500">
                  <strong>Vouching For:</strong> {formData.vouchingFor}
                </p>
              </div>
            </div>

            <div className="pt-6">
              <Link to="/">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            Interview Test
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Your Name */}
            <div className="space-y-2">
              <Label
                htmlFor="name"
                className="text-sm font-medium text-gray-700"
              >
                Your Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your name"
              />
            </div>

            {/* Vouching For */}
            <div className="space-y-2">
              <Label
                htmlFor="vouchingFor"
                className="text-sm font-medium text-gray-700"
              >
                Vouching For
              </Label>
              <Input
                id="vouchingFor"
                name="vouchingFor"
                type="text"
                required
                value={formData.vouchingFor}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Who are you vouching for?"
              />
            </div>

            {/* Hidden Form ID */}
            <input type="hidden" value={formId} />

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {/* Debug Info */}
            <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
              <strong>Form ID:</strong> {formId}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-8"
            >
              {isSubmitting ? "Starting Call..." : "Start Interview"}
            </Button>
          </form>
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
