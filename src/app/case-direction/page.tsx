"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  MapPin,
  Download,
  Bell,
  Edit2,
  Trash2,
  ChevronRight,
  Search,
  Filter
} from 'lucide-react';

export default function CaseDirection() {
  const router = useRouter();
  const [cases, setCases] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [newCase, setNewCase] = useState({
    caseNo: '',
    caseYear: new Date().getFullYear(),
    caseType: 'Motor Vehicle Accident',
    courtName: '',
    hearingDate: '',
    postedFor: '',
    status: 'pending'
  });

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn');
    if (!loggedIn) {
      router.push('/login');
    } else {
      setIsLoggedIn(true);
      loadCases();
    }
  }, [router]);

  const loadCases = () => {
    const savedCases = localStorage.getItem('ruswaps_cases');
    if (savedCases) {
      setCases(JSON.parse(savedCases));
    } else {
      // Demo data
      const demoCases = [
        {
          id: '1',
          caseNo: 'MVA 1234/2024',
          caseYear: 2024,
          caseType: 'Motor Vehicle Accident - Death Claim',
          courtName: 'City Civil Court, Tenali',
          hearingDate: '2024-01-20',
          postedFor: 'Evidence Recording',
          status: 'next_hearing',
          nextHearing: '2024-01-25'
        },
        {
          id: '2',
          caseNo: 'EC 567/2024',
          caseYear: 2024,
          caseType: 'Employee Compensation - Injury',
          courtName: 'Labour Court, Guntur',
          hearingDate: '2024-01-15',
          postedFor: 'Final Arguments',
          status: 'pending'
        }
      ];
      setCases(demoCases);
      localStorage.setItem('ruswaps_cases', JSON.stringify(demoCases));
    }
  };

  const handleAddCase = () => {
    const caseData = {
      ...newCase,
      id: Date.now().toString()
    };
    const updatedCases = [...cases, caseData];
    setCases(updatedCases);
    localStorage.setItem('ruswaps_cases', JSON.stringify(updatedCases));
    setShowAddModal(false);
    setNewCase({
      caseNo: '',
      caseYear: new Date().getFullYear(),
      caseType: 'Motor Vehicle Accident',
      courtName: '',
      hearingDate: '',
      postedFor: '',
      status: 'pending'
    });
  };

  const handleDeleteCase = (id) => {
    if (confirm('Are you sure you want to delete this case?')) {
      const updatedCases = cases.filter(c => c.id !== id);
      setCases(updatedCases);
      localStorage.setItem('ruswaps_cases', JSON.stringify(updatedCases));
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      next_hearing: 'bg-green-100 text-green-700',
      disposed: 'bg-gray-100 text-gray-700'
    };
    const labels = {
      pending: 'Pending',
      next_hearing: 'Next Hearing',
      disposed: 'Disposed'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getDaysUntilHearing = (date) => {
    const today = new Date();
    const hearing = new Date(date);
    const diff = Math.ceil((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Past';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('CASE DIRECTORY REPORT', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 200, 30, { align: 'right' });
    
    const tableData = cases.map(c => [
      c.caseNo,
      c.caseType.substring(0, 20) + '...',
      c.courtName.substring(0, 20) + '...',
      c.hearingDate,
      c.status.replace('_', ' ').toUpperCase()
    ]);
    
    autoTable(doc, {
      startY: 40,
      head: [['Case No', 'Type', 'Court', 'Hearing Date', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [1, 124, 67] }
    });
    
    doc.save('Case_Directory_Report.pdf');
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch = c.caseNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.caseType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.courtName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 text-gray-600 hover:text-primary">
                <ArrowLeft size={24} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Case Direction</h1>
                <p className="text-sm text-gray-500">Manage your cases and hearings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Download size={18} />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                <Plus size={18} />
                <span>Add Case</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input type="text" placeholder="Search cases..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={20} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="next_hearing">Next Hearing</option>
              <option value="disposed">Disposed</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Cases</p>
            <p className="text-2xl font-bold text-gray-900">{cases.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100">
            <p className="text-sm text-yellow-700">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{cases.filter(c => c.status === 'pending').length}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
            <p className="text-sm text-green-700">Next Hearing</p>
            <p className="text-2xl font-bold text-green-700">{cases.filter(c => c.status === 'next_hearing').length}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">Disposed</p>
            <p className="text-2xl font-bold text-gray-700">{cases.filter(c => c.status === 'disposed').length}</p>
          </div>
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No cases found</h3>
              <p className="text-gray-500 mb-4">Add your first case to get started</p>
              <button onClick={() => setShowAddModal(true)} className="px-6 py-2 bg-primary text-white rounded-lg">
                Add Case
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCases.map((c) => (
                <div key={c.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{c.caseNo}</h3>
                        {getStatusBadge(c.status)}
                        {c.hearingDate && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Bell size={14} />
                            {getDaysUntilHearing(c.hearingDate)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{c.caseType}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {c.courtName}
                        </span>
                        {c.hearingDate && (
                          <span className="flex items-center gap-1">
                            <Calendar size={14} /> {c.hearingDate}
                          </span>
                        )}
                        {c.postedFor && (
                          <span>Posted for: {c.postedFor}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-primary">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteCase(c.id)} className="p-2 text-gray-400 hover:text-red-500">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add Case Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Case</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Number</label>
                  <input type="text" value={newCase.caseNo} onChange={(e) => setNewCase({...newCase, caseNo: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input type="number" value={newCase.caseYear} onChange={(e) => setNewCase({...newCase, caseYear: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                <select value={newCase.caseType} onChange={(e) => setNewCase({...newCase, caseType: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option>Motor Vehicle Accident - Death Claim</option>
                  <option>Motor Vehicle Accident - Injury Claim</option>
                  <option>Employee Compensation - Death</option>
                  <option>Employee Compensation - Injury</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Court Name</label>
                <input type="text" value={newCase.courtName} onChange={(e) => setNewCase({...newCase, courtName: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., City Civil Court, Tenali" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hearing Date</label>
                  <input type="date" value={newCase.hearingDate} onChange={(e) => setNewCase({...newCase, hearingDate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={newCase.status} onChange={(e) => setNewCase({...newCase, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="pending">Pending</option>
                    <option value="next_hearing">Next Hearing</option>
                    <option value="disposed">Disposed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posted For</label>
                <input type="text" value={newCase.postedFor} onChange={(e) => setNewCase({...newCase, postedFor: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Evidence Recording" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-3 border border-gray-300 rounded-lg">Cancel</button>
              <button onClick={handleAddCase} className="flex-1 py-3 bg-primary text-white rounded-lg">Add Case</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
