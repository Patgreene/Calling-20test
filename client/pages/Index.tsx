import { Button } from "@/components/ui/button";
import { useState } from "react";
import { X, Mail } from "lucide-react";

export default function Index() {
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    comment: "",
  });

  const handleContactFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value,
    });
  };

  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        alert("Thank you for your message! We'll get back to you soon.");
        setContactForm({ name: "", email: "", comment: "" });
        setIsContactFormOpen(false);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || "Failed to send message"}`);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Failed to send message. Please try again.");
    }
  };
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="text-center space-y-8 max-w-2xl">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-16 md:h-20 object-contain"
          />
        </div>

        {/* Hero Heading */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight font-sans">
          Profiles that capture your reputation.
          <br />
        </h1>

        {/* Subheading */}
        <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
          Vouch is a tool that{" "}
          <strong>helps people prove they’re good at what they do</strong>{" "}
          through quick interviews with <span>colleagues and clients</span>.
        </p>

        {/* CTA Buttons */}
        <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <a href="https://profiles.vouchprofile.com/demo">
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-[#7FB5C5] text-[#4C7B8A] hover:bg-[#f0f8fa] font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              View Demo Profile
            </Button>
          </a>
          <a
            href="https://interview.vouchprofile.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              variant={null}
              size="lg"
              className="!bg-[#007BC1] hover:!bg-[#0066A3] !text-white font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Vouch For Someone
            </Button>
          </a>
        </div>
      </div>

      {/* Contact Button - Fixed Position */}
      <button
        onClick={() => setIsContactFormOpen(true)}
        className="fixed bottom-6 right-6 bg-[#7FB5C5] hover:bg-[#4C7B8A] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-10"
      >
        <Mail className="w-5 h-5" />
      </button>

      {/* Contact Form Modal */}
      {isContactFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Contact Us</h2>
              <button
                onClick={() => setIsContactFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleContactFormSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={contactForm.name}
                  onChange={handleContactFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7FB5C5] focus:border-[#7FB5C5]"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={contactForm.email}
                  onChange={handleContactFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7FB5C5] focus:border-[#7FB5C5]"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label
                  htmlFor="comment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Message *
                </label>
                <textarea
                  id="comment"
                  name="comment"
                  required
                  rows={4}
                  value={contactForm.comment}
                  onChange={handleContactFormChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7FB5C5] focus:border-[#7FB5C5] resize-vertical"
                  placeholder="Your message..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsContactFormOpen(false)}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant={null}
                  className="flex-1 !bg-[#7FB5C5] hover:!bg-[#4C7B8A] !text-white"
                >
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
