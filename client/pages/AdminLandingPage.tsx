import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Mic, User, ArrowRight, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Vouch Admin Portal
          </h1>
        </div>

        {/* Admin Options */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Prompt Admin Card */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                <Settings className="w-8 h-8 text-blue-400" />
              </div>
              <CardTitle className="text-white text-xl">Prompt Admin</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => navigate("/admin1224-prompt")}
                className="w-full bg-blue-600 hover:bg-blue-700 group-hover:bg-blue-500 transition-colors"
                size="lg"
              >
                Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Recording Admin Card */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-colors">
                <Mic className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white text-xl">Recording Admin</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => navigate("/admin1224-recording")}
                className="w-full bg-green-600 hover:bg-green-700 group-hover:bg-green-500 transition-colors"
                size="lg"
              >
                Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* Profile Admin Card */}
          <Card className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 transition-all duration-300 cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-500/30 transition-colors">
                <User className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-white text-xl">Profile Admin</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Button
                onClick={() => window.open("https://profiles.vouchprofile.com/sys-admin-x9K2mP8qL5nW", "_blank")}
                className="w-full bg-purple-600 hover:bg-purple-700 group-hover:bg-purple-500 transition-colors"
                size="lg"
              >
                Access
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
