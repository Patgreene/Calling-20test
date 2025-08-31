import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, Eye, EyeOff, Lock } from "lucide-react";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [promptStats, setPromptStats] = useState({ length: 0, variables: 0 });

  // Simple admin authentication
  const handleAuth = () => {
    // Simple password check - in production, use proper auth
    if (password === "vouch2024admin") {
      setIsAuthenticated(true);
      loadPrompt();
    } else {
      setMessage({ type: 'error', text: 'Invalid admin password' });
    }
  };

  const loadPrompt = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/prompt');
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.instructions);
        setOriginalPrompt(data.instructions);
        updateStats(data.instructions);
      } else {
        setMessage({ type: 'error', text: 'Failed to load prompt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading prompt' });
    }
    setIsLoading(false);
  };

  const savePrompt = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/admin/prompt', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: prompt,
          password: password // Include password for additional security
        }),
      });

      if (response.ok) {
        setOriginalPrompt(prompt);
        setMessage({ type: 'success', text: 'Prompt saved successfully!' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save prompt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving prompt' });
    }
    setIsSaving(false);
  };

  const updateStats = (text: string) => {
    const variables = (text.match(/{{[^}]+}}/g) || []).length;
    setPromptStats({
      length: text.length,
      variables
    });
  };

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    updateStats(value);
  };

  const resetPrompt = () => {
    setPrompt(originalPrompt);
    updateStats(originalPrompt);
    setMessage({ type: 'success', text: 'Prompt reset to last saved version' });
  };

  const hasChanges = prompt !== originalPrompt;

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Admin Access
            </CardTitle>
            <CardDescription className="text-white/70">
              Enter admin password to manage prompts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
            />
            <Button 
              onClick={handleAuth}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Access Admin
            </Button>
            {message && message.type === 'error' && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertDescription className="text-red-300">
                  {message.text}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Vouch Admin
          </h1>
          <p className="text-blue-200 text-lg">
            OpenAI Prompt Management
          </p>
        </div>

        {/* Status Messages */}
        {message && (
          <Alert className={`${
            message.type === 'success' 
              ? 'border-green-500/50 bg-green-500/10' 
              : 'border-red-500/50 bg-red-500/10'
          }`}>
            <AlertDescription className={
              message.type === 'success' ? 'text-green-300' : 'text-red-300'
            }>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Prompt Editor */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white">Sam AI Prompt Editor</CardTitle>
                    <CardDescription className="text-white/70">
                      Edit the instructions for Sam, the Vouch reference agent
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPrompt}
                      disabled={isLoading}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={prompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="Loading prompt..."
                  className="min-h-[600px] bg-white/5 border border-white/20 text-white placeholder-white/50 resize-none font-mono text-sm"
                  disabled={isLoading}
                />
                
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="border-white/20 text-white">
                      {promptStats.length} characters
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-white">
                      {promptStats.variables} variables
                    </Badge>
                    {hasChanges && (
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                        Unsaved changes
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {hasChanges && (
                      <Button
                        variant="outline"
                        onClick={resetPrompt}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        Reset
                      </Button>
                    )}
                    <Button
                      onClick={savePrompt}
                      disabled={isSaving || !hasChanges}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Prompt
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Variables */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Template Variables</CardTitle>
                <CardDescription className="text-white/70">
                  Available in the prompt
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm font-mono">
                  <div className="text-white/60">Voucher (person calling):</div>
                  <div className="text-green-300">{{`{{voucher_first}}`}}</div>
                  <div className="text-green-300">{{`{{voucher_last}}`}}</div>
                  
                  <div className="text-white/60 mt-4">Vouchee (person being vouched for):</div>
                  <div className="text-green-300">{{`{{vouchee_first}}`}}</div>
                  <div className="text-green-300">{{`{{vouchee_last}}`}}</div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => window.open('/openai-realtime-test', '_blank')}
                >
                  Test Interview Page
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => setIsAuthenticated(false)}
                >
                  Logout
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            {showPreview && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Preview</CardTitle>
                  <CardDescription className="text-white/70">
                    How prompt appears with sample data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-white/80 bg-black/20 p-3 rounded border max-h-40 overflow-y-auto font-mono">
                    {prompt
                      .replace(/{{voucher_first}}/g, 'Patrick')
                      .replace(/{{voucher_last}}/g, 'Greene')
                      .replace(/{{vouchee_first}}/g, 'Sam')
                      .replace(/{{vouchee_last}}/g, 'Baker')
                      .substring(0, 500)}
                    {prompt.length > 500 && '...'}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}