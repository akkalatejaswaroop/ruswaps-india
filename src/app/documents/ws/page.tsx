"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Loader2,
  Plus,
  Download,
  FileText,
  Trash2,
  Edit2,
  X,
  Check,
  Upload,
  Filter,
  FolderOpen,
} from "lucide-react";

interface WsDocument {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  category?: string;
  createdAt?: string;
}

const categories = [
  "All Documents",
  "Court Documents",
  "Insurance Forms",
  "Medical Records",
  "Police Records",
  "Witness Statements",
  "Financial Documents",
  "Other"
];

const sampleDocuments: WsDocument[] = [
  {
    id: "1",
    title: "Sample Claim Petition Format",
    description: "Standard format for filing motor accident claim petition before MACT",
    fileUrl: "/documents/sample-claim-petition.pdf",
    category: "Court Documents"
  },
  {
    id: "2",
    title: "Medical Certificate Format",
    description: "Template for medical certificate in accident compensation cases",
    fileUrl: "/documents/medical-certificate.pdf",
    category: "Medical Records"
  },
  {
    id: "3",
    title: "FIR Copy Template",
    description: "Guide for obtaining and submitting FIR copy",
    fileUrl: "/documents/fir-guide.pdf",
    category: "Police Records"
  },
  {
    id: "4",
    title: "Insurance Claim Form",
    description: "Standard third-party insurance claim form",
    fileUrl: "/documents/insurance-claim.pdf",
    category: "Insurance Forms"
  },
  {
    id: "5",
    title: "Wage Certificate Format",
    description: "Employer wage certificate template for income calculation",
    fileUrl: "/documents/wage-certificate.pdf",
    category: "Financial Documents"
  }
];

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (!isValidUrl(trimmed)) return '#';
  return trimmed;
}

export default function WsDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<WsDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Documents");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", description: "", fileUrl: "", category: "" });
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
      loadDocuments();
    }
  }, [router]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents/ws");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setDocuments(data.data);
      } else {
        setDocuments(sampleDocuments);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
      setDocuments(sampleDocuments);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = async () => {
    if (!newDoc.title || !newDoc.fileUrl) return;
    
    try {
      const res = await fetch("/api/documents/ws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setDocuments([data.data, ...documents]);
        setShowAddModal(false);
        setNewDoc({ title: "", description: "", fileUrl: "", category: "" });
      }
    } catch (err) {
      console.error("Failed to add document:", err);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const res = await fetch(`/api/documents/ws?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(documents.filter(d => d.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All Documents" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getFileIcon = (fileUrl: string) => {
    const ext = fileUrl.split(".").pop()?.toLowerCase();
    if (["pdf"].includes(ext || "")) return "PDF";
    if (["doc", "docx"].includes(ext || "")) return "DOC";
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "IMG";
    return "FILE";
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">WS Documents</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{documents.length} documents</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus size={18} />
              Add Document
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold text-lg mb-2">Working Shifts Documents</h2>
          <p className="text-white/80 text-sm">
            Access and manage important legal documents, templates, and forms for your case proceedings. 
            Upload your own documents or use our pre-built templates.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Upload your first document to get started</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Add Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileText className="text-primary" size={24} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                        {getFileIcon(doc.fileUrl)}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{doc.description}</p>
                  )}
                  {doc.category && (
                    <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded mb-3">
                      {doc.category}
                    </span>
                  )}
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <button
                    onClick={() => window.open(doc.fileUrl, "_blank")}
                    className="flex items-center gap-2 text-primary hover:text-primary/80 text-sm font-medium"
                  >
                    <Download size={16} />
                    View/Download
                  </button>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Document</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                <input
                  type="text"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({...newDoc, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="Document title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({...newDoc, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Brief description of the document"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">File URL *</label>
                <input
                  type="url"
                  value={newDoc.fileUrl}
                  onChange={(e) => setNewDoc({...newDoc, fileUrl: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com/document.pdf"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={newDoc.category}
                  onChange={(e) => setNewDoc({...newDoc, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select category</option>
                  {categories.filter(c => c !== "All Documents").map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!newDoc.title || !newDoc.fileUrl}
                className="flex-1 py-3 bg-primary text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
              >
                <Check size={18} className="mr-2" />
                Add Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
