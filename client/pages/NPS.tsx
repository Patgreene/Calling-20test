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
  const [question1Score, setQuestion1Score] = useState<number | null>(null);
  const [question2Score, setQuestion2Score] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formId, setFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(null);

  // Get form_id and formData from URL params or location state
  useEffect(() => {
    let id = searchParams.get("form_id");
    let data = location.state?.formData || null;

    if (!id && data?.formId) {
      id = data.formId;
    }

    if (!id) {
      // Try to get from localStorage as fallback
      const storedFormId = localStorage.getItem("form_id");
      if (storedFormId) {
        id = storedFormId;
      }
    }

    console.log("NPS Form ID found:", id);
    console.log("Form Data:", data);
    setFormId(id);
    setFormData(data);
  }, [searchParams, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (question1Score === null || question2Score === null) {
      alert("Please answer both questions before continuing.");
      return;
    }

    if (!formId) {
      alert("No form ID available to save feedback data");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Saving feedback data for form_id:", formId);
      console.log("Question 1 Score:", question1Score);
      console.log("Question 2 Score:", question2Score);
      console.log("Comment:", feedback);

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
            q1_score: question1Score,
            q2_score: question2Score,
            feedback_comment: feedback || null,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Feedback save error response:", errorText);
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`,
        );
      }

      console.log("Feedback data saved successfully");

      // Navigate to thank you page
      navigate("/thank-you");
    } catch (error) {
      console.error("Error saving feedback data:", error);
      alert("Failed to save feedback data. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 2) return "bg-red-500 hover:bg-red-600";
    if (score <= 3) return "bg-yellow-500 hover:bg-yellow-600";
    return "bg-green-500 hover:bg-green-600";
  };

  const voucheeName = formData?.voucheeFirst || "this person";

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
            Interview Feedback
          </h1>

          {/* Debug Info */}
          {!formId && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                <strong>Debug:</strong> No form_id found. Please navigate here
                from the AI call page.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Question 1 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                I was able to share everything I needed to about {voucheeName}
              </h3>
              
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>

              <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setQuestion1Score(score)}
                    className={`
                      w-14 h-14 rounded-lg text-white font-bold text-base transition-all duration-200 shadow-md hover:shadow-lg
                      ${
                        question1Score === score
                          ? "bg-[#FF7A56] hover:bg-[#f15a33] ring-3 ring-offset-2 ring-[#7FB5C5] scale-110 shadow-xl"
                          : "bg-[#7FB5C5] hover:bg-[#4C7B8A]"
                      }
                    `}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                The interview flow felt smooth and easy to follow
              </h3>
              
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Strongly Disagree</span>
                <span>Strongly Agree</span>
              </div>

              <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => setQuestion2Score(score)}
                    className={`
                      w-14 h-14 rounded-lg text-white font-bold text-base transition-all duration-200 shadow-md hover:shadow-lg
                      ${
                        question2Score === score
                          ? "bg-[#FF7A56] hover:bg-[#f15a33] ring-3 ring-offset-2 ring-[#7FB5C5] scale-110 shadow-xl"
                          : "bg-[#7FB5C5] hover:bg-[#4C7B8A]"
                      }
                    `}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>

            {/* Small Comment Box */}
            <div className="space-y-3">
              <Label
                htmlFor="feedback"
                className="text-sm font-medium text-gray-700"
              >
                Additional comments (optional)
              </Label>
              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7FB5C5] focus:border-[#7FB5C5] resize-vertical font-sans text-sm"
                placeholder="Any other thoughts?"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="submit"
                disabled={question1Score === null || question2Score === null || isSubmitting || !formId}
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
        <Link to="/ai-call" state={{ formData }}>
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
