"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CaseFilters from './_components/CaseFilters';
import CaseTable from './_components/CaseTable';

interface CourtCase {
  id: string;
  cnrNumber: string;
  caseNumber: string;
  caseType: string;
  status: string;
  nextHearingDate: string | null;
  lastHearingDate: string | null;
  petitioner: string;
  respondent: string;
  courtName: string | null;
  districtName: string;
  mandalName: string | null;
}

interface CourtsPageClientProps {
  cases: CourtCase[];
  page: number;
  totalPages: number;
  total: number;
  initialDistrictCode: string;
  initialMandalCode: string;
  initialCaseNumber: string;
  initialCnrNumber: string;
  initialPetitioner: string;
  initialStatus: string;
  initialWatchedCnrs: string[];
}

export default function CourtsPageClient({
  cases: initialCases,
  page: initialPage,
  totalPages: initialTotalPages,
  total: initialTotal,
  initialDistrictCode,
  initialMandalCode,
  initialCaseNumber,
  initialCnrNumber,
  initialPetitioner,
  initialStatus,
  initialWatchedCnrs,
}: CourtsPageClientProps) {
  const router = useRouter();
  const [cases, setCases] = useState<CourtCase[]>(initialCases);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);
  const [watchedCnrs, setWatchedCnrs] = useState<Set<string>>(new Set(initialWatchedCnrs));

  const fetchCases = async (pageNum: number, params: URLSearchParams) => {
    setLoading(true);
    try {
      params.set('page', String(pageNum));
      const res = await fetch(`/api/courts/cases?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setCases(data.data.cases);
        setPage(data.data.page);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch cases:', err);
    }
    setLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (initialDistrictCode) params.set('districtCode', initialDistrictCode);
    if (initialMandalCode) params.set('mandalCode', initialMandalCode);
    if (initialCaseNumber) params.set('caseNumber', initialCaseNumber);
    if (initialCnrNumber) params.set('cnrNumber', initialCnrNumber);
    if (initialPetitioner) params.set('petitioner', initialPetitioner);
    if (initialStatus) params.set('status', initialStatus);
    fetchCases(newPage, params);
  };

  const handleWatchChange = (cnrNumber: string, nowWatching: boolean) => {
    setWatchedCnrs(prev => {
      const next = new Set(prev);
      if (nowWatching) {
        next.add(cnrNumber);
      } else {
        next.delete(cnrNumber);
      }
      return next;
    });
  };

  return (
    <>
      <CaseTable
        cases={cases}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={handlePageChange}
        onWatchChange={handleWatchChange}
        watchedCnrs={watchedCnrs}
      />
    </>
  );
}
