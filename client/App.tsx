import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import Index from "./pages/Index";
import Form from "./pages/Form";
import AICall from "./pages/AICall";
import NPS from "./pages/NPS";
import Profile from "./pages/Profile";
import ThankYou from "./pages/ThankYou";
import OpenAIRealtimeTest from "./pages/OpenAIRealtimeTest";
import Admin from "./pages/Admin";
import RecordingAdmin from "./pages/RecordingAdmin";
import AdminLandingPage from "./pages/AdminLandingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/form" element={<Form />} />
            <Route path="/ai-call" element={<AICall />} />
            <Route path="/nps" element={<NPS />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route
              path="/openai-realtime-test"
              element={<OpenAIRealtimeTest />}
            />
            <Route path="/admin1224" element={<AdminProtectedRoute><AdminLandingPage /></AdminProtectedRoute>} />
            <Route path="/admin1224-prompt" element={<AdminProtectedRoute><Admin /></AdminProtectedRoute>} />
            <Route path="/admin1224-recording" element={<AdminProtectedRoute><RecordingAdmin /></AdminProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Ensure root is only created once to avoid development warnings
const container = document.getElementById("root")!;
let root = (container as any)._reactRoot;

if (!root) {
  root = createRoot(container);
  (container as any)._reactRoot = root;
}

root.render(<App />);
