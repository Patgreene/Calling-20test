import { Headphones, MessageCircle } from "lucide-react";

export default function Index() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
              alt="Vouch Logo"
              className="h-20 md:h-24 object-contain filter drop-shadow-lg"
            />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-white drop-shadow-lg leading-tight">
              Start Your Vouch Call
            </h1>
          </div>

          {/* Instruction Text */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-lg border border-white/20">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              You'll speak with our AI agent. They'll ask you a few simple
              questions about the person you're vouching for. No pressure — just
              speak naturally.
            </p>
          </div>



          {/* SynthFlow Widget Container - Seamlessly Integrated */}
          <div className="pt-8">
            <div className="bg-gradient-to-br from-white/30 via-white/20 to-transparent backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30 overflow-hidden">
              <div
                id="synthflow-container"
                className="rounded-2xl overflow-hidden shadow-inner"
              >
                <iframe
                  id="audio_iframe"
                  src="https://widget.synthflow.ai/widget/v2/63e56c5a-2a00-447a-906a-131e89aa7ccd/1753267522798x927161966671406300"
                  allow="microphone"
                  width="100%"
                  height="500px"
                  style={{ border: "none" }}
                  scrolling="no"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
