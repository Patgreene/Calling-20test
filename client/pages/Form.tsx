import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Form() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    yourEmail: "",
    vouchingFor: "",
    theirEmail: "",
  });
  const [consentToRecording, setConsentToRecording] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if all fields are filled
    if (
      !formData.fullName ||
      !formData.yourEmail ||
      !formData.vouchingFor ||
      !formData.theirEmail
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    // Check if recording consent is given
    if (!consentToRecording) {
      alert("Please confirm that you consent to the call being recorded and shared.");
      return;
    }

    // Save to localStorage
    localStorage.setItem("vouchForm", JSON.stringify(formData));

    // Navigate to interview page
    navigate("/interview");
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
            Let's get started
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label
                htmlFor="fullName"
                className="text-sm font-medium text-gray-700"
              >
                Full Name *
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your full name"
              />
            </div>

            {/* Your Email */}
            <div className="space-y-2">
              <Label
                htmlFor="yourEmail"
                className="text-sm font-medium text-gray-700"
              >
                Your Email *
              </Label>
              <Input
                id="yourEmail"
                name="yourEmail"
                type="email"
                required
                value={formData.yourEmail}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your email address"
              />
            </div>

            {/* Who are you vouching for */}
            <div className="space-y-2">
              <Label
                htmlFor="vouchingFor"
                className="text-sm font-medium text-gray-700"
              >
                Who are you vouching for? *
              </Label>
              <Input
                id="vouchingFor"
                name="vouchingFor"
                type="text"
                required
                value={formData.vouchingFor}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter their full name"
              />
            </div>

            {/* Their Email */}
            <div className="space-y-2">
              <Label
                htmlFor="theirEmail"
                className="text-sm font-medium text-gray-700"
              >
                Their Email *
              </Label>
              <Input
                id="theirEmail"
                name="theirEmail"
                type="email"
                required
                value={formData.theirEmail}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter their email address"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mt-8"
            >
              Next
            </Button>
          </form>
        </div>
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-6 left-6">
        <Button
          onClick={handleBack}
          variant="ghost"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
