import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export default function AICall() {
  const location = useLocation();
  const formData = location.state?.formData;
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const widgetRef = useRef<HTMLElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load ElevenLabs script
    if (!scriptLoadedRef.current) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";

      script.onload = () => {
        setIsLoading(false);
        // Create widget after script loads
        if (formData && widgetContainerRef.current) {
          createWidget();
        }
      };

      document.body.appendChild(script);
      scriptLoadedRef.current = true;

      return () => {
        // Cleanup widget and script on unmount
        cleanupWidget();
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    } else {
      setIsLoading(false);
      // Create widget immediately if script already loaded
      if (formData && widgetContainerRef.current) {
        createWidget();
      }
    }

    // Add beforeunload cleanup
    const handleBeforeUnload = () => {
      cleanupWidget();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup function for when component unmounts
    return () => {
      cleanupWidget();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData]);

  const createWidget = () => {
    if (!widgetContainerRef.current || !formData) return;

    // Clean up existing widget first
    cleanupWidget();

    // Create ElevenLabs ConvAI widget
    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", "agent_7101k1jdynr4ewv8e9vnxs2fbtew");
    widget.setAttribute(
      "dynamic-variables",
      JSON.stringify({
        voucher_first: formData.voucherFirst,
        voucher_last: formData.voucherLast,
        voucher_email: formData.voucherEmail,
        vouchee_first: formData.voucheeFirst,
        vouchee_last: formData.voucheeLast,
        form_id: formData.formId,
      }),
    );

    widgetContainerRef.current.appendChild(widget);
    widgetRef.current = widget;
  };

  const cleanupWidget = () => {
    if (widgetRef.current) {
      // Try to properly disconnect/cleanup the widget
      try {
        if (typeof (widgetRef.current as any).disconnect === 'function') {
          (widgetRef.current as any).disconnect();
        }
        if (typeof (widgetRef.current as any).destroy === 'function') {
          (widgetRef.current as any).destroy();
        }
      } catch (error) {
        console.log("Widget cleanup method not available");
      }

      // Remove from DOM
      if (widgetRef.current.parentNode) {
        widgetRef.current.parentNode.removeChild(widgetRef.current);
      }
      widgetRef.current = null;
    }

    // Clear container
    if (widgetContainerRef.current) {
      widgetContainerRef.current.innerHTML = "";
    }
  };

  // Redirect to form if no form data
  if (!formData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ backgroundColor: "#F8F8F8" }}
      >
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">
            No form data found
          </h2>
          <p className="text-gray-600">
            Please fill out the form first to start an AI call.
          </p>
          <Link to="/form">
            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
              Go to Form
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="w-full max-w-4xl space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Widget Container */}
        <div className="relative">
          {isLoading && (
            <div className="min-h-[400px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p>Loading AI assistant...</p>
              </div>
            </div>
          )}
          <div
            id="widget-container"
            ref={widgetContainerRef}
            className={`min-h-[400px] rounded-lg ${isLoading ? "hidden" : ""}`}
          />
        </div>
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-6 left-6">
        <Link to="/form">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Form
          </Button>
        </Link>
      </div>

      {/* Next Button - Bottom Right */}
      <div className="absolute bottom-6 right-6">
        <Link to="/edit-summary">
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            Next
          </Button>
        </Link>
      </div>
    </div>
  );
}
