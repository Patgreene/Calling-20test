import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { X, Mail } from "lucide-react";

export default function Index() {
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    comment: ""
  });
  const quotes = [
    {
      text: '" She has one of the most creative minds I\'ve ever worked with "',
      link: "https://profiles.vouchprofile.com/demo?t=demo-transcript-1&s=329&e=390",
    },
    {
      text: '" Results came from relentless iteration, late-night testing, and a level of ownership that\'s incredibly rare in a contractor. "',
      link: "https://profiles.vouchprofile.com/demo?t=demo-transcript-2&s=818&e=937",
    },
    {
      text: '" What really blew me away, though, was her ability to connect with people. Whether it was a developer, a stakeholder, or a user in a research session "',
      link: "https://profiles.vouchprofile.com/demo?t=demo-transcript-1&s=390&e=538",
    },
  ];

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % quotes.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [quotes.length]);

  const handleContactFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setContactForm({
      ...contactForm,
      [e.target.name]: e.target.value
    });
  };

  const handleContactFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here (could send to API endpoint)
    console.log("Contact form submitted:", contactForm);
    alert("Thank you for your message! We'll get back to you soon.");
    setContactForm({ name: "", email: "", comment: "" });
    setIsContactFormOpen(false);
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
        </h1>

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

          <Link to="/form">
            <Button
              variant={null}
              size="lg"
              className="!bg-[#7FB5C5] hover:!bg-[#4C7B8A] !text-white font-semibold text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto"
            >
              Vouch for someone
            </Button>
          </Link>
        </div>

        {/* Quote Section */}
        <div className="pt-12">
          {/* Text */}
          <div className="flex justify-end pr-8 mb-4">
            <div className="text-[#7FB5C5] text-lg font-semibold transform rotate-3">
              Comments that deserve to be saved!
            </div>
          </div>

          <a
            href={quotes[currentQuoteIndex].link}
            className="group text-center max-w-lg mx-auto block hover:scale-105 transition-transform duration-200"
          >
            <p className="text-xl md:text-2xl text-[#FF7A56] font-semibold italic leading-relaxed hover:text-[#f15a33] transition-all duration-500 h-32 flex items-center justify-center">
              <span className="transition-opacity duration-500 text-center">
                {quotes[currentQuoteIndex].text}
              </span>
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
