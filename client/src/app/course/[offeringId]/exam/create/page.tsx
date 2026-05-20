"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  Tags,
  X,
} from "lucide-react";
import Navbar from "@/components/layout/NavBar";
import { apiFetch } from "@/lib/api";
import {
  createLocalDateTime,
  dateOnlyMs,
  parseDateInput,
  parseTimeInput,
} from "@/lib/examScheduleValidation";
import {
  FIXED_GUESSING_PARAM,
  QUESTION_PARAM_LIMITS,
} from "@/config/questionParamLimits";

interface ExamListItem {
  course_exams_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  question_count: number;
  status: "UPCOMING" | "ONGOING" | "ENDED";
  questions?: ExamDetailQuestion[];
}

interface ExamDetailQuestion {
  question_id: string;
  sequence_index: number;
  difficulty_param: number | null;
  discrimination_param: number | null;
  guessing_param: number | null;
  knowledge_categories: { knowledge_category_id: string; name: string }[];
}

interface ExamDetail extends ExamListItem {
  questions: ExamDetailQuestion[];
}

const PICKER_PAGE_SIZE_OPTIONS = [9, 18, 27];
const MIN_ADAPTIVE_QUESTIONS = 8;

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

function hasValidIrtParams(question: ExamDetailQuestion): boolean {
  const { difficulty, discrimination } = QUESTION_PARAM_LIMITS;
  return (
    typeof question.difficulty_param === "number" &&
    Number.isFinite(question.difficulty_param) &&
    question.difficulty_param >= difficulty.min &&
    question.difficulty_param <= difficulty.max &&
    typeof question.discrimination_param === "number" &&
    Number.isFinite(question.discrimination_param) &&
    question.discrimination_param >= discrimination.min &&
    question.discrimination_param <= discrimination.max &&
    typeof question.guessing_param === "number" &&
    Number.isFinite(question.guessing_param) &&
    Math.abs(question.guessing_param - FIXED_GUESSING_PARAM) <= Number.EPSILON
  );
}

const formatThaiDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const months = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
};

const localToIso = (dateInput: string, timeInput: string) => {
  const date = createLocalDateTime(dateInput, timeInput);
  if (!date) throw new Error("รูปแบบวันที่/เวลาไม่ถูกต้อง");
  return date.toISOString();
};

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
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerPageSize, setPickerPageSize] = useState(9);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [examDetails, setExamDetails] = useState<
    Record<string, ExamDetail | null>
  >({});
  const [detailsLoadingIds, setDetailsLoadingIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("11:00");

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!offeringId) return;
    apiFetch<ExamListItem[]>(`/course-offerings/${offeringId}/exams?draft=true`)
      .then(setExams)
      .catch(() => {
        setExams([]);
        setListError("ไม่สามารถโหลดรายการชุดข้อสอบได้");
      })
      .finally(() => setLoadingList(false));
  }, [offeringId]);

  useEffect(() => setPickerPage(1), [search, pickerPageSize]);

  const processedExams = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = exams.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        (e.description ?? "").toLowerCase().includes(q),
    );
    arr = [...arr].sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );
    return arr;
  }, [exams, search]);

  const pickerTotalPages = Math.max(
    1,
    Math.ceil(processedExams.length / pickerPageSize),
  );
  const currentPickerPage = Math.min(pickerPage, pickerTotalPages);
  const pickerItems = useMemo(
    () =>
      processedExams.slice(
        (currentPickerPage - 1) * pickerPageSize,
        currentPickerPage * pickerPageSize,
      ),
    [currentPickerPage, pickerPageSize, processedExams],
  );

  const filtered = processedExams;
  const firstPickerItem =
    filtered.length === 0 ? 0 : (currentPickerPage - 1) * pickerPageSize + 1;
  const lastPickerItem = Math.min(
    currentPickerPage * pickerPageSize,
    filtered.length,
  );
  const visibleExamIds = useMemo(
    () =>
      pickerItems
        .filter((exam) => exam.questions === undefined)
        .map((exam) => exam.course_exams_id),
    [pickerItems],
  );
  const visibleExamIdsKey = visibleExamIds.join(",");

  useEffect(() => {
    if (!offeringId || visibleExamIds.length === 0) return;
    const idsToLoad = visibleExamIds.filter(
      (id) => examDetails[id] == null && !loadingRef.current.has(id),
    );
    if (idsToLoad.length === 0) return;

    let cancelled = false;
    idsToLoad.forEach((id) => loadingRef.current.add(id));
    setDetailsLoadingIds((current) => {
      const next = new Set(current);
      idsToLoad.forEach((id) => next.add(id));
      return next;
    });

    Promise.all(
      idsToLoad.map(async (id) => {
        try {
          const detail = await apiFetch<ExamDetail>(
            `/course-offerings/${offeringId}/exams/${id}`,
          );
          return [id, detail] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setExamDetails((current) => {
          const next = { ...current };
          for (const [id, detail] of entries) {
            next[id] = detail;
          }
          return next;
        });
      })
      .finally(() => {
        if (cancelled) return;
        idsToLoad.forEach((id) => loadingRef.current.delete(id));
        setDetailsLoadingIds((current) => {
          const next = new Set(current);
          idsToLoad.forEach((id) => next.delete(id));
          return next;
        });
      });

    return () => {
      cancelled = true;
    };
  }, [offeringId, visibleExamIdsKey]);

  const errors = useMemo(() => {
    const out: {
      exam?: string;
      startDate?: string;
      startTime?: string;
      endDate?: string;
      endTime?: string;
    } = {};
    if (!selectedId) out.exam = "กรุณาเลือกชุดข้อสอบ";
    const selectedExam = selectedId
      ? exams.find((exam) => exam.course_exams_id === selectedId)
      : null;
    if (selectedExam && selectedExam.question_count < MIN_ADAPTIVE_QUESTIONS) {
      out.exam = `ชุดข้อสอบต้องมีอย่างน้อย ${MIN_ADAPTIVE_QUESTIONS} ข้อสำหรับ adaptive IRT`;
    }
    const selectedDetail = selectedId ? examDetails[selectedId] : null;
    if (
      selectedDetail?.questions.some(
        (question) =>
          !hasValidIrtParams(question) ||
          (question.knowledge_categories ?? []).length < 1,
      )
    ) {
      out.exam = "ชุดข้อสอบนี้มีคำถามที่ค่า IRT หรือหมวดหมู่ความรู้ไม่ครบ";
    }
    if (!startDate) out.startDate = "กรุณาเลือกวันเปิดสอบ";
    if (!startTime) out.startTime = "กรุณาเลือกเวลาเปิดสอบ";
    if (!endDate) out.endDate = "กรุณาเลือกวันปิดสอบ";
    if (!endTime) out.endTime = "กรุณาเลือกเวลาปิดสอบ";

    const startDateValue = startDate ? parseDateInput(startDate) : null;
    const startTimeValue = startTime ? parseTimeInput(startTime) : null;
    const endDateValue = endDate ? parseDateInput(endDate) : null;
    const endTimeValue = endTime ? parseTimeInput(endTime) : null;

    if (startDate && !startDateValue) {
      out.startDate = "รูปแบบวันที่ไม่ถูกต้อง";
    }
    if (startTime && !startTimeValue) {
      out.startTime = "รูปแบบเวลาไม่ถูกต้อง";
    }
    if (endDate && !endDateValue) {
      out.endDate = "รูปแบบวันที่ไม่ถูกต้อง";
    }
    if (endTime && !endTimeValue) {
      out.endTime = "รูปแบบเวลาไม่ถูกต้อง";
    }

    if (startDateValue && startTimeValue) {
      const start = createLocalDateTime(startDate, startTime);
      if (start) {
        const now = new Date();
        if (dateOnlyMs(start) < dateOnlyMs(now)) {
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
      !out.startTime &&
      !out.endDate &&
      !out.endTime
    ) {
      const start = createLocalDateTime(startDate, startTime);
      const end = createLocalDateTime(endDate, endTime);
      if (start && end) {
        if (dateOnlyMs(end) < dateOnlyMs(start)) {
          out.endDate = "วันปิดสอบต้องไม่อยู่ก่อนวันเปิดสอบ";
        } else if (end.getTime() <= start.getTime()) {
          out.endTime = "เวลาปิดสอบต้องอยู่หลังเวลาเปิดสอบ";
        }
      }
    }
    return out;
  }, [selectedId, exams, examDetails, startDate, startTime, endDate, endTime]);

  const isValid = Object.keys(errors).length === 0;
  const selected = exams.find((e) => e.course_exams_id === selectedId) ?? null;

  const handleSubmit = async () => {
    if (!isValid || !selectedId) {
      setSubmitted(true);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const detail =
        selected?.questions !== undefined
          ? ({ ...selected, questions: selected.questions } as ExamDetail)
          : await apiFetch<ExamDetail>(
              `/course-offerings/${offeringId}/exams/${selectedId}`,
            );
      await apiFetch(`/course-offerings/${offeringId}/exams/${selectedId}`, {
        method: "PATCH",
        data: {
          title: detail.title,
          description: detail.description ?? "",
          start_time: localToIso(startDate, startTime),
          end_time: localToIso(endDate, endTime),
          is_published: true,
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
          <div className="mb-5 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => router.push(`/course/${offeringId}`)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#514667] ring-1 ring-transparent transition-colors hover:bg-[#FAF8FF] hover:ring-[#E7DDF8] cursor-pointer"
                aria-label="กลับ"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2.5 text-[22px] font-semibold leading-8 text-[#2F2A3A] sm:text-2xl">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                    <CalendarClock size={22} />
                  </span>
                  สร้างการสอบ
                </h1>
                <p className="mt-1 text-[13px] font-normal leading-5 text-[#7A7287] sm:text-sm">
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
              className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-[13px] font-semibold text-white shadow-sm transition-colors sm:text-sm ${
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

          <section className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2.5 text-[17px] font-semibold leading-6 text-[#2F2A3A]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                    <ClipboardList size={18} />
                  </span>
                  เลือกชุดข้อสอบ
                </h2>
                <p className="mt-1 text-[13px] font-normal leading-5 text-[#7A7287] sm:text-sm">
                  เลือกชุดข้อสอบที่สร้างไว้แล้วจากคลังข้อสอบ
                </p>
              </div>
              <Link
                href={`/exam-bank/${offeringId}/exam-sets/create`}
                className="flex items-center gap-2 rounded-xl border border-[#D9CCF2] bg-white px-4 py-2 text-[13px] font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] sm:text-sm"
              >
                <Plus size={16} />
                สร้างชุดข้อสอบใหม่
              </Link>
            </div>

            <div className="mb-4 flex flex-col gap-4 rounded-2xl bg-[#FAF8FF] px-4 py-3 ring-1 ring-[#EFE8FB] xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#7A7287] sm:text-sm">
                  ชุดข้อสอบทั้งหมด
                </p>
                <p className="mt-1 flex items-baseline gap-1 text-[26px] font-semibold leading-none text-[#2F2A3A]">
                  {exams.length.toLocaleString("th-TH")}
                  <span className="text-sm font-semibold text-[#7C5BD9]">
                    ชุด
                  </span>
                </p>
              </div>
              <div className="relative w-full xl:max-w-md">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ค้นหาชุดข้อสอบ"
                  className="h-11 w-full rounded-xl bg-white px-4 pr-11 text-[13px] font-medium text-[#2F2A3A] placeholder:text-[#B7AFC6] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] sm:text-sm"
                />
                <Search
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7287]"
                />
              </div>
            </div>

            {filtered.length > 0 && (
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex h-10 w-fit items-center rounded-xl bg-white px-4 text-[13px] font-medium text-[#514667] shadow-sm ring-1 ring-[#E7DDF8] sm:text-sm">
                  แสดง {firstPickerItem}–{lastPickerItem} จาก {filtered.length}
                </span>

                <label className="relative block w-full shrink-0 sm:w-44">
                  <span className="sr-only">จำนวนรายการต่อหน้า</span>
                  <select
                    value={pickerPageSize}
                    onChange={(e) => setPickerPageSize(Number(e.target.value))}
                    className="h-10 w-full appearance-none rounded-xl bg-white px-4 pr-10 text-[13px] font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 focus:ring-[#B7A3E3] cursor-pointer sm:text-sm"
                  >
                    {PICKER_PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        แสดง {size} รายการ
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

            {listError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">
                <AlertCircle size={14} />
                {listError}
              </div>
            )}
            {loadingList ? (
              <p className="text-[13px] font-medium text-[#7A7287] sm:text-sm">
                กำลังโหลด...
              </p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl bg-[#FAF8FF] p-8 text-center ring-1 ring-[#EFE8FB]">
                <p className="text-[13px] font-medium text-[#7A7287] sm:text-sm">
                  {exams.length === 0
                    ? "ยังไม่มีชุดข้อสอบในรายวิชานี้"
                    : "ไม่พบชุดข้อสอบที่ตรงกับเงื่อนไข"}
                </p>
                {exams.length === 0 && (
                  <Link
                    href={`/exam-bank/${offeringId}/exam-sets/create`}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#B7A3E3] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#A48FD6] sm:text-sm"
                  >
                    <Plus size={16} />
                    สร้างชุดข้อสอบแรก
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-3">
                {pickerItems.map((exam) => (
                  <ExamSetOptionCard
                    key={exam.course_exams_id}
                    exam={exam}
                    detail={
                      exam.questions
                        ? { ...exam, questions: exam.questions }
                        : examDetails[exam.course_exams_id]
                    }
                    loadingDetail={detailsLoadingIds.has(exam.course_exams_id)}
                    selected={selectedId === exam.course_exams_id}
                    onSelect={() =>
                      setSelectedId((current) =>
                        current === exam.course_exams_id
                          ? null
                          : exam.course_exams_id,
                      )
                    }
                  />
                ))}
              </div>
            )}

            {/* Picker pagination */}
            {filtered.length > 0 && (
              <div className="mt-4 flex justify-end">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPickerPage((p) => Math.max(1, p - 1))}
                    disabled={currentPickerPage === 1}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                    aria-label="หน้าก่อนหน้า"
                    title="หน้าก่อนหน้า"
                  >
                    <ChevronLeft size={18} strokeWidth={2.4} />
                  </button>
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#B7A3E3] px-3 text-sm font-semibold text-white shadow-sm">
                    {currentPickerPage}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setPickerPage((p) => Math.min(pickerTotalPages, p + 1))
                    }
                    disabled={currentPickerPage === pickerTotalPages}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E5E7EB] text-[#8F98A8] shadow-sm transition-colors hover:bg-[#DDE1E7] disabled:cursor-not-allowed disabled:opacity-80"
                    aria-label="หน้าถัดไป"
                    title="หน้าถัดไป"
                  >
                    <ChevronRight size={18} strokeWidth={2.4} />
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#E7DDF8] sm:p-6">
            <div className="mb-5">
              <h2 className="flex items-center gap-2.5 text-[17px] font-semibold leading-6 text-[#2F2A3A]">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F4EFFF] text-[#7C5BD9]">
                  <CalendarClock size={18} />
                </span>
                ตั้งเวลาเปิด-ปิดสอบ
              </h2>
              <p className="mt-1 text-[13px] font-normal leading-5 text-[#7A7287] sm:text-sm">
                กำหนดช่วงเวลาที่นักศึกษาสามารถเข้าทำข้อสอบได้
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB] sm:p-5">
                <h3 className="mb-4 text-sm font-semibold text-[#7C5BD9]">
                  เปิดสอบ
                </h3>
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#514667]">
                    วันเปิดสอบ
                  </span>
                  <input
                    type="date"
                    value={startDate}
                    min={minDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      (startDate || submitted) && errors.startDate
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {(startDate || submitted) && errors.startDate && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500">
                      <AlertCircle size={12} />
                      {errors.startDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#514667]">
                    เวลาเปิดสอบ
                  </span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className={`h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      (startTime || submitted) && errors.startTime
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {(startTime || submitted) && errors.startTime && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500">
                      <AlertCircle size={12} />
                      {errors.startTime}
                    </p>
                  )}
                </label>
              </div>

              <div className="rounded-xl bg-[#FAF8FF] p-4 ring-1 ring-[#EFE8FB] sm:p-5">
                <h3 className="mb-4 text-sm font-semibold text-[#7C5BD9]">
                  ปิดสอบ
                </h3>
                <label className="mb-3 block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#514667]">
                    วันปิดสอบ
                  </span>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || minDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={`h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      (endDate || submitted) && errors.endDate
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {(endDate || submitted) && errors.endDate && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500">
                      <AlertCircle size={12} />
                      {errors.endDate}
                    </p>
                  )}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-[#514667]">
                    เวลาปิดสอบ
                  </span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className={`h-11 w-full rounded-xl bg-white px-4 text-sm font-medium text-[#2F2A3A] shadow-sm outline-none ring-1 ring-[#E7DDF8] transition focus:ring-2 ${
                      (endTime || submitted) && errors.endTime
                        ? "ring-2 ring-rose-300 focus:ring-rose-400"
                        : "focus:ring-[#B7A3E3]"
                    }`}
                  />
                  {(endTime || submitted) && errors.endTime && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-500">
                      <AlertCircle size={12} />
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

interface ExamDetailSummary {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  untagged: number;
  avgDifficulty: number | null;
  avgDiscrimination: number | null;
  avgGuessing: number | null;
  categories: { id: string; name: string; count: number }[];
}

function ExamSetOptionCard({
  exam,
  detail,
  loadingDetail,
  selected,
  onSelect,
}: {
  exam: ExamListItem;
  detail: ExamDetail | null | undefined;
  loadingDetail: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const summary = detail ? buildExamDetailSummary(detail.questions) : null;
  const categories = summary?.categories ?? [];
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onSelect();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleCardKeyDown}
      className={`w-full rounded-2xl p-4 text-left shadow-sm ring-1 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9] cursor-pointer sm:p-5 ${
        selected
          ? "bg-[#F4EFFF] ring-2 ring-[#7C5BD9]"
          : "bg-white ring-[#E7DDF8] hover:bg-[#FAF8FF]"
      }`}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 space-y-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
              <ClipboardList size={19} />
            </span>
            <div className="min-w-0">
              <h3 className="line-clamp-2 break-words text-base font-semibold leading-6 text-[#2F2A3A] sm:text-[17px]">
                {exam.title}
              </h3>
              <ExamDescription
                title={exam.title}
                description={exam.description}
              />
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#EFE8FB] pt-4 sm:grid-cols-[150px_minmax(0,1fr)]">
            <div className="rounded-xl bg-[#FAF8FF] p-3.5 ring-1 ring-[#EFE8FB]">
              <p className="text-[13px] font-semibold text-[#7A7287] sm:text-sm">
                จำนวนข้อ
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-[#2F2A3A]">
                {exam.question_count}
                <span className="ml-1 text-sm font-semibold text-[#7C5BD9]">
                  ข้อ
                </span>
              </p>
            </div>

            <div className="rounded-xl bg-[#FAF8FF] p-3.5 ring-1 ring-[#EFE8FB]">
              <p className="text-[13px] font-semibold text-[#7A7287] sm:text-sm">
                ช่วงเวลาเดิม
              </p>
              <p className="mt-1 text-[13px] font-medium leading-5 text-[#514667] sm:text-sm sm:leading-6">
                {formatThaiDate(exam.start_time)} ถึง{" "}
                {formatThaiDate(exam.end_time)}
              </p>
            </div>
          </div>

          {summary && (
            <div className="rounded-xl bg-[#FAF8FF] p-3.5 ring-1 ring-[#EFE8FB]">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[#514667] sm:text-sm">
                  ระดับความยาก
                </p>
                {summary.untagged > 0 && (
                  <span className="text-xs font-medium text-amber-600">
                    ยังไม่ระบุ {summary.untagged} ข้อ
                  </span>
                )}
              </div>
              <DifficultyDistribution summary={summary} />
            </div>
          )}
        </div>

        <aside className="grid content-start gap-3">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#FAF8FF] p-3.5 ring-1 ring-[#EFE8FB]">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#7A7287] sm:text-sm">
                สถานะ
              </p>
              <span
                className={`mt-1 inline-flex min-w-[86px] justify-center rounded-full px-3 py-1 text-[13px] font-semibold sm:text-sm ${statusClass(
                  exam.status,
                )}`}
              >
                {statusLabel[exam.status]}
              </span>
            </div>
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors ${
                selected
                  ? "bg-[#B7A3E3] text-white ring-[#B7A3E3]"
                  : "bg-white text-[#7C5BD9] ring-[#E7DDF8]"
              }`}
              aria-hidden="true"
            >
              {selected ? <Check size={17} /> : null}
            </span>
          </div>

          <div className="rounded-xl bg-[#FAF8FF] p-3.5 ring-1 ring-[#EFE8FB]">
            <p className="text-[13px] font-semibold text-[#7A7287] sm:text-sm">
              หมวดหมู่ความรู้
            </p>
            {loadingDetail ? (
              <p className="mt-2 text-[13px] font-medium text-[#A59CB2] sm:text-sm">
                กำลังโหลดรายละเอียด...
              </p>
            ) : summary ? (
              <KnowledgeCategorySummary categories={categories} />
            ) : (
              <p className="mt-2 text-[13px] font-medium text-[#A59CB2] sm:text-sm">
                โหลดรายละเอียดไม่ได้
              </p>
            )}
          </div>

          {summary && (
            <dl className="rounded-xl bg-[#FAF8FF] p-3.5 ring-1 ring-[#EFE8FB]">
              <dt className="mb-2 text-[13px] font-semibold text-[#514667] sm:text-sm">
                ค่าสถิติเฉลี่ย
              </dt>
              <dd className="grid grid-cols-3 gap-2">
                <AverageMetric code="b" value={summary.avgDifficulty} />
                <AverageMetric code="a" value={summary.avgDiscrimination} />
                <AverageMetric code="c" value={summary.avgGuessing} />
              </dd>
            </dl>
          )}
        </aside>
      </div>
    </div>
  );
}

function ExamDescription({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  const [open, setOpen] = useState(false);
  const text = description?.trim() ?? "";
  const shouldTruncate = text.length > 90 || text.split(/\r?\n/).length > 2;

  if (!text) {
    return (
      <p className="mt-1 text-[15px] font-normal text-[#A59CB2]">
        ไม่มีคำอธิบาย
      </p>
    );
  }

  return (
    <div
      className="mt-2 max-w-3xl rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#7C5BD9]">คำอธิบาย</span>
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
            aria-labelledby="exam-description-dialog-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-left shadow-xl ring-1 ring-[#D9CCF2]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] px-5 py-4">
              <div className="min-w-0">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <ClipboardList size={19} />
                </div>
                <h4
                  id="exam-description-dialog-title"
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

function KnowledgeCategorySummary({
  categories,
}: {
  categories: { id: string; name: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);
  const questionTagCount = categories.reduce(
    (sum, category) => sum + category.count,
    0,
  );
  const categoryNames = categories.map((category) => category.name).join(", ");

  if (categories.length === 0) {
    return (
      <p className="mt-2 text-[13px] font-medium text-[#A59CB2] sm:text-sm">
        ไม่มีหมวดหมู่
      </p>
    );
  }

  return (
    <div
      className="mt-2"
      title={categoryNames}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-[#E7DDF8]">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#F4EFFF] text-[#7C5BD9]">
            <Tags size={13} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold leading-4 text-[#2F2A3A]">
              {categories.length} หมวดหมู่
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-[#D9CCF2] bg-white px-3 text-[13px] font-semibold text-[#7C5BD9] shadow-sm transition-colors hover:bg-[#F4EFFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
          aria-haspopup="dialog"
        >
          ดูหมวดหมู่
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2A3A]/35 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-category-dialog-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white text-left shadow-xl ring-1 ring-[#D9CCF2]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#EFE8FB] px-5 py-4">
              <div className="min-w-0">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4EFFF] text-[#7C5BD9]">
                  <Tags size={19} />
                </div>
                <h4
                  id="knowledge-category-dialog-title"
                  className="text-lg font-semibold leading-7 text-[#2F2A3A]"
                >
                  หมวดหมู่ความรู้
                </h4>
                <p className="mt-1 text-[13px] font-medium leading-5 text-[#7A7287] sm:text-sm">
                  {categories.length} หมวดหมู่ รวม {questionTagCount} ข้อ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FAF8FF] text-[#7A7287] ring-1 ring-[#E7DDF8] transition-colors hover:bg-[#F4EFFF] hover:text-[#7C5BD9] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5BD9]"
                aria-label="ปิดหน้าต่างหมวดหมู่ความรู้"
              >
                <X size={17} />
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              <ol className="grid gap-2">
                {categories.map((category, index) => (
                  <li
                    key={category.id}
                    className="flex items-start gap-3 rounded-xl bg-[#FAF8FF] p-3 ring-1 ring-[#EFE8FB]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4EFFF] text-sm font-semibold text-[#7C5BD9]">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold leading-6 text-[#2F2A3A]">
                        {category.name}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                      {category.count} ข้อ
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DifficultyDistribution({ summary }: { summary: ExamDetailSummary }) {
  const items = [
    {
      label: "ง่าย",
      value: summary.easy,
      dot: "bg-emerald-500",
      text: "text-emerald-700",
    },
    {
      label: "กลาง",
      value: summary.medium,
      dot: "bg-amber-400",
      text: "text-amber-700",
    },
    {
      label: "ยาก",
      value: summary.hard,
      dot: "bg-rose-500",
      text: "text-rose-700",
    },
  ];
  const total = Math.max(0, summary.easy + summary.medium + summary.hard);

  return (
    <>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white ring-1 ring-[#E7DDF8]">
        {total === 0 ? (
          <span className="h-full w-full bg-[#EFE8FB]" />
        ) : (
          items.map((item) =>
            item.value > 0 ? (
              <span
                key={item.label}
                className={`h-full ${item.dot}`}
                style={{ width: `${(item.value / total) * 100}%` }}
                title={`${item.label} ${item.value} ข้อ`}
              />
            ) : null,
          )
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {items.map((item) => (
          <span
            key={item.label}
            className={`inline-flex items-center gap-1.5 text-[13px] font-semibold sm:text-sm ${item.text}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
            {item.label} {item.value}
          </span>
        ))}
      </div>
    </>
  );
}

function AverageMetric({
  code,
  value,
}: {
  code: "a" | "b" | "c";
  value: number | null;
}) {
  return (
    <div className="rounded-xl bg-[#FAF8FF] px-3 py-3 text-center ring-1 ring-[#E7DDF8]">
      <div className="text-[13px] font-semibold leading-none text-[#7C5BD9] sm:text-sm">
        {code}
      </div>
      <div className="mt-2 text-xl font-semibold leading-none text-[#2F2A3A]">
        {formatQuestionParam(value)}
      </div>
    </div>
  );
}

function buildExamDetailSummary(
  questions: ExamDetailQuestion[],
): ExamDetailSummary {
  let easy = 0;
  let medium = 0;
  let hard = 0;
  let untagged = 0;
  let difficultySum = 0;
  let difficultyCount = 0;
  let discriminationSum = 0;
  let discriminationCount = 0;
  let guessingSum = 0;
  let guessingCount = 0;
  const byCategory = new Map<
    string,
    { id: string; name: string; count: number }
  >();

  for (const question of questions) {
    const difficulty = question.difficulty_param;
    if (typeof difficulty === "number" && Number.isFinite(difficulty)) {
      difficultySum += difficulty;
      difficultyCount += 1;
      if (difficulty < 0) easy += 1;
      else if (difficulty === 0) medium += 1;
      else hard += 1;
    } else {
      untagged += 1;
    }

    const discrimination = question.discrimination_param;
    if (typeof discrimination === "number" && Number.isFinite(discrimination)) {
      discriminationSum += discrimination;
      discriminationCount += 1;
    }

    const guessing = question.guessing_param;
    if (typeof guessing === "number" && Number.isFinite(guessing)) {
      guessingSum += guessing;
      guessingCount += 1;
    }

    for (const category of question.knowledge_categories ?? []) {
      const current = byCategory.get(category.knowledge_category_id);
      if (current) {
        current.count += 1;
      } else {
        byCategory.set(category.knowledge_category_id, {
          id: category.knowledge_category_id,
          name: category.name,
          count: 1,
        });
      }
    }
  }

  return {
    total: questions.length,
    easy,
    medium,
    hard,
    untagged,
    avgDifficulty: difficultyCount > 0 ? difficultySum / difficultyCount : null,
    avgDiscrimination:
      discriminationCount > 0 ? discriminationSum / discriminationCount : null,
    avgGuessing: guessingCount > 0 ? guessingSum / guessingCount : null,
    categories: Array.from(byCategory.values()).sort(
      (a, b) => b.count - a.count,
    ),
  };
}

function formatQuestionParam(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}
