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
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Filter,
} from "lucide-react";

interface DictionaryTerm {
  id: string;
  term: string;
  definition: string;
  category?: string;
}

const initialTerms: DictionaryTerm[] = [
  { id: "1", term: "Acquittal", definition: "A judgment of a court that a criminal defendant has not been proven guilty beyond a reasonable doubt.", category: "Criminal Law" },
  { id: "2", term: "Affidavit", definition: "A written statement confirmed by oath or affirmation, for use as evidence in court.", category: "Procedure" },
  { id: "3", term: "Appellant", definition: "The party who appeals a court decision to a higher court.", category: "Procedure" },
  { id: "4", term: "Appellate", definition: "Relating to appeals; a court having power to review decisions of lower courts.", category: "Procedure" },
  { id: "5", term: "Award", definition: "The decision of an arbitrator or commissioner; compensation given by a court for damages.", category: "Compensation" },
  { id: "6", term: "Bail", definition: "Security given for the due appearance of an accused person to appear and answer.", category: "Criminal Law" },
  { id: "7", term: "Burden of Proof", definition: "The obligation to prove one's case in court; lies on the party who asserts.", category: "Evidence" },
  { id: "8", term: "Cause of Action", definition: "The facts that give a person the right to sue another.", category: "Civil Law" },
  { id: "9", term: "Claim", definition: "A demand for money or property; the basis of a lawsuit.", category: "Civil Law" },
  { id: "10", term: "Compensation", definition: "Money paid by way of reparation for loss or injury.", category: "Compensation" },
  { id: "11", term: "Contempt of Court", definition: "Willful disobedience of a judge's command or official process.", category: "Procedure" },
  { id: "12", term: "Cross-Examination", definition: "The questioning of a witness by the opposing side after direct examination.", category: "Evidence" },
  { id: "13", term: "Damages", definition: "Money awarded to a party for loss or injury caused by another's conduct.", category: "Compensation" },
  { id: "14", term: "Decree", definition: "A formal and authoritative order; final judgment in equity cases.", category: "Procedure" },
  { id: "15", term: "Defendant", definition: "The person against whom a lawsuit is brought; the accused in a criminal case.", category: "Procedure" },
  { id: "16", term: "Deponent", definition: "A person who makes a deposition by giving sworn evidence.", category: "Evidence" },
  { id: "17", term: "Deposition", definition: "Sworn testimony taken outside court for use at trial.", category: "Evidence" },
  { id: "18", term: "Disbursement", definition: "Money paid out; expenses incurred in conducting a case.", category: "Procedure" },
  { id: "19", term: "Discovery", definition: "Pre-trial procedures to obtain evidence from opposing party.", category: "Procedure" },
  { id: "20", term: "District Court", definition: "A court having jurisdiction over civil and criminal matters in a district.", category: "Courts" },
  { id: "21", term: "Doctrine of Res Judicata", definition: "A matter already judged cannot be relitigated between the same parties.", category: "Civil Law" },
  { id: "22", term: "Due Process", definition: "Fair treatment through the normal judicial system.", category: "Constitutional" },
  { id: "23", term: "Enhancement", definition: "Increase in the amount of compensation awarded.", category: "Compensation" },
  { id: "24", term: "Estoppel", definition: "A rule that prevents someone from arguing something contrary to previous position.", category: "Civil Law" },
  { id: "25", term: "Ex Parte", definition: "Proceedings brought by one party without notice to the other.", category: "Procedure" },
  { id: "26", term: "Examination-in-Chief", definition: "The first questioning of a witness by the party who called them.", category: "Evidence" },
  { id: "27", term: "Execute", definition: "To carry out a court order; to sign a document properly.", category: "Procedure" },
  { id: "28", term: "Executor", definition: "A person named in a will to carry out its provisions.", category: "Property" },
  { id: "29", term: "Filing", definition: "The act of submitting documents to a court.", category: "Procedure" },
  { id: "30", term: "First Information Report (FIR)", definition: "The first report of a cognizable offense to the police.", category: "Criminal Law" },
  { id: "31", term: "Garnishee", definition: "A third party who holds money or property belonging to a judgment debtor.", category: "Civil Law" },
  { id: "32", term: "Grievous Hurt", definition: "Serious physical injury including emasculation, permanent loss of limbs, etc.", category: "Criminal Law" },
  { id: "33", term: "Grounds of Appeal", definition: "Legal reasons for challenging a lower court's decision.", category: "Procedure" },
  { id: "34", term: "High Court", definition: "The highest court of a state having original and appellate jurisdiction.", category: "Courts" },
  { id: "35", term: "Husbandry", definition: "Work done on farmland; care and management of property.", category: "Property" },
  { id: "36", term: "Implead", definition: "To make a person a party to a lawsuit.", category: "Procedure" },
  { id: "37", term: "In Camera", definition: "Proceedings held in private, in the judge's chambers.", category: "Procedure" },
  { id: "38", term: "Injunction", definition: "A court order requiring a party to do or refrain from doing something.", category: "Civil Law" },
  { id: "39", term: "Interest", definition: "Additional amount payable on a debt or claim as compensation for delay.", category: "Compensation" },
  { id: "40", term: "Interlocutory", definition: "A provisional order during pendency of a case.", category: "Procedure" },
  { id: "41", term: "Interrogatories", definition: "Written questions submitted to the opposing party for sworn answers.", category: "Evidence" },
  { id: "42", term: "Judgment", definition: "The official decision of a court resolving a dispute.", category: "Procedure" },
  { id: "43", term: "Jurisdiction", definition: "The authority of a court to hear and decide a case.", category: "Procedure" },
  { id: "44", term: "Jurisprudence", definition: "The science or philosophy of law.", category: "General" },
  { id: "45", term: "Laches", definition: "Unreasonable delay in asserting a legal right.", category: "Civil Law" },
  { id: "46", term: "Landmark Judgment", definition: "A court decision that establishes an important legal precedent.", category: "General" },
  { id: "47", term: "Legal Heir", definition: "A person entitled to inherit property under law of succession.", category: "Property" },
  { id: "48", term: "Letter of Administration", definition: "Authority granted by court to administer the estate of a deceased person.", category: "Property" },
  { id: "49", term: "Lien", definition: "A right to keep possession of property until a debt is paid.", category: "Property" },
  { id: "50", term: "Limitation Period", definition: "The time within which a lawsuit must be filed.", category: "Procedure" },
  { id: "51", term: "Litigant", definition: "A party to a lawsuit.", category: "Procedure" },
  { id: "52", term: "Litigation", definition: "The process of taking legal action through the court system.", category: "Procedure" },
  { id: "53", term: "Locus Standi", definition: "The right to appear and be heard in a court proceeding.", category: "Procedure" },
  { id: "54", term: "MACT", definition: "Motor Accident Claims Tribunal - Special court for accident compensation claims.", category: "Courts" },
  { id: "55", term: "Mesne Profits", definition: "Profits received from property that should have been paid to another.", category: "Property" },
  { id: "56", term: "Motor Vehicles Act", definition: "Central legislation governing motor vehicles, insurance, and accident claims.", category: "Statutes" },
  { id: "57", term: "Negligence", definition: "Failure to exercise reasonable care resulting in damage to another.", category: "Civil Law" },
  { id: "58", term: "Next Friend", definition: "A person who acts on behalf of a minor or incapacitated person.", category: "Procedure" },
  { id: "59", term: "Nuisance", definition: "An unlawful interference with the use and enjoyment of land.", category: "Civil Law" },
  { id: "60", term: "Null and Void", definition: "Of no legal force or effect.", category: "General" },
  { id: "61", term: "Obiter Dicta", definition: "Remarks made by a judge that are not essential to the decision.", category: "Procedure" },
  { id: "62", term: "Party", definition: "A person involved in a lawsuit as plaintiff or defendant.", category: "Procedure" },
  { id: "63", term: "Petition", definition: "A formal written request to a court seeking relief.", category: "Procedure" },
  { id: "64", term: "Petitioner", definition: "The person who files a petition seeking court action.", category: "Procedure" },
  { id: "65", term: "Pleader", definition: "An advocate or lawyer.", category: "General" },
  { id: "66", term: "Power of Attorney", definition: "Document authorizing another to act on one's behalf.", category: "General" },
  { id: "67", term: "Practice Court", definition: "Court where law students practice advocacy.", category: "Courts" },
  { id: "68", term: "Presumption", definition: "An assumption of fact that the law requires to be made.", category: "Evidence" },
  { id: "69", term: "Prima Facie", definition: "At first sight; evidence sufficient to establish a fact unless rebutted.", category: "Evidence" },
  { id: "70", term: "Principal", definition: "The main amount of money borrowed or invested, excluding interest.", category: "General" },
  { id: "71", term: "Pro Bono", definition: "Legal work done without charge for the public good.", category: "General" },
  { id: "72", term: "Probate", definition: "The process of proving the validity of a will.", category: "Property" },
  { id: "73", term: "Procedure", definition: "The rules governing the conduct of legal proceedings.", category: "General" },
  { id: "74", term: "Proceeds", definition: "Money obtained from the sale of property.", category: "General" },
  { id: "75", term: "Prosecution", definition: "The institution and conduct of criminal proceedings.", category: "Criminal Law" },
  { id: "76", term: "Plaintiff", definition: "The person who brings a lawsuit against another.", category: "Procedure" },
  { id: "77", term: "Receiver", definition: "Person appointed by court to manage property in dispute.", category: "Procedure" },
  { id: "78", term: "Recognizance", definition: "An obligation recorded in court to fulfill a promise.", category: "Criminal Law" },
  { id: "79", term: "Redress", definition: "Remedy or relief for a wrong or injury.", category: "Civil Law" },
  { id: "80", term: "Respondent", definition: "The party against whom an appeal or petition is filed.", category: "Procedure" },
  { id: "81", term: "Restitution", definition: "Restoration of something to its proper owner; compensation.", category: "Civil Law" },
  { id: "82", term: "Revenue Court", definition: "Court dealing with land revenue matters.", category: "Courts" },
  { id: "83", term: "Right of Appeal", definition: "The legal right to challenge a court's decision in a higher court.", category: "Procedure" },
  { id: "84", term: "Right to Information", definition: "Citizen's right to obtain information from public authorities.", category: "Constitutional" },
  { id: "85", term: "Schedule", definition: "A document appended to an act listing details, rates, or forms.", category: "Statutes" },
  { id: "86", term: "Section", definition: "A subdivision of an Act of Parliament.", category: "Statutes" },
  { id: "87", term: "Service of Summons", definition: "The formal delivery of a court summons to a defendant.", category: "Procedure" },
  { id: "88", term: "Small Causes Court", definition: "Court dealing with civil disputes of a minor nature.", category: "Courts" },
  { id: "89", term: "Specific Relief", definition: "Remedy for enforcing rights, including specific performance.", category: "Civil Law" },
  { id: "90", term: "Stay of Execution", definition: "An order halting the enforcement of a court judgment.", category: "Procedure" },
  { id: "91", term: "Subpoena", definition: "A court order requiring a person to attend court as a witness.", category: "Evidence" },
  { id: "92", term: "Substantive Law", definition: "Law that establishes rights and obligations.", category: "General" },
  { id: "93", term: "Succession", definition: "The transfer of property upon death.", category: "Property" },
  { id: "94", term: "Summons", definition: "A notice requiring a person to appear in court.", category: "Procedure" },
  { id: "95", term: "Supreme Court", definition: "The highest court in India, having constitutional jurisdiction.", category: "Courts" },
  { id: "96", term: "Testator", definition: "A person who has made a will.", category: "Property" },
  { id: "97", term: "Third Party", definition: "A person not directly involved in a lawsuit.", category: "Procedure" },
  { id: "98", term: "Tort", definition: "A civil wrong causing harm or loss (other than contract).", category: "Civil Law" },
  { id: "99", term: "Trespass", definition: "Unauthorized entry onto another's property.", category: "Civil Law" },
  { id: "100", term: "Trust", definition: "A relationship where property is held for the benefit of another.", category: "Property" },
  { id: "101", term: "Ultra Vires", definition: "Beyond the legal power or authority of a person or body.", category: "General" },
  { id: "102", term: "Undertaking", definition: "A promise or commitment made to a court.", category: "Procedure" },
  { id: "103", term: "Vakalatnama", definition: "A document authorizing an advocate to act for a client.", category: "Procedure" },
  { id: "104", term: "Verdict", definition: "The decision of a jury or judge on a question of fact.", category: "Procedure" },
  { id: "105", term: "Vicarious Liability", definition: "Liability imposed on one person for the acts of another.", category: "Civil Law" },
  { id: "106", term: "Voir Dire", definition: "A preliminary examination of a witness or juror.", category: "Evidence" },
  { id: "107", term: "Warrant", definition: "A court order authorizing an arrest or search.", category: "Criminal Law" },
  { id: "108", term: "Will", definition: "A legal document specifying how property should be distributed after death.", category: "Property" },
  { id: "109", term: "Winding Up", definition: "The process of dissolving a company.", category: "Corporate" },
  { id: "110", term: "Without Prejudice", definition: "A statement made without affecting legal rights.", category: "Procedure" },
  { id: "111", term: "Witness", definition: "A person who gives evidence in a case.", category: "Evidence" },
  { id: "112", term: "Workmen's Compensation", definition: "Payment to workers for injuries sustained in employment.", category: "Statutes" },
  { id: "113", term: "Wrongful Act", definition: "An act that violates the law or a person's rights.", category: "Civil Law" },
  { id: "114", term: "Zonal Plan", definition: "A plan dividing a city into zones for development control.", category: "Property" },
];

export default function DictionaryPage() {
  const router = useRouter();
  const [terms, setTerms] = useState<DictionaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTerm, setNewTerm] = useState({ term: "", definition: "", category: "" });

  const categories = [...new Set(initialTerms.map(t => t.category).filter(Boolean))].sort();

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
      loadDictionary();
    }
  }, [router]);

  const loadDictionary = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents/dictionary");
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setTerms(data.data);
      } else {
        setTerms(initialTerms);
      }
    } catch (err) {
      console.error("Failed to load dictionary:", err);
      setTerms(initialTerms);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = async () => {
    if (!newTerm.term || !newTerm.definition) return;
    
    try {
      const res = await fetch("/api/documents/dictionary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTerm),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setTerms([data.data, ...terms]);
        setShowAddModal(false);
        setNewTerm({ term: "", definition: "", category: "" });
      }
    } catch (err) {
      console.error("Failed to add term:", err);
    }
  };

  const filteredTerms = terms.filter(term => {
    const matchesSearch = !searchTerm || 
      term.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      term.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || term.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Legal Dictionary</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{terms.length} legal terms and definitions</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              <Plus size={18} />
              Add Term
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search legal terms..."
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
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          {filteredTerms.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No terms found</h3>
              <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredTerms.map((term) => (
                <div key={term.id}>
                  <button
                    onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                    className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{term.term}</h3>
                        {term.category && (
                          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                            {term.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{term.definition}</p>
                    </div>
                    <div className="ml-4">
                      {expandedTerm === term.id ? (
                        <ChevronUp className="text-gray-400" size={20} />
                      ) : (
                        <ChevronDown className="text-gray-400" size={20} />
                      )}
                    </div>
                  </button>
                  {expandedTerm === term.id && (
                    <div className="px-6 pb-6 pt-0">
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{term.definition}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredTerms.length} of {terms.length} terms
        </div>
      </main>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Term</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term</label>
                <input
                  type="text"
                  value={newTerm.term}
                  onChange={(e) => setNewTerm({...newTerm, term: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., Vakalatnama"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definition</label>
                <textarea
                  value={newTerm.definition}
                  onChange={(e) => setNewTerm({...newTerm, definition: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  rows={4}
                  placeholder="Enter the definition..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category (Optional)</label>
                <select
                  value={newTerm.category}
                  onChange={(e) => setNewTerm({...newTerm, category: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
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
                onClick={handleAddTerm}
                disabled={!newTerm.term || !newTerm.definition}
                className="flex-1 py-3 bg-primary text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
              >
                <Check size={18} className="mr-2" />
                Add Term
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
