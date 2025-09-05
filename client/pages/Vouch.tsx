import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

export default function Vouch() {
  const [name, setName] = useState("");
  const [vouchee, setVouchee] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), [email]);
  const phoneValid = useMemo(() => phone.trim().length >= 7, [phone]);
  const isValid = name.trim() && vouchee.trim() && emailValid && phoneValid;

  const onNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    alert("Thanks! Next step coming soon.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-white text-3xl sm:text-4xl font-bold">Vouch Interview</h1>
          <p className="text-blue-200 mt-2">Fill in your details</p>
        </div>

        <form
          onSubmit={onNext}
          className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 sm:p-8 shadow-xl"
        >
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-white/80 mb-2">Your Name</label>
              <input
                type="text"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">Who are you Vouching for?</label>
              <input
                type="text"
                placeholder="Full name"
                value={vouchee}
                onChange={(e) => setVouchee(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">Your Email</label>
              <input
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
                  email.length === 0 || emailValid
                    ? "border-white/20 focus:ring-blue-400"
                    : "border-red-400/50 focus:ring-red-400"
                }`}
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">Your Phone</label>
              <input
                type="tel"
                placeholder="+64 21 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-white placeholder-white/50 focus:outline-none focus:ring-2 ${
                  phone.length === 0 || phoneValid
                    ? "border-white/20 focus:ring-blue-400"
                    : "border-red-400/50 focus:ring-red-400"
                }`}
              />
            </div>

            <div>
              <Button
                type="submit"
                disabled={!isValid}
                className={`w-full h-12 rounded-xl text-white ${
                  isValid
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-white/10 text-white/60 cursor-not-allowed"
                }`}
              >
                Next
              </Button>
            </div>
          </div>
        </form>

        <div className="text-center mt-4 text-white/50">
          <div>Powered by Vouch</div>
          <div className="text-xs mt-1">Step 1 of 2</div>
        </div>
      </div>
    </div>
  );
}
