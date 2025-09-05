import { useLocation, useNavigate } from "react-router-dom";
import { Phone } from "lucide-react";

export default function VouchStart() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: any };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-white text-3xl sm:text-4xl font-bold">Vouch Interview</h1>
          <p className="text-blue-200 mt-2">Meet Sam, your AI interviewer</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 sm:p-10 shadow-xl flex flex-col items-center">
          <div className="w-40 h-20 rounded-lg bg-black/20 border border-white/10 flex items-center justify-center mb-6">
            <div className="w-28 h-2 bg-blue-500/30 rounded" />
          </div>

          <div className="px-4 py-2 rounded-full bg-black/30 border border-white/10 text-white/80 text-sm mb-6">
            • Push green button to start call
          </div>

          <button
            onClick={() => alert("Call starting (placeholder)")}
            className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg"
            aria-label="Start call"
          >
            <Phone className="w-7 h-7" />
          </button>

          <button
            onClick={() => navigate(-1)}
            className="self-start mt-6 text-white/60 hover:text-white text-sm"
          >
            ← Back
          </button>
        </div>

        <div className="text-center mt-6 text-white/50">
          <div>Powered by Vouch</div>
          <div className="text-xs mt-1">Step 2 of 2</div>
        </div>
      </div>
    </div>
  );
}
