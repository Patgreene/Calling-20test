import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Mic, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Vouch Admin Portal
          </h1>
          <p className="text-blue-200 text-lg">
            Choose an admin section to manage
          </p>
        </div>

        {/* Admin Options */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Prompt Admin Card */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Settings className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-white text-xl">Prompt Admin</CardTitle>
              <CardDescription className="text-white/70">
                Manage AI prompts and conversation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => navigate("/admin1224-prompt")}
                className="w-full bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-500 transition-colors"
                size="lg"
              >
                Access Prompt Admin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="mt-3 text-xs text-white/50 text-center">
                Configure Sam AI instructions and voice settings
              </div>
            </CardContent>
          </Card>

          {/* Recording Admin Card */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-colors">
                <Mic className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white text-xl">Recording Admin</CardTitle>
              <CardDescription className="text-white/70">
                Monitor and manage interview recordings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => navigate("/admin1224-recording")}
                className="w-full bg-green-600 hover:bg-green-700 group-hover:bg-green-500 transition-colors"
                size="lg"
              >
                Access Recording Admin
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <div className="mt-3 text-xs text-white/50 text-center">
                View recordings, transcripts, and download files
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/40 text-sm">
            Vouch Admin Portal • Secure Access Required
          </p>
        </div>
      </div>
    </div>
  );
}
