import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function ThankYou() {
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

        {/* Success Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-sans">
            Thank You!
          </h1>

          <p className="text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">
            Your vouch has been submitted successfully. We'll review your
            submission and get back to you soon.
          </p>

          <div className="pt-6">
            <Link to="/">
              <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
                Submit Another Vouch
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
