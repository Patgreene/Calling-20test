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
    voucherFirst: "",
    voucherLast: "",
    voucherEmail: "",
    voucheeFirst: "",
    voucheeLast: "",
  });
  const [consentToRecording, setConsentToRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Check if all fields are filled
      if (
        !formData.voucherFirst ||
        !formData.voucherLast ||
        !formData.voucherEmail ||
        !formData.voucheeFirst ||
        !formData.voucheeLast
      ) {
        alert("Please fill in all required fields.");
        setIsSubmitting(false);
        return;
      }

      // Check if recording consent is given
      if (!consentToRecording) {
        alert(
          "Please confirm that you consent to the call being recorded and shared.",
        );
        setIsSubmitting(false);
        return;
      }

      // Generate unique form_id
      const formId = crypto.randomUUID();

      // Prepare Supabase payload
      const supabasePayload = {
        form_id: formId,
        voucher_first: formData.voucherFirst,
        voucher_last: formData.voucherLast,
        voucher_email: formData.voucherEmail,
        vouchee_first: formData.voucheeFirst,
        vouchee_last: formData.voucheeLast,
      };

      // Send to Supabase
      const response = await fetch("https://xbcmpkkqqfqsuapbvvkp.supabase.co/rest/v1/form", {
        method: "POST",
        headers: {
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(supabasePayload),
      });

      if (!response.ok) {
        throw new Error(`Supabase API error: ${response.status}`);
      }

      // Store form_id in localStorage
      localStorage.setItem("form_id", formId);

      // Save form data to localStorage (for backwards compatibility)
      const formDataWithConsent = {
        ...formData,
        recordingConsent: consentToRecording ? "Yes" : "No",
        formId: formId,
      };
      localStorage.setItem("vouchForm", JSON.stringify(formDataWithConsent));

      // Navigate to interview page
      navigate("/interview");

    } catch (error) {
      console.error("Error submitting form:", error);
      alert("There was an error submitting your form. Please try again.");
    } finally {
      setIsSubmitting(false);
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

        {/* Form */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center font-sans">
            Let's get started
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Voucher First and Last Name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="voucherFirst"
                  className="text-sm font-medium text-gray-700"
                >
                  Your First Name *
                </Label>
                <Input
                  id="voucherFirst"
                  name="voucherFirst"
                  type="text"
                  required
                  value={formData.voucherFirst}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="voucherLast"
                  className="text-sm font-medium text-gray-700"
                >
                  Your Last Name *
                </Label>
                <Input
                  id="voucherLast"
                  name="voucherLast"
                  type="text"
                  required
                  value={formData.voucherLast}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* Your Email */}
            <div className="space-y-2">
              <Label
                htmlFor="voucherEmail"
                className="text-sm font-medium text-gray-700"
              >
                Your Email *
              </Label>
              <Input
                id="voucherEmail"
                name="voucherEmail"
                type="email"
                required
                value={formData.voucherEmail}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your email address"
              />
            </div>

            {/* Vouchee First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucheeFirst"
                className="text-sm font-medium text-gray-700"
              >
                Who are you vouching for? (First Name) *
              </Label>
              <Input
                id="voucheeFirst"
                name="voucheeFirst"
                type="text"
                required
                value={formData.voucheeFirst}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter their first name"
              />
            </div>

            {/* Vouchee Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucheeLast"
                className="text-sm font-medium text-gray-700"
              >
                Their Last Name *
              </Label>
              <Input
                id="voucheeLast"
                name="voucheeLast"
                type="text"
                required
                value={formData.voucheeLast}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter their last name"
              />
            </div>

            {/* Recording Consent Checkbox */}
            <div className="space-y-3 pt-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="recordingConsent"
                  checked={consentToRecording}
                  onCheckedChange={(checked) =>
                    setConsentToRecording(checked === true)
                  }
                  className="mt-1"
                />
                <Label
                  htmlFor="recordingConsent"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  <strong>
                    I consent to this call being recorded and shared for
                    verification purposes.
                  </strong>
                </Label>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!consentToRecording || isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Next"}
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
