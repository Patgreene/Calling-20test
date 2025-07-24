import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Check, X } from "lucide-react";

export default function Verify() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check if it's an image file
      if (file.type.startsWith("image/")) {
        setFileName(file.name);

        // Create preview URL
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        alert("Please select an image file (.jpg, .png, .heic)");
      }
    }
  };

  const handleTakePhoto = async () => {
    try {
      // Check if camera is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera access is not supported on this device");
        return;
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera if available
      });

      // Create video element to capture photo
      const video = document.createElement("video");
      video.srcObject = stream;
      video.play();

      // Wait for video to load
      video.onloadedmetadata = () => {
        // Create canvas to capture frame
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0);

        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setUploadedImage(dataUrl);
        setFileName("camera-photo.jpg");

        // Stop camera stream
        stream.getTracks().forEach((track) => track.stop());
      };
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Could not access camera. Please try uploading a file instead.");
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);

    try {
      // Save image to localStorage
      if (uploadedImage) {
        localStorage.setItem("vouchID", uploadedImage);
      }

      // 1. Retrieve the following from localStorage:
      const vouchForm = JSON.parse(localStorage.getItem("vouchForm") || "{}");
      const vouchSummary = localStorage.getItem("vouchSummary") || "";
      const vouchID = localStorage.getItem("vouchID") || "";

      // 2. Send a POST request to the specified URL
      const response = await fetch("https://hook.eu2.make.com/your-hook-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vouchForm: vouchForm,
          vouchSummary: vouchSummary,
          vouchID: vouchID,
        }),
      });

      // Check if the request was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 3. If the POST request succeeds, redirect to thank-you
      window.location.href = "/thank-you";
    } catch (error) {
      // 4. If the POST request fails, show alert and log error
      console.error("Error submitting data:", error);
      alert("There was a problem submitting your data. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen px-4 py-8"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="max-w-2xl mx-auto space-y-8">
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
              Verify Your Vouch (Optional)
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">
              You can upload a photo of your ID or take one with your phone.
              This step is optional but helps us confirm authenticity.
            </p>
          </div>

          {/* Upload Section */}
          <div className="space-y-6">
            <Label className="text-lg font-medium text-gray-800">
              Upload ID Photo
            </Label>

            {/* Upload Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex items-center gap-3 px-6 py-4 text-base border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600"
              >
                <Upload className="w-5 h-5" />
                Upload ID Photo
              </Button>

              <Button
                onClick={handleTakePhoto}
                variant="outline"
                className="flex items-center gap-3 px-6 py-4 text-base border-2 border-gray-300 hover:border-orange-500 hover:text-orange-600"
              >
                <Camera className="w-5 h-5" />
                Take Photo
              </Button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Image Preview */}
            {uploadedImage && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      {fileName || "Image uploaded"}
                    </span>
                  </div>
                  <Button
                    onClick={handleRemoveImage}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Thumbnail Preview */}
                <div className="flex justify-center">
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="ID Preview"
                      className="max-w-xs max-h-48 object-contain rounded-lg border border-gray-200 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Finish Button */}
          <div className="flex justify-center pt-6">
            <Button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Finish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
