import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, Check, X, ArrowLeft } from "lucide-react";

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
        alert(
          "Camera access is not supported on this device. Please use the upload option instead.",
        );
        return;
      }

      // Show user that we're requesting camera permission
      console.log("Requesting camera permission...");

      // Request camera access with better mobile support
      const constraints = {
        video: {
          facingMode: "environment", // Prefer back camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (backCameraError) {
        // If back camera fails, try front camera
        console.log("Back camera failed, trying front camera...");
        const frontConstraints = {
          video: {
            facingMode: "user", // Front camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
        stream = await navigator.mediaDevices.getUserMedia(frontConstraints);
      }

      console.log("Camera permission granted, setting up camera...");

      // Create a modal/overlay for the camera view
      const cameraModal = document.createElement("div");
      cameraModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      `;

      // Create video element
      const video = document.createElement("video");
      video.style.cssText = `
        width: 90%;
        max-width: 400px;
        height: auto;
        border-radius: 12px;
        margin-bottom: 20px;
      `;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true"); // Important for iOS
      video.setAttribute("autoplay", "true");
      video.setAttribute("muted", "true");

      // Create capture button
      const captureBtn = document.createElement("button");
      captureBtn.textContent = "Capture Photo";
      captureBtn.style.cssText = `
        background: #f97316;
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        margin: 10px;
        cursor: pointer;
      `;

      // Create cancel button
      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = `
        background: #6b7280;
        color: white;
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        margin: 10px;
        cursor: pointer;
      `;

      // Add elements to modal
      cameraModal.appendChild(video);
      const buttonContainer = document.createElement("div");
      buttonContainer.appendChild(captureBtn);
      buttonContainer.appendChild(cancelBtn);
      cameraModal.appendChild(buttonContainer);
      document.body.appendChild(cameraModal);

      // Start video
      await video.play();

      // Handle capture button click
      captureBtn.onclick = () => {
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

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(cameraModal);

        console.log("Photo captured successfully");
      };

      // Handle cancel button click
      cancelBtn.onclick = () => {
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(cameraModal);
      };
    } catch (error) {
      console.error("Camera access error:", error);

      let errorMessage = "Could not access camera. ";
      if (error.name === "NotAllowedError") {
        errorMessage +=
          "Camera permission was denied. Please allow camera access and try again.";
      } else if (error.name === "NotFoundError") {
        errorMessage += "No camera found on this device.";
      } else if (error.name === "NotSupportedError") {
        errorMessage += "Camera is not supported on this device.";
      } else {
        errorMessage += "Please try uploading a file instead.";
      }

      alert(errorMessage);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleBack = () => {
    navigate("/summary");
  };

  const handleFinish = () => {
    // Save image to localStorage if uploaded
    if (uploadedImage) {
      localStorage.setItem("vouchID", uploadedImage);
    }

    // Navigate to review page instead of submitting directly
    navigate("/review");
  };

  return (
    <div
      className="min-h-screen px-4 py-8 relative"
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
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
