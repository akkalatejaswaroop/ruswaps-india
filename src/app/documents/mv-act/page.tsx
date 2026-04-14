"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Scale,
  BookOpen,
  FileText,
} from "lucide-react";

interface ActSection {
  section: string;
  title: string;
  content: string;
}

interface ActData {
  id: string;
  name: string;
  shortName: string;
  sections: ActSection[];
}

export default function MVActPage() {
  const router = useRouter();
  const [actData, setActData] = useState<ActData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
      loadActData();
    }
  }, [router]);

  const loadActData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents/acts?type=mv-act");
      const data = await res.json();
      if (data.success) {
        setActData(data.data);
      }
    } catch (err) {
      console.error("Failed to load MV Act data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSections = actData?.sections.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.section.toLowerCase().includes(term) ||
      s.title.toLowerCase().includes(term) ||
      s.content.toLowerCase().includes(term)
    );
  });

  if (!isLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!actData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500">Failed to load data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary">
              <ArrowLeft size={24} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Motor Vehicles Act, 1988</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{actData.sections.length} sections</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Scale className="text-white" size={32} />
            </div>
            <div>
              <h2 className="text-white font-semibold text-xl mb-1">{actData.name}</h2>
              <p className="text-white/80 text-sm">
                The Motor Vehicles Act, 1988 is the central legislation governing road transport in India. 
                It covers vehicle registration, licensing, traffic rules, and accident compensation.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search sections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {filteredSections?.map((section, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedSection(expandedSection === `${index}` ? null : `${index}`)}
                className="w-full p-6 flex items-start justify-between text-left"
              >
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full mb-2">
                    {section.section}
                  </span>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
                </div>
                <div className="ml-4 mt-2">
                  {expandedSection === `${index}` ? (
                    <ChevronUp className="text-gray-400" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-400" size={20} />
                  )}
                </div>
              </button>
              {expandedSection === `${index}` && (
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                    <pre className="whitespace-pre-wrap font-serif text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {section.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredSections?.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No sections found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search term</p>
          </div>
        )}
      </main>
    </div>
  );
}
