import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function Form() {
  const navigate = useNavigate();

  // Generate a new form ID each time the component loads
  const [formData, setFormData] = useState(() => ({
    voucherFirst: "",
    voucherLast: "",
    voucheeFirst: "",
    voucheeLast: "",
    voucherEmail: "",
    formId: crypto.randomUUID(),
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields are filled
    if (
      !formData.voucherFirst ||
      !formData.voucherLast ||
      !formData.voucherEmail ||
      !formData.voucheeFirst ||
      !formData.voucheeLast
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    // Navigate to AI call page with form data
    navigate("/ai-call", { state: { formData } });
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

          <form id="vouch-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Voucher First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucherFirst"
                className="text-sm font-medium text-gray-700"
              >
                Voucher First*
              </Label>
              <Input
                id="voucherFirst"
                name="voucherFirst"
                type="text"
                required
                value={formData.voucherFirst}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
              />
            </div>

            {/* Voucher Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucherLast"
                className="text-sm font-medium text-gray-700"
              >
                Voucher Last*
              </Label>
              <Input
                id="voucherLast"
                name="voucherLast"
                type="text"
                required
                value={formData.voucherLast}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
              />
            </div>

            {/* Vouchee First Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucheeFirst"
                className="text-sm font-medium text-gray-700"
              >
                Vouchee First*
              </Label>
              <Input
                id="voucheeFirst"
                name="voucheeFirst"
                type="text"
                required
                value={formData.voucheeFirst}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
              />
            </div>

            {/* Vouchee Last Name */}
            <div className="space-y-2">
              <Label
                htmlFor="voucheeLast"
                className="text-sm font-medium text-gray-700"
              >
                Vouchee Last*
              </Label>
              <Input
                id="voucheeLast"
                name="voucheeLast"
                type="text"
                required
                value={formData.voucheeLast}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-blue-500 focus:border-primary-blue-500"
                placeholder="Enter your email address"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-vibrant-orange-500 hover:bg-vibrant-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 mt-8"
            >
              Start Call
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
