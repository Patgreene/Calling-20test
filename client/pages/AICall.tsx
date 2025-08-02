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
      console.log("Loading ElevenLabs script...");

      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      script.crossOrigin = "anonymous";

      script.onload = () => {
        console.log("ElevenLabs script loaded successfully");
        setIsLoading(false);
        // Create widget after script loads
        if (formData && widgetContainerRef.current) {
          try {
            createWidget();
          } catch (error) {
            console.error("Error creating widget:", error);
            setIsLoading(false);
          }
        }
      };

      script.onerror = (error) => {
        console.error("Error loading ElevenLabs script:", error);
        console.error("Script URL:", script.src);
        setIsLoading(false);

        // Show user-friendly error message
        if (widgetContainerRef.current) {
          widgetContainerRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; background: #f9f9f9; border: 2px dashed #ccc; border-radius: 8px;">
              <div style="text-align: center; color: #666;">
                <div style="font-size: 18px; margin-bottom: 8px;">⚠️</div>
                <div>Unable to load AI assistant</div>
                <div style="font-size: 12px; margin-top: 4px;">Please check your internet connection</div>
              </div>
            </div>
          `;
        }
      };

      // Set a timeout to prevent infinite loading
      const loadTimeout = setTimeout(() => {
        console.error("Script loading timeout");
        setIsLoading(false);
        if (widgetContainerRef.current && !widgetRef.current) {
          widgetContainerRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; background: #f9f9f9; border: 2px dashed #ccc; border-radius: 8px;">
              <div style="text-align: center; color: #666;">
                <div style="font-size: 18px; margin-bottom: 8px;">⏰</div>
                <div>Loading timeout</div>
                <div style="font-size: 12px; margin-top: 4px;">Please refresh the page</div>
              </div>
            </div>
          `;
        }
      }, 10000); // 10 second timeout

      // Clear timeout when script loads
      const originalOnLoad = script.onload;
      script.onload = (e) => {
        clearTimeout(loadTimeout);
        if (originalOnLoad) originalOnLoad.call(script, e);
      };

      const originalOnError = script.onerror;
      script.onerror = (e) => {
        clearTimeout(loadTimeout);
        if (originalOnError) originalOnError.call(script, e);
      };

      try {
        document.body.appendChild(script);
        scriptLoadedRef.current = true;
      } catch (error) {
        clearTimeout(loadTimeout);
        console.error("Error appending script to document:", error);
        setIsLoading(false);
      }

      return () => {
        // Cleanup widget and script on unmount
        console.log("Cleaning up ElevenLabs components...");
        cleanupWidget();
        try {
          if (document.body.contains(script)) {
            document.body.removeChild(script);
            console.log("Script removed from document");
          }
          scriptLoadedRef.current = false;
        } catch (error) {
          console.log("Script already removed or error during cleanup:", error);
        }
      };
    } else {
      console.log("ElevenLabs script already loaded, creating widget...");
      setIsLoading(false);
      // Create widget immediately if script already loaded
      if (formData && widgetContainerRef.current) {
        try {
          // Check if ElevenLabs custom element is defined
          if (typeof customElements !== 'undefined' && customElements.get('elevenlabs-convai')) {
            createWidget();
          } else {
            console.log("ElevenLabs custom element not yet defined, waiting...");
            // Wait a bit and try again
            setTimeout(() => {
              if (formData && widgetContainerRef.current) {
                createWidget();
              }
            }, 1000);
          }
        } catch (error) {
          console.error("Error creating widget:", error);
          setIsLoading(false);
        }
      }
    }

    // Add beforeunload cleanup
    const handleBeforeUnload = () => {
      cleanupWidget();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function for when component unmounts
    return () => {
      cleanupWidget();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [formData]);

  const createWidget = () => {
    try {
      console.log("Creating ElevenLabs widget...");
      console.log("Container ref:", !!widgetContainerRef.current);
      console.log("Form data:", !!formData);

      if (!widgetContainerRef.current || !formData) {
        console.log("Cannot create widget: missing container or form data");
        return;
      }

      // Clean up existing widget first
      cleanupWidget();

      // Check if the custom element is available
      if (typeof customElements === 'undefined' || !customElements.get('elevenlabs-convai')) {
        console.error("ElevenLabs custom element not available");
        setIsLoading(false);
        return;
      }

      // Create ElevenLabs ConvAI widget
      const widget = document.createElement("elevenlabs-convai");
      console.log("Created widget element:", widget);

      widget.setAttribute("agent-id", "agent_7101k1jdynr4ewv8e9vnxs2fbtew");

      try {
        const dynamicVars = {
          voucher_first: formData.voucherFirst,
          voucher_last: formData.voucherLast,
          voucher_email: formData.voucherEmail,
          vouchee_first: formData.voucheeFirst,
          vouchee_last: formData.voucheeLast,
          form_id: formData.formId,
        };
        console.log("Setting dynamic variables:", dynamicVars);

        widget.setAttribute("dynamic-variables", JSON.stringify(dynamicVars));
      } catch (error) {
        console.error("Error setting widget variables:", error);
        return;
      }

      console.log("Appending widget to container...");
      widgetContainerRef.current.appendChild(widget);
      widgetRef.current = widget;
      console.log("Widget created and appended successfully");

      // Add a listener for widget errors
      widget.addEventListener('error', (e) => {
        console.error("Widget error:", e);
      });

    } catch (error) {
      console.error("Error creating widget:", error);
      setIsLoading(false);
    }
  };

  const cleanupWidget = () => {
    try {
      if (widgetRef.current) {
        // Try to properly disconnect/cleanup the widget
        try {
          if (typeof (widgetRef.current as any).disconnect === "function") {
            (widgetRef.current as any).disconnect();
          }
          if (typeof (widgetRef.current as any).destroy === "function") {
            (widgetRef.current as any).destroy();
          }
        } catch (error) {
          console.log("Widget cleanup method not available");
        }

        // Remove from DOM
        try {
          if (widgetRef.current.parentNode) {
            widgetRef.current.parentNode.removeChild(widgetRef.current);
          }
        } catch (error) {
          console.log("Error removing widget from DOM:", error);
        }
        widgetRef.current = null;
      }

      // Clear container
      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = "";
      }
    } catch (error) {
      console.error("Error during widget cleanup:", error);
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
      className="h-screen px-4 py-4 relative overflow-hidden"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="w-full max-w-3xl mx-auto pt-6 space-y-3">
        {/* Logo */}
        <div className="flex justify-center mb-3">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Widget Container */}
        <div className="relative">
          {isLoading && (
            <div className="h-[300px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p>Loading AI assistant...</p>
              </div>
            </div>
          )}
          <div
            id="widget-container"
            ref={widgetContainerRef}
            className={`h-[300px] rounded-lg ${isLoading ? "hidden" : ""}`}
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
        <Link to="/edit-summary" state={{ formData }}>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            Next
          </Button>
        </Link>
      </div>
    </div>
  );
}
