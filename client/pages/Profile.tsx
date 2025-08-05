import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, FileText, Calendar, User } from "lucide-react";
import { Link } from "react-router-dom";
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
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  // Dummy data for transcripts about me
  const transcriptsAboutMe: Transcript[] = [
    {
      id: "1",
      otherPersonName: "Sarah Johnson",
      otherPersonTitle: "Senior Product Manager",
      preview: "Patrick is an exceptional UX designer who consistently delivers innovative solutions. His attention to detail and user-centered approach...",
      fullTranscript: "Patrick is an exceptional UX designer who consistently delivers innovative solutions. His attention to detail and user-centered approach has transformed our product experience. He has a unique ability to translate complex user needs into intuitive interfaces. During our collaboration on the mobile app redesign, Patrick demonstrated remarkable problem-solving skills and creative thinking. His wireframes and prototypes were not only visually appealing but also highly functional. Patrick is also an excellent collaborator who communicates design decisions clearly and incorporates feedback constructively. I would highly recommend Patrick for any senior UX design role.",
      date: "2024-01-15",
      giver: "Sarah Johnson"
    },
    {
      id: "2",
      otherPersonName: "Michael Chen",
      otherPersonTitle: "Engineering Director",
      preview: "Working with Patrick has been a game-changer for our team. His design systems thinking and technical understanding...",
      fullTranscript: "Working with Patrick has been a game-changer for our team. His design systems thinking and technical understanding make him an invaluable bridge between design and engineering. Patrick doesn't just create beautiful designs; he thinks about implementation, scalability, and maintainability. His component library work has improved our development velocity by 40%. He's also mentored several junior designers on our team, showing great leadership potential. Patrick's strategic thinking about user experience goes beyond individual features to consider the entire user journey.",
      date: "2024-01-08",
      giver: "Michael Chen"
    },
    {
      id: "3",
      otherPersonName: "Emily Rodriguez",
      otherPersonTitle: "Head of Design",
      preview: "Patrick brings both creative vision and practical execution to every project. His portfolio speaks volumes about his growth...",
      fullTranscript: "Patrick brings both creative vision and practical execution to every project. His portfolio speaks volumes about his growth as a designer over the past two years. What sets Patrick apart is his research-driven approach - he always validates design decisions with user testing and data. His presentation skills are outstanding; he can explain complex design rationale to both technical and non-technical stakeholders. Patrick is proactive about staying current with design trends and tools, and he often introduces new methodologies that benefit the entire team.",
      date: "2023-12-22",
      giver: "Emily Rodriguez"
    }
  ];

  // Dummy data for transcripts I've given
  const transcriptsGiven: Transcript[] = [
    {
      id: "4",
      otherPersonName: "Alex Thompson",
      otherPersonTitle: "Frontend Developer",
      preview: "Alex is a talented frontend developer with excellent problem-solving skills. His code quality and attention to performance...",
      fullTranscript: "Alex is a talented frontend developer with excellent problem-solving skills. His code quality and attention to performance optimization are exceptional. During our project collaboration, Alex consistently delivered clean, maintainable code that exceeded expectations. He has a great eye for detail and ensures pixel-perfect implementation of designs. Alex is also very collaborative and provides valuable feedback during design reviews. His understanding of both React and CSS animations helped bring several complex interactions to life.",
      date: "2024-01-10"
    },
    {
      id: "5",
      otherPersonName: "Lisa Wang",
      otherPersonTitle: "Product Designer",
      preview: "Lisa is a rising star in product design with strong analytical skills and creative problem-solving abilities...",
      fullTranscript: "Lisa is a rising star in product design with strong analytical skills and creative problem-solving abilities. She approaches design challenges methodically, always starting with user research and data analysis. Lisa's prototyping skills are impressive, and she's able to quickly iterate on design concepts. Her presentation style is clear and persuasive, making it easy for stakeholders to understand and buy into her design decisions. Lisa is also very coachable and has shown remarkable growth in design systems thinking over the past year.",
      date: "2023-12-28"
    }
  ];

  const toggleTranscript = (id: string) => {
    setExpandedTranscript(expandedTranscript === id ? null : id);
  };

  const TranscriptCard = ({ transcript }: { transcript: Transcript }) => {
    const isExpanded = expandedTranscript === transcript.id;
    
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{transcript.otherPersonName}</h3>
              <p className="text-sm text-gray-600">{transcript.otherPersonTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            {new Date(transcript.date).toLocaleDateString()}
          </div>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 leading-relaxed">
            {isExpanded ? transcript.fullTranscript : transcript.preview}
          </p>
        </div>
        
        {transcript.giver && (
          <div className="mb-3 text-sm text-gray-600">
            <strong>Given by:</strong> {transcript.giver}
          </div>
        )}
        
        <button
          onClick={() => toggleTranscript(transcript.id)}
          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm font-medium transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Read full transcript
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen px-4 py-8 relative"
      style={{ backgroundColor: "#F8F8F8" }}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2F0ae055adc12b40c09e57a54de8259fb8%2F8fb4b55c72c94a0aad03baf47c2b2e9e?format=webp&width=800"
            alt="Vouch Logo"
            className="h-12 md:h-16 object-contain"
          />
        </div>

        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Profile Photo */}
            <div className="flex justify-center md:justify-start">
              <div className="w-24 h-24 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">PG</span>
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Patrick Greene</h1>
              <p className="text-xl text-gray-600 mb-4">Senior UX Designer</p>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Button 
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  LinkedIn
                </Button>
                <Button 
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CV
                </Button>
                <Button 
                  variant="outline"
                  className="border-orange-500 text-orange-600 hover:bg-orange-50"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Portfolio
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("about-me")}
              className={`flex-1 px-6 py-4 text-lg font-semibold transition-colors ${
                activeTab === "about-me"
                  ? "text-orange-600 bg-orange-50 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Transcripts about me ({transcriptsAboutMe.length})
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`flex-1 px-6 py-4 text-lg font-semibold transition-colors ${
                activeTab === "given"
                  ? "text-orange-600 bg-orange-50 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Transcripts I've given ({transcriptsGiven.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "about-me" ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  What others say about me
                </h2>
                {transcriptsAboutMe.map((transcript) => (
                  <TranscriptCard key={transcript.id} transcript={transcript} />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Recommendations I've given
                </h2>
                {transcriptsGiven.map((transcript) => (
                  <TranscriptCard key={transcript.id} transcript={transcript} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Note: Profile section is standalone - no back navigation to main app */}
    </div>
  );
}
