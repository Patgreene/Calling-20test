import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import {
  Link,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect } from "react";

export default function EditSummary() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
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
        console.log("=== SUPABASE DEBUG START ===");
        console.log("Loading summary for form_id:", formId);
        console.log("Full URL:", `https://xbcmpkkqqfqsuapbvvkp.supabase.co/rest/v1/form?form_id=eq.${formId}&select=Transcript`);

        // First, let's test connection by getting all columns for this form_id
        console.log("Testing Supabase connection with all columns...");
        const testResponse = await fetch(
          `https://xbcmpkkqqfqsuapbvvkp.supabase.co/rest/v1/form?form_id=eq.${formId}`,
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

        console.log("Test response status:", testResponse.status);

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.error("Test connection failed:", errorText);
          throw new Error(`Connection test failed: ${testResponse.status} - ${errorText}`);
        }

        const testData = await testResponse.json();
        console.log("Test connection SUCCESS");
        console.log("Number of records found:", testData.length);
        console.log("Raw test data:", testData);

        if (testData.length > 0) {
          console.log("Available columns:", Object.keys(testData[0]));
          console.log("Full record content:", testData[0]);
        }

        // Now try the specific Transcript query
        console.log("Querying specifically for Transcript column...");
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

        console.log("Transcript query response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Transcript query error:", errorText);

          // If Transcript column doesn't exist, try fallback with all columns
          console.log("Falling back to use test data (all columns)...");
          const data = testData;

          if (data && data.length > 0) {
            const record = data[0];
            const transcript =
              record.Transcript ||
              record.transcript ||
              record.summary ||
              record.Summary ||
              "";
            console.log("Fallback transcript found:", transcript ? "Yes" : "No");
            console.log("Fallback transcript length:", transcript ? transcript.length : 0);
            setSummary(transcript);
          } else {
            console.log("No fallback data available");
            setSummary("");
          }
          console.log("=== SUPABASE DEBUG END ===");
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        console.log("Transcript query SUCCESS");
        console.log("Transcript data:", data);

        if (data && data.length > 0) {
          const record = data[0];
          const transcript =
            record.Transcript ||
            record.transcript ||
            record.summary ||
            record.Summary ||
            "";
          console.log("Found transcript data:", transcript ? "Yes" : "No");
          console.log("Transcript length:", transcript ? transcript.length : 0);
          console.log("Transcript preview:", transcript ? transcript.substring(0, 100) + "..." : "empty");
          setSummary(transcript);
        } else {
          console.log("No transcript data found for form_id:", formId);
          setSummary("");
        }

        console.log("=== SUPABASE DEBUG END ===");
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
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      alert("Updated transcript saved successfully!");
      // Navigate to NPS page after successful save
      setTimeout(() => {
        navigate("/nps");
      }, 1500);
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

          {/* Form */}
          <div className="space-y-6">
            {/* Textarea with Loading State */}
            <div className="space-y-3">
              <Label
                htmlFor="summaryInput"
                className="text-sm font-medium text-gray-700"
              >
                Transcript
              </Label>

              {isLoading ? (
                <div className="w-full min-h-[400px] border border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading transcript...</p>
                  </div>
                </div>
              ) : (
                <textarea
                  id="summaryInput"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={15}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-vertical min-h-[400px] font-sans text-base leading-relaxed"
                  placeholder="AI-generated transcript will appear here..."
                />
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={saveSummary}
                disabled={isSaving || !formId || isLoading}
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
