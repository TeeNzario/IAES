"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ClipboardList,
  Grid3x3,
  List,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
}

type StatusFilter = "ALL" | ExamListItem["status"];
type SortKey = "newest" | "oldest" | "title" | "questions";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 12;

const statusLabel: Record<ExamListItem["status"], string> = {
  UPCOMING: "ยังไม่เริ่ม",
  ONGOING: "กำลังสอบ",
  ENDED: "เสร็จสิ้น",
};

const statusClass = (s: ExamListItem["status"]) =>
  s === "UPCOMING"
    ? "bg-amber-100 text-amber-700"
    : s === "ONGOING"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-gray-200 text-gray-500";

const formatThaiDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const months = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

export default function ExamSetsListPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!offeringId) return;
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`)
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, [offeringId]);

  // Reset page when filters change.
  useEffect(() => setPage(1), [search, statusFilter, sortKey]);

  const counts = useMemo(() => {
    const c = { ALL: exams.length, UPCOMING: 0, ONGOING: 0, ENDED: 0 };
    for (const e of exams) c[e.status] += 1;
    return c;
  }, [exams]);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = exams.filter(
      (e) =>
        (statusFilter === "ALL" || e.status === statusFilter) &&
        (!q ||
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q)),
    );
    arr = [...arr].sort((a, b) => {
      switch (sortKey) {
        case "newest":
          return (
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          );
        case "oldest":
          return (
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title, "th");
        case "questions":
          return b.question_count - a.question_count;
      }
    });
    return arr;
  }, [exams, search, statusFilter, sortKey]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const pageItems = processed.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Title row */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/exam-bank/${offeringId}`)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#575757] hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-xl font-light text-[#575757]">
                <ClipboardList size={22} />
                ชุดข้อสอบ
                <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-medium text-[#7C5BD9]">
                  {exams.length}
                </span>
              </h1>
            </div>
            <Link
              href={`/exam-bank/${offeringId}/exam-sets/create`}
              className="flex items-center gap-1 rounded-full bg-[#B7A3E3] px-4 py-2 text-sm font-light text-white shadow-sm hover:bg-[#A48FD6]"
            >
              <Plus size={16} />
              สร้างชุดข้อสอบ
            </Link>
          </div>

          {/* Toolbar */}
          <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Status chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["ALL", "ทั้งหมด"],
                    ["UPCOMING", statusLabel.UPCOMING],
                    ["ONGOING", statusLabel.ONGOING],
                    ["ENDED", statusLabel.ENDED],
                  ] as [StatusFilter, string][]
                ).map(([key, label]) => {
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatusFilter(key)}
                      className={`rounded-full px-3 py-1 text-xs cursor-pointer transition-colors ${
                        active
                          ? "bg-[#B7A3E3] text-white"
                          : "bg-[#F4EFFF] text-[#575757] hover:bg-[#E9E0FA]"
                      }`}
                    >
                      {label}
                      <span
                        className={`ml-1.5 ${
                          active ? "opacity-90" : "text-gray-400"
                        }`}
                      >
                        {counts[key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                {/* Sort */}
                <label className="flex items-center gap-1.5 text-xs font-light text-gray-500">
                  เรียง:
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-md bg-[#F4EFFF] px-2 py-1 text-xs text-[#575757] outline-none focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
                  >
                    <option value="newest">ใหม่สุด</option>
                    <option value="oldest">เก่าสุด</option>
                    <option value="title">ชื่อ A→Z</option>
                    <option value="questions">จำนวนข้อมาก→น้อย</option>
                  </select>
                </label>

                {/* View toggle */}
                <div className="flex overflow-hidden rounded-md border border-[#E9E0FA]">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`flex h-7 w-7 items-center justify-center cursor-pointer ${
                      view === "grid"
                        ? "bg-[#B7A3E3] text-white"
                        : "text-[#575757] hover:bg-[#F4EFFF]"
                    }`}
                    aria-label="มุมมองตาราง"
                    title="มุมมองตาราง"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className={`flex h-7 w-7 items-center justify-center cursor-pointer ${
                      view === "list"
                        ? "bg-[#B7A3E3] text-white"
                        : "text-[#575757] hover:bg-[#F4EFFF]"
                    }`}
                    aria-label="มุมมองรายการ"
                    title="มุมมองรายการ"
                  >
                    <List size={14} />
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชุดข้อสอบ"
                    className="w-56 rounded-full bg-[#F4EFFF] px-4 py-1.5 pr-9 text-sm font-light text-[#575757] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#B7A3E3]"
                  />
                  <Search
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          ) : processed.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center">
              <p className="text-sm font-light text-gray-400">
                {exams.length === 0
                  ? "ยังไม่มีชุดข้อสอบ"
                  : "ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไข"}
              </p>
              {exams.length === 0 && (
                <Link
                  href={`/exam-bank/${offeringId}/exam-sets/create`}
                  className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#B7A3E3] px-4 py-2 text-sm font-light text-white hover:bg-[#A48FD6]"
                >
                  <Plus size={16} />
                  สร้างชุดข้อสอบใหม่
                </Link>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageItems.map((e) => (
                <div
                  key={e.course_exams_id}
                  className="flex flex-col rounded-2xl bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="font-medium text-[#575757] line-clamp-2">
                      {e.title}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-3 py-0.5 text-xs ${statusClass(
                        e.status,
                      )}`}
                    >
                      {statusLabel[e.status]}
                    </span>
                  </div>
                  {e.description && (
                    <p className="mb-3 text-xs font-light text-gray-500 line-clamp-2">
                      {e.description}
                    </p>
                  )}
                  <p className="mb-1 text-xs text-gray-400">
                    {e.question_count} ข้อ
                  </p>
                  <p className="mb-4 text-[11px] text-gray-400">
                    {formatThaiDate(e.start_time)} → {formatThaiDate(e.end_time)}
                  </p>
                  <div className="mt-auto flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/exam-bank/${offeringId}/exam-sets/${e.course_exams_id}/edit`,
                        )
                      }
                      className="flex items-center gap-1 rounded-md border border-[#B7A3E3] px-3 py-1 text-xs text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                    >
                      <Pencil size={12} />
                      แก้ไข
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="grid grid-cols-[1fr_120px_140px_180px_80px] items-center bg-[#B7A3E3] px-5 py-3 text-xs font-light text-white">
                <div>ชื่อชุดข้อสอบ</div>
                <div>สถานะ</div>
                <div>จำนวนข้อ</div>
                <div>ช่วงเวลา</div>
                <div className="text-center">จัดการ</div>
              </div>
              <ul className="divide-y divide-[#F4EFFF]">
                {pageItems.map((e) => (
                  <li
                    key={e.course_exams_id}
                    className="grid grid-cols-[1fr_120px_140px_180px_80px] items-center px-5 py-3 text-sm font-light text-[#575757] hover:bg-[#F4EFFF]/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{e.title}</p>
                      {e.description && (
                        <p className="truncate text-xs text-gray-500">
                          {e.description}
                        </p>
                      )}
                    </div>
                    <div>
                      <span
                        className={`inline-block rounded-full px-3 py-0.5 text-xs ${statusClass(
                          e.status,
                        )}`}
                      >
                        {statusLabel[e.status]}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {e.question_count} ข้อ
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatThaiDate(e.start_time)} →{" "}
                      {formatThaiDate(e.end_time)}
                    </div>
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            `/exam-bank/${offeringId}/exam-sets/${e.course_exams_id}/edit`,
                          )
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-[#B7A3E3] text-[#B7A3E3] hover:bg-[#F4EFFF] cursor-pointer"
                        aria-label="แก้ไข"
                        title="แก้ไข"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pagination */}
          {processed.length > 0 && totalPages > 1 && (
            <div className="mt-5 flex items-center justify-between text-xs font-light text-[#575757]">
              <span>
                แสดง {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, processed.length)} จาก{" "}
                {processed.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-md bg-white px-3 py-1 disabled:opacity-40 hover:bg-[#F4EFFF] cursor-pointer"
                >
                  ก่อนหน้า
                </button>
                <span className="px-2">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-md bg-white px-3 py-1 disabled:opacity-40 hover:bg-[#F4EFFF] cursor-pointer"
                >
                  ถัดไป
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </NavBar>
  );
}
