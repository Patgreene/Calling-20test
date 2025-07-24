import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Summary() {
  const navigate = useNavigate();
  const [vouchText, setVouchText] = useState("");

  useEffect(() => {
    // Load transcript from localStorage
    const savedTranscript = localStorage.getItem("callTranscript");
    if (savedTranscript) {
      setVouchText(savedTranscript);
    } else {
      setVouchText("Paste or type your vouch here...");
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setVouchText(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Save edited text to localStorage
    localStorage.setItem("vouchSummary", vouchText);

    // Navigate to verify page
    navigate("/verify");
  };

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center font-sans">
            Review & Edit Your Vouch
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Textarea */}
            <div className="space-y-3">
              <Label
                htmlFor="vouchText"
                className="text-sm font-medium text-gray-700"
              >
                Your Vouch Content
              </Label>
              <textarea
                id="vouchText"
                value={vouchText}
                onChange={handleTextChange}
                rows={15}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-vertical min-h-[400px] font-sans text-base leading-relaxed"
                placeholder="Paste or type your vouch here..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Submit
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
