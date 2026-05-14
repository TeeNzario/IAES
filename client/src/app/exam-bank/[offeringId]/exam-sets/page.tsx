"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import NavBar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

const statusLabel: Record<ExamListItem["status"], string> = {
  UPCOMING: "ยังไม่เริ่ม",
  ONGOING: "กำลังสอบ",
  ENDED: "เสร็จสิ้น",
};

const statusClass = (s: ExamListItem["status"]) =>
  s === "UPCOMING"
    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
    : s === "ONGOING"
    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
    : "bg-gray-200 text-gray-600 ring-1 ring-gray-300";

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
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [page, setPage] = useState(1);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<ExamListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchExams = useCallback(() => {
    if (!offeringId) return;
    setLoading(true);
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`)
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoading(false));
  }, [offeringId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiFetch(
        `/course-offerings/${offeringId}/exams/${deleteTarget.course_exams_id}`,
        { method: "DELETE" },
      );
      setDeleteTarget(null);
      fetchExams();
    } catch {
      setDeleteError("ไม่สามารถลบชุดข้อสอบได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const byStatus: Record<ExamListItem["status"], number> = {
      UPCOMING: 0,
      ONGOING: 0,
      ENDED: 0,
    };
    for (const exam of exams) {
      byStatus[exam.status] += 1;
    }

    return {
      totalSets: exams.length,
      byStatus,
    };
  }, [exams]);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = exams.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q),
    );
    return [...arr].sort((a, b) => a.title.localeCompare(b.title, "th"));
  }, [exams, search]);

  const totalPages = Math.max(1, Math.ceil(processed.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageItems = processed.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <NavBar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-4 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/exam-bank/${offeringId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#514667] ring-1 ring-transparent transition-colors hover:bg-[#FAF8FF] hover:ring-[#E7DDF8] cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <h1 className="flex items-center gap-2 text-xl font-semibold text-[#2F2A3A] sm:text-2xl">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <ClipboardList size={22} />
                </span>
                ชุดข้อสอบ
              </h1>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end xl:w-auto">
              <Link
                href={`/exam-bank/${offeringId}/exam-sets/create`}
                className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[#B7A3E3] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6]"
              >
                <Plus size={16} />
                สร้างชุดข้อสอบ
              </Link>
              <div className="relative flex-1 sm:w-80 sm:flex-none lg:w-96">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหาชุดข้อสอบ"
                  className="h-11 w-full rounded-xl bg-[#FAF8FF] px-4 pr-11 text-sm font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3]"
                />
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                />
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E7DDF8] sm:p-5">
            <div className="mb-4 flex items-center gap-2.5 text-sm font-semibold text-[#2F2A3A]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                <BarChart3 size={18} />
              </span>
              <span>สถิติชุดข้อสอบ</span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="ชุดข้อสอบทั้งหมด"
                value={stats.totalSets}
                suffix="ชุด"
              />
              <StatCard
                label={statusLabel.UPCOMING}
                value={stats.byStatus.UPCOMING}
                suffix="ชุด"
                tone="amber"
              />
              <StatCard
                label={statusLabel.ONGOING}
                value={stats.byStatus.ONGOING}
                suffix="ชุด"
                tone="emerald"
              />
              <StatCard
                label={statusLabel.ENDED}
                value={stats.byStatus.ENDED}
                suffix="ชุด"
                tone="sky"
              />
            </div>
          </div>

          {processed.length > 0 && (
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex h-10 w-fit items-center rounded-xl bg-white px-4 text-sm font-medium text-[#514667] shadow-sm ring-1 ring-[#E7DDF8]">
                แสดง {(currentPage - 1) * itemsPerPage + 1}–
                {Math.min(currentPage * itemsPerPage, processed.length)} จาก{" "}
                {processed.length}
              </span>

              <label className="relative block w-full shrink-0 sm:w-44">
                <span className="sr-only">จำนวนแถวต่อหน้า</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded-xl bg-white px-4 pr-10 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      แสดง {size} แถว
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                />
              </label>
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-white px-6 py-6 text-sm font-medium text-[#7A7287] shadow-sm ring-1 ring-[#E7DDF8]">
              กำลังโหลด...
            </div>
          ) : processed.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7DDF8]">
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
          ) : (
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className="grid grid-cols-[minmax(320px,1fr)_120px_100px_210px_100px] items-center bg-[#B7A3E3] px-5 py-4 text-[15px] font-semibold text-white [&>div:nth-child(n+2)]:text-center">
                    <div>ชื่อชุดข้อสอบ</div>
                    <div>สถานะ</div>
                    <div>จำนวนข้อ</div>
                    <div>ช่วงเวลา</div>
                    <div>จัดการ</div>
                  </div>
                  <ul className="divide-y divide-[#EFE8FB]">
                    {pageItems.map((e) => (
                      <li
                        key={e.course_exams_id}
                        className="grid grid-cols-[minmax(320px,1fr)_120px_100px_210px_100px] items-center px-5 py-5 text-[15px] font-medium text-[#514667] hover:bg-[#FAF8FF]"
                      >
                        <div className="min-w-0 pr-5">
                          <p
                            className="line-clamp-2 break-words text-base font-semibold leading-6 text-[#2F2A3A]"
                            title={e.title}
                          >
                            {e.title}
                          </p>
                          <ExamSetDescriptionPreview
                            title={e.title}
                            description={e.description}
                          />
                        </div>
                        <div className="text-center">
                          <span
                            className={`inline-flex min-w-[86px] justify-center rounded-full px-3 py-1 text-sm font-semibold ${statusClass(
                              e.status,
                            )}`}
                          >
                            {statusLabel[e.status]}
                          </span>
                        </div>
                        <div className="text-center text-sm font-semibold text-[#514667]">
                          {e.question_count} ข้อ
                        </div>
                        <div className="text-center text-sm font-medium text-[#7A7287] leading-relaxed">
                          {formatThaiDate(e.start_time)}
                          <br />ถึง{" "}
                          {formatThaiDate(e.end_time)}
                        </div>
                        <div className="flex justify-center">
                          <div className="flex items-center rounded-xl border border-[#E7DDF8] bg-[#FAF8FF] p-1">
                            <button
                              type="button"
                              onClick={() =>
                                router.push(
                                  `/exam-bank/${offeringId}/exam-sets/${e.course_exams_id}/edit`,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7C5BD9] transition-colors hover:bg-white cursor-pointer"
                              aria-label="แก้ไข"
                              title="แก้ไข"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(e)}
                              className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 cursor-pointer"
                              aria-label="ลบ"
                              title="ลบ"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {processed.length > 0 && (
            <div className="mt-4 flex justify-end">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                  aria-label="หน้าก่อนหน้า"
                  title="หน้าก่อนหน้า"
                >
                  <ChevronLeft size={18} strokeWidth={2.4} />
                </button>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm">
                  {currentPage}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                  aria-label="หน้าถัดไป"
                  title="หน้าถัดไป"
                >
                  <ChevronRight size={18} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          )}
        </main>

        <ConfirmModal
          isOpen={deleteTarget !== null}
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null);
              setDeleteError(null);
            }
          }}
          onConfirm={handleDelete}
          title="ลบชุดข้อสอบ"
          message={
            deleteError
              ? deleteError
              : `คุณแน่ใจหรือไม่ว่าต้องการลบชุดข้อสอบ "${deleteTarget?.title ?? ""}"?`
          }
          confirmText={deleteError ? "ลองใหม่" : "ลบ"}
          cancelText="ยกเลิก"
          isLoading={deleting}
          variant={deleteError ? "warning" : "danger"}
        />
      </div>
    </NavBar>
  );
}

function ExamSetDescriptionPreview({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const text = description?.trim() ?? "";
  const shouldTruncate = text.length > 110 || text.split(/\r?\n/).length > 2;

  if (!text) {
    return (
      <p className="mt-1 text-[15px] font-normal text-[#A59CB2]">
        ไม่มีคำอธิบาย
      </p>
    );
  }

  return (
    <div className="mt-2 max-w-4xl rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#7C5BD9]">
          คำอธิบาย
        </span>
        {shouldTruncate && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-sm font-semibold text-[#7C5BD9] shadow-sm ring-1 ring-[#D9CCF2] transition-colors hover:bg-[#F4EFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
            aria-haspopup="dialog"
          >
            อ่านเพิ่มเติม
          </button>
        )}
      </div>

      <p
        className={`break-words text-[13px] font-normal leading-5 text-[#6B617A] sm:text-sm sm:leading-6 ${
          shouldTruncate ? "line-clamp-2" : "whitespace-pre-line"
        }`}
        title={text}
      >
        {text}
      </p>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2A3A]/35 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exam-set-description-dialog-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-left shadow-xl ring-1 ring-[#D9CCF2]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] px-5 py-4">
              <div className="min-w-0">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <ClipboardList size={19} />
                </div>
                <h4
                  id="exam-set-description-dialog-title"
                  className="line-clamp-2 break-words text-lg font-semibold leading-7 text-[#2F2A3A]"
                >
                  {title}
                </h4>
                <p className="mt-1 text-sm font-medium leading-6 text-[#7A7287] sm:text-[15px]">
                  คำอธิบายชุดข้อสอบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF8FF] text-[#7A7287] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] hover:text-[#7C5BD9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
                aria-label="ปิดหน้าต่างคำอธิบายชุดข้อสอบ"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-line break-words rounded-xl bg-[#FAF8FF] p-4 text-sm font-normal leading-7 text-[#514667] ring-1 ring-[#EFE8FB]">
                {text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  tone = "purple",
}: {
  label: string;
  value: number;
  suffix?: string;
  tone?: "purple" | "amber" | "emerald" | "sky";
}) {
  const formattedValue = value.toLocaleString("th-TH", {
    maximumFractionDigits: 1,
  });
  const toneClass = {
    purple: {
      accent: "bg-[#7C5BD9]",
      bg: "bg-[#FAF8FF]",
      ring: "ring-[#E7DDF8]",
      suffix: "text-[#7C5BD9]",
    },
    amber: {
      accent: "bg-amber-400",
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      suffix: "text-amber-700",
    },
    emerald: {
      accent: "bg-emerald-500",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      suffix: "text-emerald-700",
    },
    sky: {
      accent: "bg-sky-500",
      bg: "bg-sky-50",
      ring: "ring-sky-200",
      suffix: "text-sky-700",
    },
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-xl px-4 py-3 ring-1 ${toneClass.bg} ${toneClass.ring}`}
    >
      <span className={`absolute bottom-0 left-0 top-0 w-1 ${toneClass.accent}`} />
      <p className="text-[15px] font-semibold text-[#7A7287]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[#2F2A3A]">
        {formattedValue}
        {suffix && (
          <span className={`ml-1 text-sm font-semibold ${toneClass.suffix}`}>
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}
