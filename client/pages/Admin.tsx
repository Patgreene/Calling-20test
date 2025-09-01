import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Save, RefreshCw, Eye, EyeOff, Lock, History, Clock } from "lucide-react";

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

  // OpenAI Session Configuration
  const [sessionConfig, setSessionConfig] = useState({
    voice: 'alloy',
    speed: 1.0,
    temperature: 0.8,
    max_response_output_tokens: 4096,
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  });
  const [originalSessionConfig, setOriginalSessionConfig] = useState(sessionConfig);
  const [promptHistory, setPromptHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

        // Load session config if available
        if (data.sessionConfig) {
          setSessionConfig(data.sessionConfig);
          setOriginalSessionConfig(data.sessionConfig);
        }
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
          sessionConfig: sessionConfig,
          password: password // Include password for additional security
        }),
      });

      if (response.ok) {
        setOriginalPrompt(prompt);
        setOriginalSessionConfig(sessionConfig);
        setMessage({ type: 'success', text: 'Prompt and settings saved successfully!' });
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
    setSessionConfig(originalSessionConfig);
    setMessage({ type: 'success', text: 'Prompt and settings reset to last saved version' });
  };

  const loadPromptHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch('/api/admin/prompt-history');
      if (response.ok) {
        const data = await response.json();
        setPromptHistory(data.history);
        setShowHistory(true);
      } else {
        setMessage({ type: 'error', text: 'Failed to load prompt history' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading prompt history' });
    }
    setIsLoadingHistory(false);
  };

  const loadSpecificPrompt = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/prompt/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPrompt(data.instructions);
        updateStats(data.instructions);
        setMessage({ type: 'success', text: 'Historical prompt loaded successfully' });
        setShowHistory(false);
      } else {
        setMessage({ type: 'error', text: 'Failed to load prompt' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading prompt' });
    }
  };

  const hasChanges = prompt !== originalPrompt || JSON.stringify(sessionConfig) !== JSON.stringify(originalSessionConfig);

  const updateSessionConfig = (key: string, value: any) => {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      setSessionConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setSessionConfig(prev => ({ ...prev, [key]: value }));
    }
  };

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

        <div className="grid gap-6 lg:grid-cols-4">
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
                      onClick={loadPromptHistory}
                      disabled={isLoadingHistory}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <History className={`w-4 h-4 ${isLoadingHistory ? 'animate-pulse' : ''}`} />
                    </Button>
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

            {/* Prompt History */}
            {showHistory && (
              <Card className="bg-white/10 backdrop-blur-xl border border-white/20 mt-6">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">Prompt History</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHistory(false)}
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      Close
                    </Button>
                  </div>
                  <CardDescription className="text-white/70">
                    Load previous versions from Supabase
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {promptHistory.length === 0 ? (
                      <p className="text-white/50 text-sm text-center py-4">
                        No prompt history found
                      </p>
                    ) : (
                      promptHistory.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                          onClick={() => loadSpecificPrompt(item.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-blue-400" />
                              <span className="text-white/80 text-sm">
                                {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                            <Badge variant="outline" className="border-white/20 text-white/60">
                              {item.length} chars
                            </Badge>
                          </div>
                          <p className="text-white/60 text-xs font-mono leading-relaxed">
                            {item.preview}
                          </p>
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-blue-400/30 text-blue-300 hover:bg-blue-500/20 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadSpecificPrompt(item.id);
                              }}
                            >
                              Load This Version
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* OpenAI Settings */}
          <div>
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20">
              <CardHeader>
                <CardTitle className="text-white text-lg">Voice & Audio Settings</CardTitle>
                <CardDescription className="text-white/70">
                  Configure OpenAI Realtime API parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Voice Selection */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">Voice Model</label>
                  <select
                    value={sessionConfig.voice}
                    onChange={(e) => updateSessionConfig('voice', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="alloy">Alloy - Versatile & Neutral</option>
                    <option value="echo">Echo - Deep & Authoritative</option>
                    <option value="fable">Fable - Warm & Storytelling</option>
                    <option value="onyx">Onyx - Professional & Formal</option>
                    <option value="nova">Nova - Friendly & Approachable</option>
                    <option value="shimmer">Shimmer - Cheerful & Upbeat</option>
                    <option value="marin">Marin - Natural & Expressive (New)</option>
                    <option value="cedar">Cedar - Sophisticated & Clear (New)</option>
                  </select>
                </div>

                {/* Speed */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Speech Speed: {sessionConfig.speed}x
                  </label>
                  <input
                    type="range"
                    min="0.25"
                    max="1.5"
                    step="0.05"
                    value={sessionConfig.speed}
                    onChange={(e) => updateSessionConfig('speed', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0.25x (Slow)</span>
                    <span>1.5x (Fast)</span>
                  </div>
                </div>

                {/* Temperature */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Creativity (Temperature): {sessionConfig.temperature}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={sessionConfig.temperature}
                    onChange={(e) => updateSessionConfig('temperature', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0.0 (Focused)</span>
                    <span>2.0 (Creative)</span>
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    Controls response randomness and creativity. Lower values make Sam more predictable and consistent, higher values make responses more varied and creative. 0.8 is optimal for interviews.
                  </p>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Max Response Tokens: {sessionConfig.max_response_output_tokens}
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="8192"
                    step="256"
                    value={sessionConfig.max_response_output_tokens}
                    onChange={(e) => updateSessionConfig('max_response_output_tokens', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>1K (Short)</span>
                    <span>8K (Long)</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Voice Activity Detection */}
            <Card className="bg-white/10 backdrop-blur-xl border border-white/20 mt-6">
              <CardHeader>
                <CardTitle className="text-white text-lg">Voice Activity Detection</CardTitle>
                <CardDescription className="text-white/70">
                  Control how the AI detects when you stop speaking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* VAD Threshold */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Detection Sensitivity: {sessionConfig.turn_detection.threshold}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sessionConfig.turn_detection.threshold}
                    onChange={(e) => updateSessionConfig('turn_detection.threshold', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>0.0 (Very Sensitive)</span>
                    <span>1.0 (Less Sensitive)</span>
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    How easily Sam detects when you're speaking. Higher sensitivity responds to quieter speech but may trigger on background noise. Lower sensitivity requires clearer speech.
                  </p>
                </div>

                {/* Silence Duration */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Silence Duration: {sessionConfig.turn_detection.silence_duration_ms}ms
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="2000"
                    step="50"
                    value={sessionConfig.turn_detection.silence_duration_ms}
                    onChange={(e) => updateSessionConfig('turn_detection.silence_duration_ms', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>200ms (Quick)</span>
                    <span>2s (Patient)</span>
                  </div>
                </div>

                {/* Prefix Padding */}
                <div>
                  <label className="block text-white/80 text-sm font-medium mb-2">
                    Audio Buffer: {sessionConfig.turn_detection.prefix_padding_ms}ms
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={sessionConfig.turn_detection.prefix_padding_ms}
                    onChange={(e) => updateSessionConfig('turn_detection.prefix_padding_ms', parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-1">
                    <span>100ms (Minimal)</span>
                    <span>1s (More Context)</span>
                  </div>
                  <p className="text-white/50 text-xs mt-2">
                    Audio captured before detected speech begins. More buffer helps Sam understand context and catch the beginning of sentences, but increases processing time.
                  </p>
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
                  <div className="text-green-300">{`{{voucher_first}}`}</div>
                  <div className="text-green-300">{`{{voucher_last}}`}</div>

                  <div className="text-white/60 mt-4">Vouchee (person being vouched for):</div>
                  <div className="text-green-300">{`{{vouchee_first}}`}</div>
                  <div className="text-green-300">{`{{vouchee_last}}`}</div>
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
