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
        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a
            href="https://profiles.vouchprofile.com/demo"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-[#7FB5C5] text-[#4C7B8A] hover:bg-[#f0f8fa] font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              View Demo Profile
            </Button>
          </a>

          <Link to="/form">
            <Button
              variant={null}
              size="lg"
              className="!bg-[#7FB5C5] hover:!bg-[#4C7B8A] !text-white font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Vouch for someone
            </Button>
          </Link>
        </div>

        {/* Quote Section */}
        <div className="pt-12">
          <button className="group text-center max-w-lg mx-auto block hover:scale-105 transition-transform duration-200">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200/50">
              <div className="text-4xl text-[#7FB5C5] mb-2">"</div>
              <p className="text-lg md:text-xl text-gray-700 font-medium italic leading-relaxed">
                She has one of the most creative minds I've ever worked with
              </p>
              <div className="text-4xl text-[#7FB5C5] mt-2 rotate-180 inline-block">"</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
