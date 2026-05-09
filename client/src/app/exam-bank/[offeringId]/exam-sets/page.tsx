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
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          {/* Title row */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/exam-bank/${offeringId}`)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#514667] transition-colors hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-lg font-semibold text-[#2F2A3A] sm:text-xl">
                <ClipboardList size={22} className="text-[#7C5BD9]" />
                ชุดข้อสอบ
                <span className="ml-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#7C5BD9]">
                  {exams.length}
                </span>
              </h1>
            </div>
            <Link
              href={`/exam-bank/${offeringId}/exam-sets/create`}
              className="flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6]"
            >
              <Plus size={16} />
              สร้างชุดข้อสอบ
            </Link>
          </div>

          {/* Toolbar */}
          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8]">
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
                      onClick={() => {
                        setStatusFilter(key);
                        setPage(1);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                        active
                          ? "bg-[#B7A3E3] text-white"
                          : "bg-[#F4EFFF] text-[#514667] hover:bg-[#E9E0FA]"
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
                <label className="flex items-center gap-1.5 text-sm font-medium text-[#514667]">
                  เรียง:
                  <select
                    value={sortKey}
                    onChange={(e) => {
                      setSortKey(e.target.value as SortKey);
                      setPage(1);
                    }}
                    className="rounded-xl bg-[#F4EFFF] px-3 py-2 text-xs font-semibold text-[#514667] outline-none focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
                  >
                    <option value="newest">ใหม่สุด</option>
                    <option value="oldest">เก่าสุด</option>
                    <option value="title">ชื่อ A→Z</option>
                    <option value="questions">จำนวนข้อมาก→น้อย</option>
                  </select>
                </label>

                {/* View toggle */}
                <div className="flex overflow-hidden rounded-xl border border-[#E7DDF8]">
                  <button
                    type="button"
                    onClick={() => setView("grid")}
                    className={`flex h-9 w-9 items-center justify-center cursor-pointer transition-colors ${
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
                    className={`flex h-9 w-9 items-center justify-center cursor-pointer transition-colors ${
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
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="ค้นหาชุดข้อสอบ"
                    className="w-64 rounded-xl bg-white px-4 py-3 pr-10 text-sm font-normal text-[#2F2A3A] placeholder:text-[#B7AFC6] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
                  />
                  <Search
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          {loading ? (
            <p className="text-sm font-medium text-[#7A7287]">กำลังโหลด...</p>
          ) : processed.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-[#E7DDF8]">
              <p className="text-sm font-medium text-[#7A7287]">
                {exams.length === 0
                  ? "ยังไม่มีชุดข้อสอบ"
                  : "ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไข"}
              </p>
              {exams.length === 0 && (
                <Link
                  href={`/exam-bank/${offeringId}/exam-sets/create`}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6]"
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
                  className="flex min-h-56 flex-col rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E7DDF8] transition-shadow hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-[#2F2A3A]">
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
                    <p className="mb-3 line-clamp-2 text-sm font-normal leading-6 text-[#7A7287]">
                      {e.description}
                    </p>
                  )}
                  <p className="mb-1 text-xs font-semibold text-[#7C5BD9]">
                    {e.question_count} ข้อ
                  </p>
                  <p className="mb-4 text-xs font-medium text-[#7A7287]">
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
                      className="flex items-center gap-1 rounded-xl border border-[#D9CCF2] px-3 py-1.5 text-xs font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                    >
                      <Pencil size={12} />
                      แก้ไข
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
              <div className="grid grid-cols-[1fr_120px_140px_180px_80px] items-center bg-[#B7A3E3] px-5 py-4 text-sm font-semibold text-white">
                <div>ชื่อชุดข้อสอบ</div>
                <div>สถานะ</div>
                <div>จำนวนข้อ</div>
                <div>ช่วงเวลา</div>
                <div className="text-center">จัดการ</div>
              </div>
              <ul className="divide-y divide-[#EFE8FB]">
                {pageItems.map((e) => (
                  <li
                    key={e.course_exams_id}
                    className="grid grid-cols-[1fr_120px_140px_180px_80px] items-center px-5 py-4 text-sm font-medium text-[#514667] hover:bg-[#FAF8FF]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[#2F2A3A]">{e.title}</p>
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D9CCF2] text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
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
            <div className="mt-5 flex items-center justify-between text-xs font-medium text-[#514667]">
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
                  className="rounded-xl bg-white px-3 py-2 shadow-sm disabled:opacity-40 hover:bg-[#F4EFFF] cursor-pointer"
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
                  className="rounded-xl bg-white px-3 py-2 shadow-sm disabled:opacity-40 hover:bg-[#F4EFFF] cursor-pointer"
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
