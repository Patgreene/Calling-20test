import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  FileText,
  Image,
  CheckCircle,
} from "lucide-react";

interface FormData {
  fullName: string;
  yourEmail: string;
  vouchingFor: string;
  theirEmail: string;
}

export default function Review() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [vouchSummary, setVouchSummary] = useState<string>("");
  const [hasIdPhoto, setHasIdPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataComplete, setIsDataComplete] = useState(false);

  useEffect(() => {
    // Load all data from localStorage
    const loadedFormData = localStorage.getItem("vouchForm");
    const loadedSummary = localStorage.getItem("vouchSummary");
    const loadedIdPhoto = localStorage.getItem("vouchID");

    if (loadedFormData) {
      try {
        const parsedFormData = JSON.parse(loadedFormData);
        setFormData(parsedFormData);
      } catch (error) {
        console.error("Error parsing form data:", error);
      }
    }

    if (loadedSummary) {
      setVouchSummary(loadedSummary);
    }

    if (loadedIdPhoto) {
      setHasIdPhoto(true);
    }

    // Check if all required data is present
    if (loadedFormData && loadedSummary) {
      setIsDataComplete(true);
    }
  }, []);

  const handleBack = () => {
    navigate("/verify");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Get all data from localStorage
      const vouchFormData = localStorage.getItem("vouchForm");
      const vouchSummaryData = localStorage.getItem("vouchSummary");
      const vouchIDData = localStorage.getItem("vouchID");

      console.log("Raw localStorage data:", {
        vouchForm: vouchFormData,
        vouchSummary: vouchSummaryData
          ? `${vouchSummaryData.substring(0, 100)}...`
          : "empty",
        vouchID: vouchIDData ? "present" : "not present",
      });

      // Parse and prepare data
      const vouchForm = vouchFormData ? JSON.parse(vouchFormData) : {};
      const vouchSummary = vouchSummaryData || "";
      let vouchIDUrl = "";

      // Validate required data
      if (
        !vouchForm.fullName ||
        !vouchForm.yourEmail ||
        !vouchForm.vouchingFor ||
        !vouchForm.theirEmail
      ) {
        throw new Error("Missing required form data");
      }

      if (!vouchSummary) {
        console.warn(
          "No vouch summary found - this might be expected if user skipped interview",
        );
      }

      // Convert base64 image to URL if present
      if (vouchIDData) {
        console.log("Converting image to URL...");
        try {
          const imageUploadResponse = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              imageData: vouchIDData,
              fileName: `id-${Date.now()}.jpg`,
            }),
          });

          const imageResult = await imageUploadResponse.json();

          if (imageUploadResponse.ok && imageResult.success) {
            vouchIDUrl = imageResult.url;
            console.log("Image uploaded successfully:", vouchIDUrl);
          } else {
            console.error("Image upload failed:", imageResult);
            // Continue with base64 data as fallback
            vouchIDUrl = vouchIDData;
          }
        } catch (imageError) {
          console.error("Error uploading image:", imageError);
          // Continue with base64 data as fallback
          vouchIDUrl = vouchIDData;
        }
      }

      const payload = {
        vouchForm,
        vouchSummary,
        vouchID: vouchIDUrl, // Now contains URL instead of base64
      };

      console.log("Sending payload:", {
        ...payload,
        vouchSummary: payload.vouchSummary
          ? `${payload.vouchSummary.substring(0, 100)}...`
          : "empty",
        vouchID: payload.vouchID ? (payload.vouchID.startsWith('http') ? "URL provided" : "base64 data") : "not present",
      });

      // Send to our serverless API proxy
      const response = await fetch("/api/submit-vouch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log("API response:", responseData);

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${responseData.error || "Unknown error"}`,
        );
      }

      // Redirect to thank-you page
      window.location.href = "/thank-you";
    } catch (error) {
      console.error("Error submitting data:", error);
      alert(
        `There was a problem submitting your data: ${error.message}. Please check the console and try again.`,
      );
      setIsSubmitting(false);
    }
  };

  if (!formData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ backgroundColor: "#F8F8F8" }}
      >
        <div className="text-center">
          <p className="text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8"
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
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 space-y-8">
          {/* Heading */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-sans">
              Review & Confirm
            </h1>
            <p className="text-lg text-gray-600">
              Please review all your information before submitting your vouch.
            </p>
          </div>

          {/* Data Review Cards */}
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">
                <User className="w-5 h-5 text-orange-500" />
                Your Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Full Name
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formData.fullName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Your Email
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formData.yourEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Vouch Information */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">
                <Mail className="w-5 h-5 text-orange-500" />
                Vouch Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Who you're vouching for
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formData.vouchingFor}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">
                    Their Email
                  </label>
                  <p className="text-gray-900 font-medium">
                    {formData.theirEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Audio Summary */}
            {vouchSummary && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-orange-500" />
                  Your Vouch Summary
                </h3>
                <div className="bg-white rounded-lg p-4 border">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {vouchSummary}
                  </p>
                </div>
              </div>
            )}

            {/* ID Verification */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-3">
                <Image className="w-5 h-5 text-orange-500" />
                ID Verification
              </h3>
              <div className="flex items-center gap-3">
                {hasIdPhoto ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-green-700 font-medium">
                      ID photo uploaded
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500">
                    No ID photo uploaded (optional)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6">
            <Button
              onClick={handleBack}
              variant="outline"
              className="flex items-center gap-2 px-6 py-3 text-base border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Edit
            </Button>

            <Button
              onClick={handleSubmit}
              disabled={!isDataComplete || isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Vouch"}
            </Button>
          </div>

          {/* Data Validation Warning */}
          {!isDataComplete && (
            <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                Some required information is missing. Please go back and
                complete all steps.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
