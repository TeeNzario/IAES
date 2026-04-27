"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Inbox, FolderPlus, Search } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import FolderGrid from "@/components/questionBank/FolderGrid";
import FolderCard from "@/components/questionBank/FolderCard";
import AddCard from "@/components/questionBank/AddCard";
import CreateModal from "@/components/questionBank/CreateModal";

interface QuestionBankYear {
  question_bank_year_id: string;
  academic_year: number;
  _count?: { question_collections: number };
}

export default function QuestionBankYearsPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [years, setYears] = useState<QuestionBankYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const loadYears = useCallback(async () => {
    if (!offeringId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QuestionBankYear[]>(
        `/course-offerings/${offeringId}/question-bank/years`,
      );
      setYears(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offeringId]);

  useEffect(() => {
    loadYears();
  }, [loadYears]);

  const filteredYears = useMemo(() => {
    const q = search.trim();
    if (!q) return years;
    return years.filter((y) => String(y.academic_year).includes(q));
  }, [years, search]);

  const handleCreate = async (rawValue: string) => {
    const academic_year = parseInt(rawValue, 10);
    if (!Number.isFinite(academic_year)) {
      throw new Error("กรุณากรอกปีการศึกษาเป็นตัวเลข");
    }
    await apiFetch(
      `/course-offerings/${offeringId}/question-bank/years`,
      { method: "POST", data: { academic_year } },
    );
    await loadYears();
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
              <Inbox size={22} className="text-[#575757]" />
              คลังคำถาม
            </h1>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1 text-sm font-light text-[#B7A3E3] hover:text-[#A48FD6] cursor-pointer"
              >
                <FolderPlus size={16} />
                สร้างโฟลเดอร์
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาโฟลเดอร์"
                  className="w-56 rounded-full bg-white px-4 py-2 pr-9 text-sm font-light text-[#575757] placeholder-gray-400 shadow-sm outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                />
                <Search
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
              </div>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <FolderGrid>
              {filteredYears.map((y) => (
                <FolderCard
                  key={y.question_bank_year_id}
                  variant="year"
                  label="ปีการศึกษา"
                  title={String(y.academic_year)}
                  onClick={() =>
                    router.push(
                      `/course/${offeringId}/question-bank/${y.academic_year}`,
                    )
                  }
                  onAction={() =>
                    router.push(
                      `/course/${offeringId}/question-bank/${y.academic_year}`,
                    )
                  }
                />
              ))}
              <AddCard onClick={() => setModalOpen(true)} />
            </FolderGrid>
          )}
        </main>
      </div>

      <CreateModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="สร้างโฟลเดอร์ใหม่"
        inputPlaceholder="ชื่อโฟลเดอร์ (เช่น 2568)"
        onSubmit={handleCreate}
      />
    </Navbar>
  );
}
