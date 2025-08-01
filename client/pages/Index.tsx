import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Index() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="text-center space-y-8 max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-16 md:h-20 object-contain"
          />
        </div>

        {/* Hero Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight font-sans">
          Profiles that capture your reputation.
        </h1>

        {/* CTA Buttons */}
        <div className="pt-8 space-y-4">
          <Link to="/form">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Vouch for someone
            </Button>
          </Link>

<<<<<<< HEAD
          <div className="flex justify-center">
            <Link to="/elevenlabs-test">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
=======
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/test-call">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
>>>>>>> a1093ab68bfe373879fc8848056dec7d8a5d61b0
              >
                ElevenLabs AI Test
              </Button>
            </Link>

            <Link to="/elevenlabs-test">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
              >
                Test ElevenLabs AI
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
