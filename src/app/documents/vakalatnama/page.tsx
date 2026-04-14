"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Download,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Search,
  Loader2,
} from "lucide-react";
import jsPDF from "jspdf";

interface VakalatnamaTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  type: string;
}

const templates: VakalatnamaTemplate[] = [
  {
    id: "mv-accident",
    title: "Vakalatnama for Motor Vehicle Accident Claim",
    description: "General vakalatnama for filing motor vehicle accident compensation claims before MACT",
    type: "MACT",
    content: `VAKALATNAMA

I, [Name of Party], son/daughter/wife of [Father's Name], aged about [Age] years, residing at [Full Address], do hereby nominate, constitute and appoint [Advocate's Name], Advocate, to be my true and lawful attorney to appear, act and plead for me in the above noted matter in the Motor Accident Claims Tribunal at [Place] and to do all or any of the following acts, deeds and things:

1. To appear, act and plead in the above said Tribunal or any other Court or forum where the matter may be pending or transferred.

2. To sign, verify and present before the Tribunal or any other authority:
   - Claim petition
   - Documents and papers
   - Affidavits
   - Written statements
   - Rejoinder
   - Counter claims

3. To produce and exhibit before the Tribunal or any other authority:
   - Documents
   - Papers
   - Evidence
   - Witnesses

4. To deposit and receive on my behalf:
   - Award amount
   - Compensation
   - Any other sum

5. To take all proceedings in appeal, revision, review or otherwise against the award/decision.

6. To appoint another Advocate on my behalf if necessary.

7. To do all other acts, deeds and things as may be necessary in the above matter.

The Attorney shall have power to file documents, affix processes and conduct proceedings for and on my behalf and shall be entitled to withdraw the same.

Date: [Date]
Place: [Place]

Signature of Constituent
[Name of Party]

Verified that the contents of this Vakalatnama are true and correct to the best of my knowledge and belief.

Date: [Date]

[Name of Party]
(Party)]

ACCEPTED

I, [Advocate's Name], Advocate, accept the above Vakalatnama and undertake to appear in the matter on behalf of [Party Name].

Date: [Date]

[Advocate's Signature]
[Bar Council Enrollment No.]
[Mobile Number]
[Email Address]`
  },
  {
    id: "ec-claim",
    title: "Vakalatnama for Employee Compensation Claim",
    description: "Vakalatnama for filing claims under Employee's Compensation Act before the Commissioner",
    type: "EC",
    content: `VAKALATNAMA

I, [Name of Workman/Dependent], son/daughter/wife of [Father's Name], aged about [Age] years, residing at [Full Address], do hereby nominate, constitute and appoint [Advocate's Name], Advocate, to be my true and lawful attorney to appear, act and plead for me in the matter of Employee's Compensation Act claim before the Commissioner for Employee's Compensation at [Place].

The matter pertains to:
- Accident Date: [Date of Accident]
- Nature of Injury: [Description]
- Employer: [Employer's Name and Address]
- Compensation Claimed: Rs. [Amount]

I authorize my Advocate to:

1. File claim application under Section 10 of the Employee's Compensation Act, 1923.

2. Sign and verify all documents including:
   - Claim petition
   - Documents and evidence
   - Medical certificates
   - Wage certificates
   - Affidavits

3. Produce evidence and witnesses in support of my claim.

4. Receive the awarded compensation amount.

5. File appeals as may be required against any adverse order.

6. Do all other acts necessary for the conduct of my case.

Date: [Date]
Place: [Place]

Signature of Constituent
[Name of Party]

ACCEPTED

I, [Advocate's Name], Advocate, accept the above Vakalatnama and agree to represent [Party Name] in this matter.

Date: [Date]

[Advocate's Signature]
[Bar Council Enrollment No.]`
  },
  {
    id: "general-mva",
    title: "General MACT Vakalatnama (Detailed)",
    description: "Comprehensive vakalatnama template for Motor Accident Claims Tribunal with all standard clauses",
    type: "MACT",
    content: `COMPREHENSIVE VAKALATNAMA FOR MOTOR ACCIDENT CLAIMS TRIBUNAL

(Under Section 138 of the Motor Vehicles Act, 1988)

KNOW ALL MEN BY THESE PRESENTS:

I, [Full Name of Party], S/o/D/o/W/o [Father/Spouse Name], aged [Age] years, by occupation [Occupation], resident of [Complete Residential Address], do hereby irrevocably nominate, constitute and appoint [Advocate Full Name], Advocate, Mobile: [Number], Email: [Email], Enrolment No.: [Bar Council No.], to be my lawful Attorney, Guardian and Representative in the matter of:

Case Type: Motor Vehicle Accident Compensation Claim
Incident Date: [Date of Accident]
Incident Place: [Location of Accident]
Claim Amount: Rs. [Amount in Figures] ([Amount in Words] Rupees Only)

APPOINTMENT AND AUTHORITY:

I hereby authorize and empower my said Attorney to:

1. FILING AND PLEADING:
   - To file claim petition under Section 166 of the Motor Vehicles Act, 1988
   - To sign, verify and present all documents
   - To appear, act and plead before the Motor Accident Claims Tribunal (MACT) or any other competent authority
   - To conduct examination-in-chief and cross-examination
   - To file written statements, rejoinders and additional documents

2. EVIDENCE AND DOCUMENTS:
   - To produce, exhibit and get admitted all documents
   - To produce and examine witnesses
   - To get medical records and reports admitted
   - To obtain copies of police records and charge sheet
   - To obtain insurance policy details

3. FINANCIAL MATTERS:
   - To receive on my behalf the entire award/compensation amount
   - To execute receipts and discharges
   - To file for execution of award if required
   - To receive interest amounts

4. APPEALS AND REVIEW:
   - To file appeals under Section 173 of the Motor Vehicles Act
   - To file review petitions if required
   - To file writ petitions before High Court if necessary
   - To engage and instruct other advocates if required

5. GENERAL:
   - To do all acts, deeds and things necessary for the conduct of my case
   - To sign vakalatnama on my behalf in any court
   - To appoint substitute advocate if required
   - To receive all communications

UNDERTAKING:

I undertake that all acts done by my said Attorney in connection with this matter shall be binding on me.

Date: [Date in DD/MM/YYYY]
Place: [City]

_______________________
Signature of Constituent
[Full Name in Block Letters]

Address: [As above]

VERIFICATION:

I, [Name], the above named constituent, do hereby verify that the contents of this Vakalatnama are true and correct to the best of my knowledge and belief and nothing material has been concealed.

Verified at [Place] on this [Date] day of [Month], [Year].

_______________________
Signature of Constituent

---

ACCEPTANCE BY ADVOCATE

I, [Advocate Name], Advocate, S/o [Father's Name], do hereby accept the above Vakalatnama and undertake to appear in this matter on behalf of the constituent and to conduct the same competently and diligently.

Date: [Date]

_______________________
[Advocate's Full Signature]

Address: [Chamber Address]
Mobile: [Number]
Email: [Email]
Bar Enrolment No.: [Number]`
  }
];

export default function VakalatnamaPage() {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<VakalatnamaTemplate | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  const filteredTemplates = templates.filter(t => {
    const matchesSearch = !searchTerm || 
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || t.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleCopy = async () => {
    if (selectedTemplate) {
      try {
        await navigator.clipboard.writeText(selectedTemplate.content);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  const generatePDF = () => {
    if (!selectedTemplate) return;
    
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    const lines = selectedTemplate.content.split("\n");
    let y = 20;
    
    lines.forEach((line) => {
      if (y > 280) {
        (doc as unknown as { addPage: () => void }).addPage();
        y = 20;
      }
      doc.text(line, 15, y);
      y += 6;
    });
    
    doc.save(`${selectedTemplate.title.replace(/\s+/g, "_")}.pdf`);
  };

  const handlePrint = () => {
    if (!selectedTemplate) return;
    
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${selectedTemplate.title}</title>
            <style>
              body { font-family: 'Times New Roman', serif; padding: 40px; white-space: pre-wrap; line-height: 1.6; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>${selectedTemplate.content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vakalatnama Templates</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Legal authorization documents for advocates</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-primary to-secondary rounded-2xl p-6 mb-8">
          <h2 className="text-white font-semibold text-lg mb-2">What is Vakalatnama?</h2>
          <p className="text-white/80 text-sm">
            A Vakalatnama is a legal document that authorizes an advocate to represent a client in court. 
            It is a mandatory requirement for filing any case through an advocate. Select a template below 
            and customize it for your specific needs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="MACT">MACT Claims</option>
            <option value="EC">Employee Compensation</option>
          </select>
        </div>

        {selectedTemplate ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedTemplate.title}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{selectedTemplate.description}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                Back to List
              </button>
            </div>
            <div className="p-6">
              <pre className="whitespace-pre-wrap font-serif text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-700 max-h-[500px] overflow-y-auto">
                {selectedTemplate.content}
              </pre>
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {showCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                {showCopied ? "Copied!" : "Copy Text"}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                <Printer size={18} />
                Print
              </button>
              <button
                onClick={generatePDF}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
                  className="w-full p-6 flex items-center justify-between text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                        {template.type}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{template.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
                  </div>
                  <div className="ml-4">
                    {expandedId === template.id ? (
                      <ChevronUp className="text-gray-400" size={20} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={20} />
                    )}
                  </div>
                </button>
                {expandedId === template.id && (
                  <div className="px-6 pb-6">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                      <pre className="whitespace-pre-wrap font-serif text-xs text-gray-600 dark:text-gray-400 max-h-48 overflow-y-auto">
                        {template.content.substring(0, 500)}...
                      </pre>
                    </div>
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                    >
                      <FileText size={18} />
                      View Full Template
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No templates found</h3>
            <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
          </div>
        )}
      </main>
    </div>
  );
}
