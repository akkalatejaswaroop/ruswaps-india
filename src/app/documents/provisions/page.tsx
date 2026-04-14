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
  Shield,
  Filter,
  BookOpen,
  Scale,
} from "lucide-react";

interface Provision {
  id: string;
  act: string;
  section: string;
  title: string;
  description: string;
  content: string;
  relevance: string;
}

export default function ProvisionsPage() {
  const router = useRouter();
  const [provisions, setProvisions] = useState<Provision[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAct, setSelectedAct] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
      loadProvisions();
    }
  }, [router]);

  const loadProvisions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents/provisions");
      const data = await res.json();
      if (data.success) {
        setProvisions(data.data);
      }
    } catch (err) {
      console.error("Failed to load provisions:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProvisions = provisions.filter(p => {
    const matchesSearch = !searchTerm || 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.section.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAct = selectedAct === "all" || p.act === selectedAct;
    return matchesSearch && matchesAct;
  });

  const mvaProvisions = provisions.filter(p => p.act === "Motor Vehicles Act");
  const ecProvisions = provisions.filter(p => p.act === "Employee Compensation Act");

  if (!isLoggedIn || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
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
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Provisions in Accident Claims</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{provisions.length} legal provisions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold text-lg mb-2">Understanding Accident Claim Provisions</h2>
          <p className="text-white/80 text-sm">
            These are the key provisions of the Motor Vehicles Act and Employee Compensation Act that govern 
            accident claims in India. Click on any provision to view detailed information.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedAct(selectedAct === "Motor Vehicles Act" ? "all" : "Motor Vehicles Act")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Scale className="text-primary" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Motor Vehicles Act</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{mvaProvisions.length} provisions</p>
              </div>
            </div>
          </div>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition"
            onClick={() => setSelectedAct(selectedAct === "Employee Compensation Act" ? "all" : "Employee Compensation Act")}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Shield className="text-secondary" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Employee Compensation Act</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{ecProvisions.length} provisions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search provisions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select
              value={selectedAct}
              onChange={(e) => setSelectedAct(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
            >
              <option value="all">All Acts</option>
              <option value="Motor Vehicles Act">Motor Vehicles Act</option>
              <option value="Employee Compensation Act">Employee Compensation Act</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {filteredProvisions.map((provision) => (
            <div
              key={provision.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === provision.id ? null : provision.id)}
                className="w-full p-6 flex items-start justify-between text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      provision.act === "Motor Vehicles Act" 
                        ? "bg-primary/10 text-primary" 
                        : "bg-secondary/10 text-secondary"
                    }`}>
                      {provision.section}
                    </span>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                      {provision.act}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{provision.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{provision.description}</p>
                  <div className="mt-2">
                    <span className="text-xs text-gray-400 dark:text-gray-500">Relevance: {provision.relevance}</span>
                  </div>
                </div>
                <div className="ml-4 mt-2">
                  {expandedId === provision.id ? (
                    <ChevronUp className="text-gray-400" size={20} />
                  ) : (
                    <ChevronDown className="text-gray-400" size={20} />
                  )}
                </div>
              </button>
              {expandedId === provision.id && (
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                    <pre className="whitespace-pre-wrap font-serif text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {provision.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredProvisions.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No provisions found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
          </div>
        )}
      </main>
    </div>
  );
}
