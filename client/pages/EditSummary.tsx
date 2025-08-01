import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function EditSummary() {
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

          {/* Form */}
          <div className="space-y-6">
            {/* Textarea */}
            <div className="space-y-3">
              <Label
                htmlFor="summaryInput"
                className="text-sm font-medium text-gray-700"
              >
                Summary
              </Label>
              <textarea
                id="summaryInput"
                rows={15}
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-vertical min-h-[400px] font-sans text-base leading-relaxed"
                placeholder="AI-generated summary will appear here..."
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-center pt-6">
              <Button
                onClick={() => (window as any).saveSummary()}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Save Changes
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

      {/* Supabase Script */}
      <script
        type="module"
        dangerouslySetInnerHTML={{
          __html: `
            import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
            
            const supabase = createClient(
              "https://xbcmpkkqqfqsuapbvvkp.supabase.co",
              "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiY21wa2txcWZxc3VhcGJ2dmtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0NDAxMTcsImV4cCI6MjA2OTAxNjExN30.iKr-HNc3Zedc_qMHHCsQO8e1nNMxn0cyoA3Wr_zwQik"
            );
            
            const urlParams = new URLSearchParams(window.location.search);
            const formId = urlParams.get("form_id");
            
            async function loadSummary() {
              const { data, error } = await supabase
                .from("form")
                .select("summary")
                .eq("form_id", formId)
                .single();
            
              if (error) {
                console.error("Error loading summary:", error);
                return;
              }
            
              document.getElementById("summaryInput").value = data.summary || "";
            }
            
            async function saveSummary() {
              const newSummary = document.getElementById("summaryInput").value;
            
              const { error } = await supabase
                .from("form")
                .update({ summary: newSummary })
                .eq("form_id", formId);
            
              if (error) {
                alert("Failed to save: " + error.message);
              } else {
                alert("Summary saved!");
              }
            }
            
            document.addEventListener("DOMContentLoaded", loadSummary);
            window.saveSummary = saveSummary;
          `,
        }}
      />
    </div>
  );
}
