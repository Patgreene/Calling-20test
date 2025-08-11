import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AICall() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const scriptLoadedRef = useRef(false);

  // Get form data from location state
  const formData = location.state?.formData;

  const cleanupWidget = () => {
    if (widgetRef.current) {
      try {
        if (widgetRef.current.remove) {
          widgetRef.current.remove();
        } else if (widgetRef.current.parentNode) {
          widgetRef.current.parentNode.removeChild(widgetRef.current);
        }
        widgetRef.current = null;
      } catch (error) {
        console.error("Error cleaning up widget:", error);
      }
    }
  };

  useEffect(() => {
    if (!formData) return;

    const loadScript = () => {
      if (scriptLoadedRef.current) {
        console.log("Script already loaded, creating widget...");
        if (
          typeof customElements !== "undefined" &&
          customElements.get("elevenlabs-convai")
        ) {
          try {
            createWidget();
          } catch (error) {
            console.error("Error creating widget:", error);
            setIsLoading(false);
          }
        }
        return;
      }

      console.log("Loading ElevenLabs script...");
      setIsLoading(true);

      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;

      script.onload = () => {
        console.log("ElevenLabs script loaded successfully");
        setIsLoading(false);

        // Set up error handling for cases where the widget container is not found
        const checkWidget = () => {
          if (!widgetContainerRef.current) {
            console.error("Widget container not found");
            return;
          }

          if (widgetContainerRef.current && !widgetRef.current) {
            console.log("Creating widget after script load...");
            createWidget();
          }
        };

        // Small delay to ensure DOM is ready
        setTimeout(checkWidget, 100);
      };

      script.onerror = (error) => {
        console.error("Failed to load ElevenLabs script:", error);
        setIsLoading(false);
        if (widgetContainerRef.current && !widgetRef.current) {
          widgetContainerRef.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; background: #f9f9f9; border: 2px dashed #ccc; border-radius: 8px;">
              <div style="text-align: center; color: #666;">
                <div style="font-size: 18px; margin-bottom: 8px;">⚠️</div>
                <div>Failed to load AI assistant</div>
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
        // Check if script is already loaded to prevent double loading
        if (!document.querySelector('script[src*="elevenlabs"]')) {
          document.body.appendChild(script);
        }
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
      };
    };

    loadScript();

    // Handle page unload to cleanup WebSocket connections
    const handleBeforeUnload = () => {
      cleanupWidget();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanupWidget();
    };
  }, [formData]);

  // Check if widget should be created after DOM updates
  useEffect(() => {
    if (
      !isLoading &&
      scriptLoadedRef.current &&
      widgetContainerRef.current &&
      !widgetRef.current
    ) {
      if (
        typeof customElements !== "undefined" &&
        customElements.get("elevenlabs-convai")
      ) {
        if (formData && widgetContainerRef.current) {
          createWidget();
        }
      } else {
        console.log("Custom element not yet defined, waiting...");
        const checkCustomElement = setInterval(() => {
          if (customElements.get("elevenlabs-convai")) {
            clearInterval(checkCustomElement);
            if (formData && widgetContainerRef.current) {
              createWidget();
            }
          }
        }, 100);

        // Cleanup interval after 5 seconds
        setTimeout(() => {
          clearInterval(checkCustomElement);
        }, 5000);

        return () => clearInterval(checkCustomElement);
      }
    }
  }, [isLoading, formData]);

  const createWidget = () => {
    try {
      // Check if the custom element is already defined to prevent double registration
      if (customElements.get("elevenlabs-convai")) {
        console.log(
          "ElevenLabs widget already registered, proceeding with creation...",
        );
      }

      if (!widgetContainerRef.current) {
        console.error("Widget container ref is not available");
        return;
      }

      if (widgetRef.current) {
        console.log("Widget already exists, cleaning up first...");
        cleanupWidget();
      }

      console.log("Creating ElevenLabs widget...");
      const widget = document.createElement("elevenlabs-convai");

      widget.setAttribute("agent-id", "agent_7101k1jdynr4ewv8e9vnxs2fbtew");

      if (formData) {
        const dynamicVariables = {
          voucher_first: formData.voucherFirst || "",
          voucher_last: formData.voucherLast || "",
          voucher_email: formData.voucherEmail || "",
          vouchee_first: formData.voucheeFirst || "",
          vouchee_last: formData.voucheeLast || "",
          form_id: formData.formId || "",
        };

        console.log("Setting dynamic variables:", dynamicVariables);
        widget.setAttribute(
          "dynamic-variables",
          JSON.stringify(dynamicVariables),
        );
      }

      // Clear the container and add the widget
      widgetContainerRef.current.innerHTML = "";
      widgetContainerRef.current.appendChild(widget);
      widgetRef.current = widget;

      console.log("ElevenLabs widget created and appended successfully");
    } catch (error) {
      console.error("Error creating widget:", error);
      setIsLoading(false);

      if (widgetContainerRef.current) {
        widgetContainerRef.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 300px; background: #f9f9f9; border: 2px dashed #ccc; border-radius: 8px;">
            <div style="text-align: center; color: #666;">
              <div style="font-size: 18px; margin-bottom: 8px;">❌</div>
              <div>Widget creation failed</div>
              <div style="font-size: 12px; margin-top: 4px;">Please refresh the page</div>
            </div>
          </div>
        `;
      }
    }
  };

  // Redirect to form if no form data
  if (!formData) {
    return (
      <div
        className="flex items-center justify-center px-4 py-8"
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
            <Button
              variant={null}
              className="!bg-[#FF7A56] hover:!bg-[#f15a33] !text-white"
            >
              Go to Form
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-8 relative pb-32"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      {/* Logo */}
      <div className="flex justify-center mb-8">
        <img
          src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
          alt="Vouch Logo"
          className="h-12 md:h-16 object-contain"
        />
      </div>

      {/* Widget Container - Normal Document Flow */}
      <div className="flex justify-center mb-8">
        {isLoading && (
          <div className="w-[calc(90vw+12px)] sm:w-[560px] h-[372px] sm:h-[420px] border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7FB5C5] mx-auto mb-2"></div>
              <p>Loading AI assistant...</p>
            </div>
          </div>
        )}
        <div
          id="widget-container"
          ref={widgetContainerRef}
          className={`w-[calc(90vw+12px)] sm:w-[560px] h-[372px] sm:h-[420px] overflow-hidden relative ${isLoading ? "hidden" : ""}`}
          style={{
            maxWidth: "calc(90vw + 12px)",
            maxHeight: "372px",
            border: "1px solid transparent",
          }}
        />
      </div>

      {/* Back Button - Bottom Left */}
      <div className="absolute bottom-12 sm:bottom-12 left-6">
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
      <div className="absolute bottom-12 sm:bottom-12 right-6">
        <Link to="/nps" state={{ formData }}>
          <Button
            variant={null}
            className="!bg-[#7FB5C5] hover:!bg-[#4C7B8A] !text-white font-semibold px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            Next
          </Button>
        </Link>
      </div>
    </div>
  );
}
