import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function SynthFlowTest() {
  const [isStartingCall, setIsStartingCall] = useState(false);

  const startSynthflowCall = async () => {
    setIsStartingCall(true);
    
    // Get form_id from localStorage if available
    const storedFormId = localStorage.getItem("form_id") || "test_form_id_" + Date.now();
    
    // Get form data from localStorage if available
    const storedFormData = localStorage.getItem("vouchForm");
    let formData = null;
    if (storedFormData) {
      try {
        formData = JSON.parse(storedFormData);
      } catch (error) {
        console.error("Error parsing stored form data:", error);
      }
    }

    const callParams = {
      agent_id: "63e56c5a-2a00-447a-906a-131e89aa7ccd", // SynthFlow agent ID
      phone_number: "+447123456789", // replace with the voucher's phone number
      first_name: formData?.voucherFirst || "Patrick", // dynamic, from your form
      vouchee_name: formData ? `${formData.voucheeFirst} ${formData.voucheeLast}` : "Tim Greene", // dynamic, from your form
      form_id: storedFormId, // the unique form_id stored earlier
    };

    try {
      const response = await fetch("https://api.synthflow.ai/v1/calls", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer FlT1-eljHprcbqvlL5AeHQDkm-MaWPTvIF-YURu0aF0", // SynthFlow API key
        },
        body: JSON.stringify(callParams),
      });

      if (!response.ok) throw new Error("Call initiation failed");
      
      const data = await response.json();
      console.log("Call started:", data);
      alert("Call started successfully!");
    } catch (error) {
      console.error("Error starting call:", error);
      alert("Failed to start call.");
    } finally {
      setIsStartingCall(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Test Page Content */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center font-sans">
            SynthFlow Test
          </h2>
          
          <div className="text-center space-y-6">
            <p className="text-gray-600">
              Click the button below to initiate a SynthFlow call with the stored form data.
            </p>

            <Button
              onClick={startSynthflowCall}
              disabled={isStartingCall}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingCall ? "Starting Call..." : "Start Call"}
            </Button>
          </div>
        </div>
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-6 left-6">
        <Link to="/">
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
