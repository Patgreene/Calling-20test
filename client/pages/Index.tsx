import { Button } from "@/components/ui/button";
import { PhoneCall, Headphones, MessageCircle } from "lucide-react";

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
              You'll speak with our AI agent,{" "}
              <span className="font-semibold text-soft-lavender-700">Kate</span>
              . She'll ask you a few simple questions about the person you're
              vouching for. No pressure — just speak naturally.
            </p>
          </div>

          {/* Start Call Button */}
          <div className="pt-4">
            <button
              id="start-call-btn"
              className="inline-flex items-center justify-center bg-gradient-to-r from-soft-lavender-500 to-pastel-blue-500 hover:from-soft-lavender-600 hover:to-pastel-blue-600 text-white font-semibold text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 w-full md:w-auto md:min-w-[200px] group gap-3"
            >
              <PhoneCall className="w-6 h-6 group-hover:animate-pulse" />
              Start Call
            </button>
          </div>

          {/* Additional Visual Elements */}
          <div className="flex justify-center space-x-8 pt-6 opacity-60">
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-white/50 rounded-full p-3">
                <MessageCircle className="w-6 h-6 text-soft-lavender-600" />
              </div>
              <span className="text-sm text-gray-600">
                Natural conversation
              </span>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="bg-white/50 rounded-full p-3">
                <PhoneCall className="w-6 h-6 text-pastel-blue-600" />
              </div>
              <span className="text-sm text-gray-600">In-browser calling</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
