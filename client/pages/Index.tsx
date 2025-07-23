import { Headphones, MessageCircle } from "lucide-react";

export default function Index() {
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pastel-blue-50 via-soft-lavender-50 to-pastel-blue-100 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full text-center space-y-8">
          {/* Visual Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-soft-lavender-400 to-pastel-blue-400 rounded-full blur-lg opacity-30 animate-pulse"></div>
            </div>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-soft-lavender-700 to-pastel-blue-700 bg-clip-text text-transparent leading-tight">
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
