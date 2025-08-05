import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Calendar,
  User,
} from "lucide-react";
import { useState } from "react";

interface Transcript {
  id: string;
  otherPersonName: string;
  otherPersonTitle: string;
  preview: string;
  fullTranscript: string;
  date: string;
  giver?: string; // For "about me" transcripts
}

export default function Profile() {
  const [activeTab, setActiveTab] = useState<"about-me" | "given">("about-me");
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(
    null,
  );

  // Dummy data for transcripts about me
  const transcriptsAboutMe: Transcript[] = [
    {
      id: "1",
      otherPersonName: "Sarah Johnson",
      otherPersonTitle: "Senior Product Manager",
      preview:
        "Patrick is an exceptional UX designer who consistently delivers innovative solutions. His attention to detail and user-centered approach...",
      fullTranscript:
        "Patrick is an exceptional UX designer who consistently delivers innovative solutions. His attention to detail and user-centered approach has transformed our product experience. He has a unique ability to translate complex user needs into intuitive interfaces. During our collaboration on the mobile app redesign, Patrick demonstrated remarkable problem-solving skills and creative thinking. His wireframes and prototypes were not only visually appealing but also highly functional. Patrick is also an excellent collaborator who communicates design decisions clearly and incorporates feedback constructively. I would highly recommend Patrick for any senior UX design role.",
      date: "2024-01-15",
      giver: "Sarah Johnson",
    },
    {
      id: "2",
      otherPersonName: "Michael Chen",
      otherPersonTitle: "Engineering Director",
      preview:
        "Working with Patrick has been a game-changer for our team. His design systems thinking and technical understanding...",
      fullTranscript:
        "Working with Patrick has been a game-changer for our team. His design systems thinking and technical understanding make him an invaluable bridge between design and engineering. Patrick doesn't just create beautiful designs; he thinks about implementation, scalability, and maintainability. His component library work has improved our development velocity by 40%. He's also mentored several junior designers on our team, showing great leadership potential. Patrick's strategic thinking about user experience goes beyond individual features to consider the entire user journey.",
      date: "2024-01-08",
      giver: "Michael Chen",
    },
    {
      id: "3",
      otherPersonName: "Emily Rodriguez",
      otherPersonTitle: "Head of Design",
      preview:
        "Patrick brings both creative vision and practical execution to every project. His portfolio speaks volumes about his growth...",
      fullTranscript:
        "Patrick brings both creative vision and practical execution to every project. His portfolio speaks volumes about his growth as a designer over the past two years. What sets Patrick apart is his research-driven approach - he always validates design decisions with user testing and data. His presentation skills are outstanding; he can explain complex design rationale to both technical and non-technical stakeholders. Patrick is proactive about staying current with design trends and tools, and he often introduces new methodologies that benefit the entire team.",
      date: "2023-12-22",
      giver: "Emily Rodriguez",
    },
  ];

  // Dummy data for transcripts I've given
  const transcriptsGiven: Transcript[] = [
    {
      id: "4",
      otherPersonName: "Alex Thompson",
      otherPersonTitle: "Frontend Developer",
      preview:
        "Alex is a talented frontend developer with excellent problem-solving skills. His code quality and attention to performance...",
      fullTranscript:
        "Alex is a talented frontend developer with excellent problem-solving skills. His code quality and attention to performance optimization are exceptional. During our project collaboration, Alex consistently delivered clean, maintainable code that exceeded expectations. He has a great eye for detail and ensures pixel-perfect implementation of designs. Alex is also very collaborative and provides valuable feedback during design reviews. His understanding of both React and CSS animations helped bring several complex interactions to life.",
      date: "2024-01-10",
    },
    {
      id: "5",
      otherPersonName: "Lisa Wang",
      otherPersonTitle: "Product Designer",
      preview:
        "Lisa is a rising star in product design with strong analytical skills and creative problem-solving abilities...",
      fullTranscript:
        "Lisa is a rising star in product design with strong analytical skills and creative problem-solving abilities. She approaches design challenges methodically, always starting with user research and data analysis. Lisa's prototyping skills are impressive, and she's able to quickly iterate on design concepts. Her presentation style is clear and persuasive, making it easy for stakeholders to understand and buy into her design decisions. Lisa is also very coachable and has shown remarkable growth in design systems thinking over the past year.",
      date: "2023-12-28",
    },
  ];

  const toggleTranscript = (id: string) => {
    setExpandedTranscript(expandedTranscript === id ? null : id);
  };

  const TranscriptCard = ({ transcript }: { transcript: Transcript }) => {
    const isExpanded = expandedTranscript === transcript.id;

    return (
      <div className="bg-gray-50 rounded-lg p-6 mb-4 last:mb-0">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900 text-lg">
                  {transcript.otherPersonName}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {transcript.otherPersonTitle}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Calendar className="w-3 h-3" />
                {new Date(transcript.date).toLocaleDateString()}
              </div>
            </div>

            <div className="mb-4 flex items-start justify-between">
              <p className="text-gray-700 leading-relaxed flex-1 pr-4">
                {isExpanded ? transcript.fullTranscript : transcript.preview}
              </p>
              <button
                onClick={() => toggleTranscript(transcript.id)}
                className="text-orange-500 hover:text-orange-600 transition-colors flex-shrink-0 mt-1"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="mb-16">
          <div className="flex flex-col items-center text-center mb-8">
            {/* Profile Photo */}
            <div className="w-32 h-32 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl font-light text-white">PG</span>
            </div>

            {/* Profile Info */}
            <h1 className="text-4xl font-light text-gray-900 mb-2">
              Patrick Greene
            </h1>
            <p className="text-xl text-gray-500 mb-8">Senior UX Designer</p>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-600 hover:bg-gray-50 font-normal"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-600 hover:bg-gray-50 font-normal"
              >
                <FileText className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-600 hover:bg-gray-50 font-normal"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Portfolio
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-12">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-100 mb-8">
            <button
              onClick={() => setActiveTab("about-me")}
              className={`pb-4 px-1 text-lg font-light transition-colors relative ${
                activeTab === "about-me"
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              About me
              {activeTab === "about-me" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`pb-4 px-1 ml-12 text-lg font-light transition-colors relative ${
                activeTab === "given"
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Given by me
              {activeTab === "given" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === "about-me" ? (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-light text-gray-900 mb-2">
                    Recommendations
                  </h2>
                  <p className="text-gray-500 text-sm">
                    What others say about working with me
                  </p>
                </div>
                <div>
                  {transcriptsAboutMe.map((transcript) => (
                    <TranscriptCard
                      key={transcript.id}
                      transcript={transcript}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-light text-gray-900 mb-2">
                    My recommendations
                  </h2>
                  <p className="text-gray-500 text-sm">
                    Testimonials I've provided for others
                  </p>
                </div>
                <div>
                  {transcriptsGiven.map((transcript) => (
                    <TranscriptCard
                      key={transcript.id}
                      transcript={transcript}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
