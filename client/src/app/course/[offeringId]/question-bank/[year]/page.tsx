"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, FolderPlus, Inbox, Search } from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import FolderGrid from "@/components/questionBank/FolderGrid";
import FolderCard from "@/components/questionBank/FolderCard";
import AddCard from "@/components/questionBank/AddCard";
import CreateModal from "@/components/questionBank/CreateModal";

interface QuestionCollection {
  question_collection_id: string;
  title: string;
  description: string | null;
}

type EditState = { id: string; title: string; description: string } | null;

export default function QuestionBankYearPage() {
  const router = useRouter();
  const { offeringId, year } = useParams<{
    offeringId: string;
    year: string;
  }>();

  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);

  const baseUrl = `/course-offerings/${offeringId}/question-bank/years/${year}/collections`;

  const loadCollections = useCallback(async () => {
    if (!offeringId || !year) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<QuestionCollection[]>(baseUrl);
      setCollections(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "โหลดข้อมูลไม่สำเร็จ";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [offeringId, year, baseUrl]);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q),
    );
  }, [collections, search]);

  const handleCreate = async (title: string, description?: string) => {
    await apiFetch(baseUrl, {
      method: "POST",
      data: { title, description: description || undefined },
    });
    await loadCollections();
  };

  const handleEdit = async (title: string, description?: string) => {
    if (!editing) return;
    await apiFetch(
      `/course-offerings/${offeringId}/question-bank/collections/${editing.id}`,
      {
        method: "PATCH",
        data: { title, description: description ?? "" },
      },
    );
    await loadCollections();
  };

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push(`/course/${offeringId}/question-bank`)
                }
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
                <Inbox size={22} className="text-[#575757]" />
                คลังคำถาม
                <span className="text-sm font-light text-gray-400">
                  / ปีการศึกษา {year}
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-1 text-sm font-light text-[#B7A3E3] hover:text-[#A48FD6] cursor-pointer"
              >
                <FolderPlus size={16} />
                สร้างชุดคำถาม
              </button>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาคลังคำถาม"
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
              {filtered.map((c) => (
                <FolderCard
                  key={c.question_collection_id}
                  variant="collection"
                  label="ชุดคำถาม"
                  title={c.title}
                  description={c.description}
                  onClick={() =>
                    router.push(
                      `/course/${offeringId}/question-bank/${year}/${c.question_collection_id}`,
                    )
                  }
                  onAction={() =>
                    setEditing({
                      id: c.question_collection_id,
                      title: c.title,
                      description: c.description ?? "",
                    })
                  }
                />
              ))}
              <AddCard onClick={() => setCreateOpen(true)} />
            </FolderGrid>
          )}
        </main>
      </div>

      <CreateModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="สร้างชุดคำถาม"
        inputPlaceholder="ชื่อชุดคำถาม"
        withDescription
        descriptionPlaceholder="คำอธิบาย (ไม่บังคับ)"
        onSubmit={handleCreate}
      />

      <CreateModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="แก้ไขชุดคำถาม"
        inputPlaceholder="ชื่อชุดคำถาม"
        withDescription
        descriptionPlaceholder="คำอธิบาย (ไม่บังคับ)"
        initialValue={editing?.title ?? ""}
        initialDescription={editing?.description ?? ""}
        confirmLabel="บันทึก"
        onSubmit={handleEdit}
      />
    </Navbar>
  );
}
