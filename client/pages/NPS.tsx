import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import {
  Link,
  useNavigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useState, useEffect } from "react";

export default function NPS() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    console.log("NPS Form ID found:", id);
    setFormId(id);
  }, [searchParams, location.state]);

  const handleScoreSelect = (score: number) => {
    setSelectedScore(score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedScore === null) {
      alert("Please select a score before continuing.");
      return;
    }

    if (!formId) {
      alert("No form ID available to save NPS data");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Saving NPS data for form_id:", formId);
      console.log("NPS Score:", selectedScore);
      console.log("NPS Comment:", feedback);

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
          body: JSON.stringify({
            nps_score: selectedScore,
            nps_comment: feedback || null,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("NPS save error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      console.log("NPS data saved successfully");

      // Navigate to thank you page
      navigate("/thank-you");
    } catch (error) {
      console.error("Error saving NPS data:", error);
      alert("Failed to save NPS data. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 6) return "bg-red-500 hover:bg-red-600";
    if (score <= 8) return "bg-yellow-500 hover:bg-yellow-600";
    return "bg-green-500 hover:bg-green-600";
  };

  const getScoreLabel = () => {
    if (selectedScore === null) return "";
    if (selectedScore <= 6) return "Detractor";
    if (selectedScore <= 8) return "Passive";
    return "Promoter";
  };

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
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 text-center font-sans">
            How did we do?
          </h1>

          <p className="text-xl text-gray-600 mb-8 text-center leading-relaxed">
            How likely would you be to recommend this to a friend?
          </p>

          {/* Debug Info */}
          {!formId && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Debug:</strong> No form_id found. Please navigate here
                from the edit summary page.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* NPS Scale */}
            <div className="space-y-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Not at all likely</span>
                <span>Extremely likely</span>
              </div>

              <div className="grid grid-cols-11 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => handleScoreSelect(score)}
                    className={`
                      aspect-square rounded-lg text-white font-bold text-lg transition-all duration-200 
                      ${
                        selectedScore === score
                          ? `${getScoreColor(score)} ring-4 ring-offset-2 ring-[#88c6d7] scale-110`
                          : "bg-gray-300 hover:bg-gray-400"
                      }
                    `}
                  >
                    {score}
                  </button>
                ))}
              </div>

              {selectedScore !== null && (
                <div className="text-center mt-4">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium text-white ${getScoreColor(selectedScore)}`}
                  >
                    {getScoreLabel()} ({selectedScore}/10)
                  </span>
                </div>
              )}
            </div>

            {/* Optional Feedback */}
            <div className="space-y-3">
              <Label
                htmlFor="feedback"
                className="text-sm font-medium text-gray-700"
              >
                Tell us more (optional)
              </Label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7FB5C5] focus:border-[#7FB5C5] resize-vertical font-sans text-base"
                placeholder="What could we improve? What did you like most?"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={selectedScore === null || isSubmitting || !formId}
                variant={null}
                className="!bg-[#7FB5C5] hover:!bg-[#4C7B8A] !text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Next"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-6 left-6">
        <Link to="/edit-summary">
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
