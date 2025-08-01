import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function EditSummary() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);

  // Get form_id from URL params or location state or localStorage
  useEffect(() => {
    let id = searchParams.get("form_id");

    if (!id && location.state?.formData?.formId) {
      id = location.state.formData.formId;
    }

    if (!id) {
      // Try to get from localStorage as fallback
      const storedFormId = localStorage.getItem("form_id");
      if (storedFormId) {
        id = storedFormId;
      }
    }

    console.log("Form ID found:", id);
    setFormId(id);
  }, [searchParams, location.state]);

  // Load summary from Supabase
  useEffect(() => {
    const loadSummary = async () => {
      if (!formId) {
        console.log("No form ID available");
        setIsLoading(false);
        return;
      }

      try {
        console.log("Loading summary for form_id:", formId);

        // Query specifically for the Transcript column (with capital T)
        const response = await fetch(
          `https://xbcmpkkqqfqsuapbvvkp.supabase.co/rest/v1/form?form_id=eq.${formId}&select=Transcript`,
          {
            headers: {
              apikey:
                "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik",
              Authorization:
                "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik",
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Supabase error response:", errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Loaded data:", data);
        console.log("Available columns:", data.length > 0 ? Object.keys(data[0]) : "No data");

        if (data && data.length > 0) {
          // Prioritize 'Transcript' with capital T since that's what's in Supabase
          const record = data[0];
          const transcript = record.Transcript || record.transcript || record.summary || record.Summary || "";
          console.log("Found transcript data:", transcript ? "Yes" : "No");
          console.log("Transcript length:", transcript ? transcript.length : 0);
          setSummary(transcript);
        } else {
          console.log("No data found for form_id:", formId);
          setSummary("");
        }
      } catch (error) {
        console.error("Error loading transcript:", error);
        alert("Failed to load transcript. Check console for details.");
      } finally {
        setIsLoading(false);
      }
    };

    loadSummary();
  }, [formId]);

  const saveSummary = async () => {
    if (!formId) {
      alert("No form ID available to save to");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Saving updated transcript for form_id:", formId);

      const response = await fetch(
        `https://xbcmpkkqqfqsuapbvvkp.supabase.co/rest/v1/form?form_id=eq.${formId}`,
        {
          method: "PATCH",
          headers: {
            apikey:
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik",
            Authorization:
              "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik",
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ updated_transcript: summary }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Save error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      alert("Updated transcript saved successfully!");
    } catch (error) {
      console.error("Error saving updated transcript:", error);
      alert("Failed to save updated transcript. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ backgroundColor: "#F8F8F8" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading transcript...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          {/* Heading */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8 text-center font-sans">
            Review and Edit Summary
          </h1>

          {/* Debug Info */}
          {!formId && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Debug:</strong> No form_id found. Please navigate here
                from the AI call page or add ?form_id=your_id to the URL.
              </p>
            </div>
          )}

          {formId && (
            <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              <strong>Form ID:</strong> {formId}
            </div>
          )}

          {/* Form */}
          <div className="space-y-6">
            {/* Textarea */}
            <div className="space-y-3">
              <Label
                htmlFor="summaryInput"
                className="text-sm font-medium text-gray-700"
              >
                Transcript
              </Label>
              <textarea
                id="summaryInput"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={15}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-vertical min-h-[400px] font-sans text-base leading-relaxed"
                placeholder="AI-generated transcript will appear here..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={saveSummary}
                disabled={isSaving || !formId}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-6 left-6">
        <Link to="/ai-call">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
      </div>
    </div>
  );
}
