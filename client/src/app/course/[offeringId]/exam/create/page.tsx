"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronLeft,
  ClipboardList,
  Grid3x3,
  List,
  Plus,
  Search,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
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

interface QuestionRef {
  question_id: string;
  sequence_index: number;
}

interface ExamDetail extends ExamListItem {
  questions: QuestionRef[];
}

type StatusFilter = "ALL" | ExamListItem["status"];
type SortKey = "newest" | "oldest" | "title" | "questions";
type ViewMode = "grid" | "list";

const PICKER_PAGE_SIZE = 9;

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

const localToIso = (local: string) => new Date(local).toISOString();

const todayDateString = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Workflow: รายวิชา → สร้างการสอบ → เลือกชุดข้อสอบ → ตั้งเวลาเปิดสอบ.
 * This page is intentionally NOT the same as creating an exam set
 * (which lives under /exam-bank). Here the instructor only schedules
 * an existing set by patching its start/end times.
 */
export default function CreateExamSchedulePage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [pickerView, setPickerView] = useState<ViewMode>("grid");
  const [pickerPage, setPickerPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("11:00");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!offeringId) return;
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams`)
      .then(setExams)
      .catch(() => setExams([]))
      .finally(() => setLoadingList(false));
  }, [offeringId]);

  useEffect(() => setPickerPage(1), [search, statusFilter, sortKey]);

  const examCounts = useMemo(() => {
    const c = { ALL: exams.length, UPCOMING: 0, ONGOING: 0, ENDED: 0 };
    for (const e of exams) c[e.status] += 1;
    return c;
  }, [exams]);

  const processedExams = useMemo(() => {
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

  const pickerTotalPages = Math.max(
    1,
    Math.ceil(processedExams.length / PICKER_PAGE_SIZE),
  );
  const pickerItems = processedExams.slice(
    (pickerPage - 1) * PICKER_PAGE_SIZE,
    pickerPage * PICKER_PAGE_SIZE,
  );

  const filtered = processedExams;

  const errors = useMemo(() => {
    const out: {
      exam?: string;
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    } = {};
    if (!selectedId) out.exam = "กรุณาเลือกชุดข้อสอบ";
    if (!startDate) out.startDate = "กรุณาเลือกวันเปิดสอบ";
    if (!startTime) out.startTime = "กรุณาเลือกเวลาเปิดสอบ";
    if (!endDate) out.endDate = "กรุณาเลือกวันปิดสอบ";
    if (!endTime) out.endTime = "กรุณาเลือกเวลาปิดสอบ";

    const dateOnly = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    if (startDate && startTime) {
      const start = new Date(`${startDate}T${startTime}`);
      if (Number.isNaN(start.getTime())) {
        out.startDate = "รูปแบบวันที่ไม่ถูกต้อง";
        out.startTime = "รูปแบบเวลาไม่ถูกต้อง";
      } else {
        const now = new Date();
        if (dateOnly(start) < dateOnly(now)) {
          out.startDate = "วันเปิดสอบต้องไม่ใช่วันในอดีต";
        } else if (start.getTime() < now.getTime() - 60_000) {
          out.startTime = "เวลาเปิดสอบต้องไม่ใช่เวลาในอดีต";
        }
      }
    }

    if (
      startDate &&
      startTime &&
      endDate &&
      endTime &&
      !out.startDate &&
      !out.startTime
    ) {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      if (Number.isNaN(end.getTime())) {
        out.endDate = "รูปแบบวันที่ไม่ถูกต้อง";
        out.endTime = "รูปแบบเวลาไม่ถูกต้อง";
      } else if (dateOnly(end) < dateOnly(start)) {
        out.endDate = "วันปิดสอบต้องไม่อยู่ก่อนวันเปิดสอบ";
      } else if (end.getTime() <= start.getTime()) {
        out.endTime = "เวลาปิดสอบต้องอยู่หลังเวลาเปิดสอบ";
      }
    }
    return out;
  }, [selectedId, startDate, startTime, endDate, endTime]);

  const isValid = Object.keys(errors).length === 0;
  const selected = exams.find((e) => e.course_exams_id === selectedId) ?? null;

  const handleSubmit = async () => {
    if (!isValid || !selectedId) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const detail = await apiFetch<ExamDetail>(
        `/course-offerings/${offeringId}/exams/${selectedId}`,
      );
      await apiFetch(`/course-offerings/${offeringId}/exams/${selectedId}`, {
        method: "PATCH",
        data: {
          title: detail.title,
          description: detail.description ?? "",
          start_time: localToIso(`${startDate}T${startTime}`),
          end_time: localToIso(`${endDate}T${endTime}`),
          question_ids: [...detail.questions]
            .sort((a, b) => a.sequence_index - b.sequence_index)
            .map((q) => q.question_id),
        },
      });
      router.push(`/course/${offeringId}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? "บันทึกไม่สำเร็จ";
      setSubmitError(Array.isArray(msg) ? msg.join("; ") : msg);
    } finally {
      setSaving(false);
    }
  };

  const minDate = todayDateString();

  return (
    <Navbar>
      <div className="min-h-screen w-full bg-[#F4EFFF]">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:px-10 lg:py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/course/${offeringId}`)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#514667] transition-colors hover:bg-white cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <div>
                <h1 className="flex items-center gap-2 text-lg font-semibold text-[#2F2A3A] sm:text-xl">
                  <CalendarClock size={22} className="text-[#7C5BD9]" />
                  สร้างการสอบ
                </h1>
                <p className="mt-1 text-sm font-normal text-[#7A7287]">
                  เลือกชุดข้อสอบที่มีอยู่แล้ว และตั้งวัน-เวลาเปิด/ปิดสอบ
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isValid || saving}
              aria-disabled={!isValid || saving}
              title={!isValid ? "กรุณากรอกข้อมูลให้ครบและถูกต้อง" : undefined}
              className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${
                isValid && !saving
                  ? "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
                  : "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
              }`}
            >
              {saving ? "กำลังบันทึก..." : "เปิดการสอบ"}
            </button>
          </div>

          {submitError && (
            <p className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
              <AlertCircle size={14} />
              {submitError}
            </p>
          )}

          {/* Step 1 — pick an exam set */}
          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-[#2F2A3A]">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B7A3E3] text-xs font-semibold text-white">
                    1
                  </span>
                  เลือกชุดข้อสอบ
                  <span className="ml-1 rounded-full bg-[#F4EFFF] px-2.5 py-1 text-xs font-semibold text-[#7C5BD9]">
                    {exams.length}
                  </span>
                </h2>
                <p className="mt-1 text-sm font-normal text-[#7A7287]">
                  เลือกชุดข้อสอบที่สร้างไว้แล้วจากคลังข้อสอบ
                </p>
              </div>
              <Link
                href={`/exam-bank/${offeringId}/exam-sets/create`}
                className="flex items-center gap-2 rounded-xl border border-[#D9CCF2] bg-white px-4 py-2 text-sm font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF]"
              >
                <Plus size={16} />
                สร้างชุดข้อสอบใหม่
              </Link>
            </div>

            {/* Picker toolbar */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB]">
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                        active
                          ? "bg-[#B7A3E3] text-white"
                          : "bg-white text-[#514667] ring-1 ring-[#E7DDF8] hover:bg-[#F4EFFF]"
                      }`}
                    >
                      {label}
                      <span
                        className={`ml-1.5 ${
                          active ? "opacity-90" : "text-[#B7AFC6]"
                        }`}
                      >
                        {examCounts[key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm font-medium text-[#514667]">
                  เรียง:
                  <select
                    value={sortKey}
                    onChange={(e) => setSortKey(e.target.value as SortKey)}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#514667] outline-none ring-1 ring-[#E7DDF8] focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer"
                  >
                    <option value="newest">ใหม่สุด</option>
                    <option value="oldest">เก่าสุด</option>
                    <option value="title">ชื่อ A→Z</option>
                    <option value="questions">จำนวนข้อมาก→น้อย</option>
                  </select>
                </label>

                <div className="flex overflow-hidden rounded-xl border border-[#E7DDF8] bg-white">
                  <button
                    type="button"
                    onClick={() => setPickerView("grid")}
                    className={`flex h-9 w-9 items-center justify-center cursor-pointer transition-colors ${
                      pickerView === "grid"
                        ? "bg-[#B7A3E3] text-white"
                        : "text-[#514667] hover:bg-[#F4EFFF]"
                    }`}
                    aria-label="มุมมองตาราง"
                    title="มุมมองตาราง"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerView("list")}
                    className={`flex h-9 w-9 items-center justify-center cursor-pointer transition-colors ${
                      pickerView === "list"
                        ? "bg-[#B7A3E3] text-white"
                        : "text-[#514667] hover:bg-[#F4EFFF]"
                    }`}
                    aria-label="มุมมองรายการ"
                    title="มุมมองรายการ"
                  >
                    <List size={14} />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
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

            {loadingList ? (
              <p className="text-sm font-medium text-[#7A7287]">กำลังโหลด...</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-[#FAF8FF] p-8 text-center ring-1 ring-[#EFE8FB]">
                <p className="text-sm font-medium text-[#7A7287]">
                  {exams.length === 0
                    ? "ยังไม่มีชุดข้อสอบในรายวิชานี้"
                    : "ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไข"}
                </p>
                {exams.length === 0 && (
                  <Link
                    href={`/exam-bank/${offeringId}/exam-sets/create`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#A48FD6]"
                  >
                    <Plus size={16} />
                    สร้างชุดข้อสอบแรก
                  </Link>
                )}
              </div>
            ) : pickerView === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pickerItems.map((e) => {
                  const isSelected = selectedId === e.course_exams_id;
                  return (
                    <button
                      key={e.course_exams_id}
                      type="button"
                      onClick={() =>
                        setSelectedId(isSelected ? null : e.course_exams_id)
                      }
                      className={`relative flex min-h-44 h-full flex-col rounded-2xl p-5 text-left shadow-sm transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#F4EFFF] ring-2 ring-[#B7A3E3]"
                          : "bg-[#FAF8FF] ring-1 ring-[#EFE8FB] hover:bg-white hover:ring-[#D9CCF2]"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#B7A3E3] text-white">
                          <Check size={12} />
                        </span>
                      )}
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <ClipboardList size={20} className="text-[#B7A3E3]" />
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            e.status,
                          )}`}
                        >
                          {statusLabel[e.status]}
                        </span>
                      </div>
                      <h3 className="mb-1 pr-6 text-base font-semibold leading-6 text-[#2F2A3A] line-clamp-2">
                        {e.title}
                      </h3>
                      {e.description && (
                        <p className="mb-3 text-sm font-normal leading-6 text-[#7A7287] line-clamp-2">
                          {e.description}
                        </p>
                      )}
                      <p className="mt-auto text-xs font-semibold text-[#7C5BD9]">
                        {e.question_count} ข้อ
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <ul className="divide-y divide-[#EFE8FB] overflow-hidden rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
                {pickerItems.map((e) => {
                  const isSelected = selectedId === e.course_exams_id;
                  return (
                    <li key={e.course_exams_id}>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedId(isSelected ? null : e.course_exams_id)
                        }
                        className={`flex w-full items-center gap-3 px-5 py-4 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#F4EFFF]"
                            : "bg-white hover:bg-[#FBF8FF]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            isSelected
                              ? "border-[#B7A3E3] bg-[#B7A3E3] text-white"
                              : "border-[#D9CCF2]"
                          }`}
                        >
                          {isSelected && <Check size={12} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#2F2A3A]">
                            {e.title}
                          </p>
                          {e.description && (
                            <p className="truncate text-xs font-normal text-[#7A7287]">
                              {e.description}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-[#7C5BD9]">
                          {e.question_count} ข้อ
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            e.status,
                          )}`}
                        >
                          {statusLabel[e.status]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Picker pagination */}
            {filtered.length > 0 && pickerTotalPages > 1 && (
              <div className="mt-5 flex items-center justify-between text-xs font-medium text-[#514667]">
                <span>
                  แสดง {(pickerPage - 1) * PICKER_PAGE_SIZE + 1}–
                  {Math.min(pickerPage * PICKER_PAGE_SIZE, filtered.length)} จาก{" "}
                  {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setPickerPage((p) => Math.max(1, p - 1))
                    }
                    disabled={pickerPage === 1}
                    className="rounded-xl bg-[#F4EFFF] px-3 py-2 disabled:opacity-40 hover:bg-[#E9E0FA] cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="px-2">
                    {pickerPage} / {pickerTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPickerPage((p) => Math.min(pickerTotalPages, p + 1))
                    }
                    disabled={pickerPage === pickerTotalPages}
                    className="rounded-xl bg-[#F4EFFF] px-3 py-2 disabled:opacity-40 hover:bg-[#E9E0FA] cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}

            {errors.exam && (
              <p className="mt-3 flex items-center gap-1 text-xs text-rose-500">
                <AlertCircle size={12} />
                {errors.exam}
              </p>
            )}
          </section>

          {/* Step 2 — schedule */}
          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="mb-5">
              <h2 className="flex items-center gap-2 text-base font-semibold text-[#2F2A3A]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#B7A3E3] text-xs font-semibold text-white">
                  2
                </span>
                ตั้งเวลาเปิด-ปิดสอบ
              </h2>
              <p className="mt-1 text-sm font-normal text-[#7A7287]">
                กำหนดช่วงเวลาที่นักศึกษาสามารถเข้าทำข้อสอบได้
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Open */}
              <div className="rounded-2xl bg-[#FAF8FF] p-5 ring-1 ring-[#EFE8FB]">
                <h3 className="mb-4 text-sm font-semibold text-[#7C5BD9]">
                  เปิดสอบ
                </h3>
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-sm font-medium text-[#514667]">
                    วันเปิดสอบ
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    min={minDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      errors.startDate
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.startDate && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.startDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#514667]">
                    เวลาเปิดสอบ
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      errors.startTime
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.startTime && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.startTime}
                    </p>
                  )}
                </label>
              </div>

              {/* Close */}
              <div className="rounded-2xl bg-[#FAF8FF] p-5 ring-1 ring-[#EFE8FB]">
                <h3 className="mb-4 text-sm font-semibold text-[#7C5BD9]">
                  ปิดสอบ
                </h3>
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-sm font-medium text-[#514667]">
                    วันปิดสอบ
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || minDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      errors.endDate
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.endDate && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.endDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#514667]">
                    เวลาปิดสอบ
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`w-full rounded-xl bg-white px-4 py-3 text-sm font-normal text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      errors.endTime
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {errors.endTime && (
                    <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-500">
                      <AlertCircle size={11} />
                      {errors.endTime}
                    </p>
                  )}
                </label>
              </div>
            </div>

            {/* Summary */}
            {selected && isValid && (
              <div className="mt-5 rounded-2xl bg-[#F4EFFF] p-5 ring-1 ring-[#D9CCF2]">
                <p className="text-xs font-semibold text-[#7C5BD9]">
                  สรุปการเปิดสอบ
                </p>
                <p className="mt-2 text-base font-semibold text-[#2F2A3A]">
                  {selected.title}
                </p>
                <p className="mt-1 text-sm font-normal text-[#514667]">
                  เปิดสอบ {startDate} เวลา {startTime} น. → ปิดสอบ {endDate}{" "}
                  เวลา {endTime} น.
                </p>
                <p className="mt-1 text-xs font-medium text-[#7A7287]">
                  จำนวนข้อ {selected.question_count} ข้อ
                </p>
              </div>
            )}
          </section>
        </main>
      </div>
    </Navbar>
  );
}
