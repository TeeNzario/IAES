"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit2,
  FileText,
  Info,
  Loader2,
  Save,
  Trash2,
  UploadCloud,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Papa from "papaparse";
import { apiFetch } from "@/lib/api";
import { DEFAULT_FACULTY_CODE, FACULTY_MAP, getFacultyName } from "@/lib/faculty-map";
import {
  CURRICULUMS,
  DEFAULT_CURRICULUM_ID,
  getCurriculumName,
  resolveCurriculumId,
} from "@/config/curriculums";
import { DEFAULT_TITLE, THAI_TITLES } from "@/config/titles";

// Row data from preview session
interface PreviewRow {
  id: string;
  row_index: number;
  student_code: string;
  email: string;
  facultyCode?: number | null;
  title: string;
  curriculumId?: string | null;
  first_name: string;
  last_name: string;
  status:
    | "NEW"
    | "EXISTS_NOT_ENROLLED"
    | "ALREADY_ENROLLED"
    | "DUPLICATE_IDENTITY"
    | "MISSING";
  note?: string;
  is_deleted: boolean;
}

interface PreviewSessionResponse {
  sessionId: string;
  expiresAt: string;
  rows: PreviewRow[];
  summary: {
    total: number;
    new: number;
    existsNotEnrolled: number;
    alreadyEnrolled: number;
    duplicateIdentity: number;
    missing: number;
  };
}

interface ConfirmResponse {
  results: {
    student_code: string;
    email: string;
    status: "enrolled" | "already_enrolled" | "failed" | "skipped";
    note?: string;
  }[];
  summary: {
    total: number;
    enrolled: number;
    alreadyEnrolled: number;
    failed: number;
    skipped: number;
  };
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  offeringId: string;
  onSuccess?: () => void;
}

type FilterStatus = "all" | "new" | "enrolled" | "error";
type ImportStep = "upload" | "preview" | "result";

const REQUIRED_COLUMNS = [
  "student_code",
  "email",
  "title",
  "first_name",
  "last_name",
  "facultyCode",
  "curriculumId",
];

const CSV_TEMPLATE_ROWS = [
  {
    student_code: "66130001",
    email: "66130001@mail.wu.ac.th",
    title: "นาย",
    first_name: "พงศ์ศักดิ์",
    last_name: "ใจดี",
    facultyCode: 18,
    curriculumId: "CUR067",
  },
  {
    student_code: "66130002",
    email: "66130002@mail.wu.ac.th",
    title: "นางสาว",
    first_name: "สุพัตรา",
    last_name: "เขียนโค้ด",
    facultyCode: 12,
    curriculumId: "CUR042",
  },
];

const ISSUE_EXPORT_COLUMNS = [...REQUIRED_COLUMNS, "status", "note"];
const RESULT_ISSUE_EXPORT_COLUMNS = ["student_code", "email", "status", "note"];

type CsvValue = string | number | null | undefined;
type CsvRow = Record<string, CsvValue>;

function parseFacultyCode(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;

  const codePart = text.split(":")[0].trim();
  const numeric = Number(codePart);
  if (Number.isInteger(numeric)) return numeric;

  const match = Object.entries(FACULTY_MAP).find(([, name]) => name === text);
  return match ? Number(match[0]) : undefined;
}

function parseCurriculumId(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return resolveCurriculumId(text, text.split(":")[0].trim());
}

function readCsvCell(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function downloadCsv(filename: string, columns: string[], rows: CsvRow[]) {
  const csv = Papa.unparse({
    fields: columns,
    data: rows.map((row) => columns.map((column) => row[column] ?? "")),
  });
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function mapPreviewRowToCsv(row: PreviewRow): CsvRow {
  return {
    student_code: row.student_code,
    email: row.email,
    title: row.title,
    first_name: row.first_name,
    last_name: row.last_name,
    facultyCode: row.facultyCode,
    curriculumId: row.curriculumId,
    status: row.status,
    note: row.note,
  };
}

function getCsvDownloadDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function BulkUploadModal({
  isOpen,
  onClose,
  offeringId,
  onSuccess,
}: BulkUploadModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [confirmResults, setConfirmResults] = useState<ConfirmResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Edit mode
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    student_code: "",
    email: "",
    facultyCode: DEFAULT_FACULTY_CODE,
    title: DEFAULT_TITLE,
    curriculumId: DEFAULT_CURRICULUM_ID,
    first_name: "",
    last_name: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  if (!isOpen) return null;

  // ---- Helpers ----
  const STATUS_MAP: Record<PreviewRow["status"], { label: string; className: string }> = {
    NEW: { label: "นักศึกษาใหม่", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    EXISTS_NOT_ENROLLED: { label: "มีในระบบ", className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
    ALREADY_ENROLLED: { label: "ลงทะเบียนแล้ว", className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
    DUPLICATE_IDENTITY: { label: "ข้อมูลขัดแย้ง", className: "bg-red-50 text-red-600 ring-1 ring-red-200" },
    MISSING: { label: "ข้อมูลไม่ครบ", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  };

  const STEP_COPY: Record<ImportStep, { title: string; description: string; index: string }> = {
    upload: {
      title: "นำเข้านักศึกษาจาก CSV",
      description: "อัปโหลดไฟล์รายชื่อนักศึกษา ระบบจะตรวจสอบความถูกต้องก่อนนำเข้าจริง",
      index: "1/3",
    },
    preview: {
      title: "ตรวจสอบข้อมูลก่อนยืนยัน",
      description: "แก้ไขหรือลบแถวที่ผิดก่อนยืนยัน เฉพาะรายการที่พร้อมนำเข้าจะถูกลงทะเบียน",
      index: "2/3",
    },
    result: {
      title: "ผลลัพธ์การนำเข้า",
      description: "สรุปรายการที่ลงทะเบียนสำเร็จ รายการที่ข้าม และรายการที่ผิดพลาด",
      index: "3/3",
    },
  };

  const willBeSkipped = (status: PreviewRow["status"]) =>
    ["ALREADY_ENROLLED", "MISSING", "DUPLICATE_IDENTITY"].includes(status);

  const getRowCategory = (status: PreviewRow["status"]): FilterStatus => {
    if (status === "NEW" || status === "EXISTS_NOT_ENROLLED") return "new";
    if (status === "ALREADY_ENROLLED") return "enrolled";
    return "error";
  };

  const getRowBg = (row: PreviewRow, index: number) => {
    if (row.status === "ALREADY_ENROLLED") return "bg-purple-50/50";
    if (row.status === "MISSING" || row.status === "DUPLICATE_IDENTITY") return "bg-red-50/50";
    return index % 2 === 0 ? "bg-white" : "bg-gray-50/50";
  };

  // ---- Upload handlers ----
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
    e.target.value = "";
  };

  const processFile = (file: File) => {
    if (isLoading) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setSelectedFileName(null);
      setError("กรุณาเลือกไฟล์ CSV เท่านั้น");
      return;
    }
    setError(null);
    setSelectedFileName(file.name);
    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          if (results.errors.length > 0) {
            setError(`ไม่สามารถอ่านไฟล์ได้: ${results.errors[0].message}`);
            return;
          }

          const parsedRows = results.data.map((rawRow) => {
            const row = rawRow as Record<string, unknown>;
            return {
              student_code: readCsvCell(row, ["studentCode", "student_code", "studentId", "รหัสนักศึกษา"]),
              email: readCsvCell(row, ["email", "อีเมล"]).toLowerCase(),
              facultyCode: parseFacultyCode(readCsvCell(row, ["facultyCode", "faculty_code", "สำนักวิชา", "คณะ"])),
              title: readCsvCell(row, ["title", "prefix", "คำนำหน้า"]),
              curriculumId: parseCurriculumId(readCsvCell(row, ["curriculumId", "curriculum_id", "curriculumCode", "หลักสูตร"])),
              first_name: readCsvCell(row, ["firstName", "first_name", "ชื่อ"]),
              last_name: readCsvCell(row, ["lastName", "last_name", "นามสกุล"]),
            };
          });

          if (parsedRows.length === 0) {
            setError("ไฟล์ CSV ไม่มีข้อมูลสำหรับนำเข้า");
            return;
          }

          const response = await apiFetch<PreviewSessionResponse>(
            `/course-offerings/${offeringId}/import/preview`,
            { method: "POST", data: { rows: parsedRows } },
          );

          setSessionId(response.sessionId);
          setRows(response.rows);
          setFilterStatus("all");
          setStep("preview");
        } catch (err) {
          console.error("Failed to create preview session:", err);
          setError("ไม่สามารถสร้างเซสชันตรวจสอบได้");
        } finally {
          setIsLoading(false);
        }
      },
      error: (err) => { setError(`ไม่สามารถอ่านไฟล์ได้: ${err.message}`); setIsLoading(false); },
    });
  };

  // ---- Edit handlers ----
  const handleStartEdit = (row: PreviewRow) => {
    if (row.status === "ALREADY_ENROLLED") return;

    setEditingRowIndex(row.row_index);
    setEditForm({
      student_code: row.student_code,
      email: row.email,
      facultyCode: row.facultyCode ?? DEFAULT_FACULTY_CODE,
      title: row.title || DEFAULT_TITLE,
      curriculumId: row.curriculumId ?? DEFAULT_CURRICULUM_ID,
      first_name: row.first_name,
      last_name: row.last_name,
    });
  };

  const handleSaveEdit = async () => {
    if (editingRowIndex === null || !sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const updatedRow = await apiFetch<PreviewRow>(
        `/course-offerings/${offeringId}/import/preview/${sessionId}/${editingRowIndex}`,
        { method: "PATCH", data: editForm },
      );
      setRows((prev) => prev.map((r) => (r.row_index === editingRowIndex ? updatedRow : r)));
      setEditingRowIndex(null);
    } catch (err) {
      console.error("Failed to save edit:", err);
      setError("ไม่สามารถบันทึกการแก้ไขได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => setEditingRowIndex(null);

  // ---- Remove from preview / Confirm ----
  const handleDelete = async (rowIndex: number) => {
    if (!sessionId) return;
    setError(null);
    try {
      await apiFetch(`/course-offerings/${offeringId}/import/preview/${sessionId}/${rowIndex}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.row_index !== rowIndex));
      if (editingRowIndex === rowIndex) setEditingRowIndex(null);
    } catch (err) {
      console.error("Failed to delete row:", err);
      setError("ไม่สามารถนำรายการออกจากรายการนำเข้าได้");
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) return;
    setIsLoading(true); setError(null);
    try {
      const response = await apiFetch<ConfirmResponse>(
        `/course-offerings/${offeringId}/import/confirm/${sessionId}`,
        { method: "POST" },
      );
      setConfirmResults(response);
      setStep("result");
      onSuccess?.();
    } catch (err) {
      console.error("Confirm failed:", err);
      setError("เกิดข้อผิดพลาดในการลงทะเบียน");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsv(
      `iaes-student-import-template-${getCsvDownloadDate()}.csv`,
      REQUIRED_COLUMNS,
      CSV_TEMPLATE_ROWS,
    );
  };

  const handleExportIssueRows = () => {
    const issueRows = rows.filter(
      (row) => row.status === "MISSING" || row.status === "DUPLICATE_IDENTITY",
    );
    if (issueRows.length === 0) return;
    downloadCsv(
      `iaes-student-import-preview-errors-${getCsvDownloadDate()}.csv`,
      ISSUE_EXPORT_COLUMNS,
      issueRows.map(mapPreviewRowToCsv),
    );
  };

  const handleExportResultIssues = () => {
    const issueResults = confirmResults?.results.filter(
      (result) => result.status === "failed" || result.status === "skipped",
    ) ?? [];
    if (issueResults.length === 0) return;
    downloadCsv(
      `iaes-student-import-result-errors-${getCsvDownloadDate()}.csv`,
      RESULT_ISSUE_EXPORT_COLUMNS,
      issueResults.map((result) => ({
        student_code: result.student_code,
        email: result.email,
        status: result.status,
        note: result.note,
      })),
    );
  };

  const handleClose = () => {
    setStep("upload"); setSessionId(null); setRows([]);
    setConfirmResults(null); setFilterStatus("all");
    setError(null); setEditingRowIndex(null);
    setSelectedFileName(null); setIsDragging(false); setIsLoading(false);
    dragDepthRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  // ---- Filter counts ----
  const filteredRows = rows.filter((row) => {
    if (filterStatus === "all") return true;
    return getRowCategory(row.status) === filterStatus;
  });

  const counts = {
    all: rows.length,
    new: rows.filter((r) => r.status === "NEW" || r.status === "EXISTS_NOT_ENROLLED").length,
    enrolled: rows.filter((r) => r.status === "ALREADY_ENROLLED").length,
    error: rows.filter((r) => r.status === "MISSING" || r.status === "DUPLICATE_IDENTITY").length,
  };

  const enrollableCount = rows.filter(
    (r) => r.status !== "ALREADY_ENROLLED" && r.status !== "MISSING" && r.status !== "DUPLICATE_IDENTITY",
  ).length;
  const skippedCount = rows.filter((r) => willBeSkipped(r.status)).length;
  const canConfirm = enrollableCount > 0 && !isLoading && editingRowIndex === null;
  const resultIssueCount = confirmResults
    ? confirmResults.results.filter(
        (result) => result.status === "failed" || result.status === "skipped",
      ).length
    : 0;

  const FILTER_TABS: { key: FilterStatus; label: string; activeClass: string }[] = [
    { key: "all", label: "ทั้งหมด", activeClass: "bg-[#7C5BD9] text-white border-[#7C5BD9]" },
    { key: "new", label: "นำเข้าใหม่", activeClass: "bg-green-600 text-white border-green-600" },
    { key: "enrolled", label: "ลงทะเบียนแล้ว", activeClass: "bg-purple-500 text-white border-purple-500" },
    { key: "error", label: "ผิดพลาด", activeClass: "bg-red-500 text-white border-red-500" },
  ];

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-[#E7DDF8]">

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-[#E7DDF8] bg-[#FAF8FF] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#7C5BD9] shadow-sm ring-1 ring-[#E7DDF8]">
                  <UploadCloud size={18} />
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#7C5BD9] ring-1 ring-[#E7DDF8]">
                  ขั้นตอน {STEP_COPY[step].index}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-[#2F2A3A]">
                {STEP_COPY[step].title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6A6276]">
                {STEP_COPY[step].description}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#7C5BD9] transition-colors hover:bg-white"
              aria-label="ปิดหน้าต่างนำเข้า CSV"
              title="ปิด"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600 sm:mx-6">
            <AlertTriangle size={17} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 1 — UPLOAD
            ════════════════════════════════════════════════════════ */}
        {step === "upload" && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#E7DDF8] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#2F2A3A]">
                  เริ่มจากไฟล์ตัวอย่างได้ทันที
                </p>
                <p className="mt-0.5 text-xs leading-5 text-[#7A7287]">
                  ใช้หัวคอลัมน์ที่ระบบรองรับ พร้อมตัวอย่างรหัสสำนักวิชาและหลักสูตร
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#B7A3E3] bg-[#F7F3FF] px-4 text-sm font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F1EAFF]"
              >
                <Download size={16} />
                ดาวน์โหลดตัวอย่าง CSV
              </button>
            </div>

            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center
                px-6 py-9 transition-all duration-200 sm:py-10
                ${isDragging
                  ? "scale-[1.01] border-[#7C5BD9] bg-purple-50"
                  : "border-[#D9CEF4] bg-[#FBFAFF] hover:border-[#B7A3E3] hover:bg-purple-50/40"
                }
                ${isLoading ? "pointer-events-none opacity-50" : ""}
              `}
            >
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              {isLoading ? (
                <>
                  <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#7C5BD9]" />
                  <p className="text-sm font-medium text-[#7C5BD9]">กำลังประมวลผลและตรวจสอบข้อมูล...</p>
                  {selectedFileName && (
                    <p className="mt-1 text-xs text-[#7A7287]">{selectedFileName}</p>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#7C5BD9] shadow-sm ring-1 ring-[#E7DDF8]">
                    <UploadCloud className="h-8 w-8" />
                  </div>
                  <p className="text-base font-semibold text-[#2F2A3A]">
                    {isDragging ? "วางไฟล์ CSV ที่นี่" : "ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
                  </p>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#7A7287]">
                    รองรับไฟล์ .csv เท่านั้น และอีเมลต้องใช้โดเมน @mail.wu.ac.th
                  </p>
                  {selectedFileName && (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#514667] ring-1 ring-[#E7DDF8]">
                      <FileText size={14} className="text-[#7C5BD9]" />
                      {selectedFileName}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#E7DDF8] bg-white p-4">
              <div className="flex items-start gap-3">
                <Info size={18} className="mt-0.5 shrink-0 text-[#7C5BD9]" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2F2A3A]">
                    คอลัมน์ที่รองรับ
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {REQUIRED_COLUMNS.map((column) => (
                      <span
                        key={column}
                        className="rounded-full bg-[#F4EFFF] px-3 py-1 text-xs font-medium text-[#7C5BD9]"
                      >
                        {column}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center gap-3">
              <button
                onClick={handleClose}
                className="h-11 min-w-32 cursor-pointer rounded-xl border border-[#B7A3E3] px-6 text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 2 — PREVIEW
            ════════════════════════════════════════════════════════ */}
        {step === "preview" && (
          <>
            <div className="flex-shrink-0 border-b border-[#EFE8FB] px-5 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: "ทั้งหมด", count: counts.all, className: "bg-[#F7F3FF] text-[#7C5BD9]" },
                  { label: "พร้อมนำเข้า", count: counts.new, className: "bg-green-50 text-green-700" },
                  { label: "ข้ามอัตโนมัติ", count: skippedCount, className: "bg-amber-50 text-amber-700" },
                  { label: "ผิดพลาด", count: counts.error, className: "bg-red-50 text-red-600" },
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl px-5 py-4 ${item.className}`}>
                    <p className="text-sm font-semibold leading-5">{item.label}</p>
                    <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums">{item.count}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterStatus(tab.key)}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all
                        ${filterStatus === tab.key
                          ? tab.activeClass
                          : "border-[#D9CEF4] bg-white text-[#6A6276] hover:border-[#B7A3E3] hover:text-[#7C5BD9]"
                        }`}
                    >
                      {tab.label}
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums
                        ${filterStatus === tab.key ? "bg-white/20" : "bg-gray-100 text-gray-500"}
                      `}>
                        {counts[tab.key]}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportIssueRows}
                  disabled={counts.error === 0}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={16} />
                  Export แถวที่ผิดพลาด
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-5 py-3 sm:px-6">
              <div className="min-w-[1560px] overflow-hidden rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
                <table className="w-full font-sans text-[15px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#F7F3FF] text-sm font-semibold leading-6 text-[#5B4A73]">
                      <th className="w-[128px] px-5 py-3.5 text-left">รหัสนักศึกษา</th>
                      <th className="w-[96px] px-5 py-3.5 text-left">คำนำหน้า</th>
                      <th className="w-[140px] px-5 py-3.5 text-left">ชื่อ</th>
                      <th className="w-[150px] px-5 py-3.5 text-left">นามสกุล</th>
                      <th className="w-[260px] px-5 py-3.5 text-left">อีเมล</th>
                      <th className="w-[220px] px-5 py-3.5 text-left">สำนักวิชา</th>
                      <th className="w-[240px] px-5 py-3.5 text-left">หลักสูตร</th>
                      <th className="w-[150px] px-5 py-3.5 text-center">สถานะ</th>
                      <th className="w-[220px] px-5 py-3.5 text-left">หมายเหตุ</th>
                      <th className="w-[100px] px-5 py-3.5 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-sm text-[#7A7287]">
                          ไม่พบรายการในกลุ่มนี้
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, index) => {
                        const isEditing = editingRowIndex === row.row_index;
                        const isAlreadyEnrolled = row.status === "ALREADY_ENROLLED";
                        return (
                          <tr key={row.id} className={`${getRowBg(row, index)} transition-colors hover:bg-[#FAF8FF]`}>
                            {isEditing ? (
                              <>
                                <td className="px-4 py-2.5">
                                  <input type="text" value={editForm.student_code}
                                    onChange={(e) => setEditForm((f) => ({ ...f, student_code: e.target.value }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-3 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="px-4 py-2.5">
                                  <select value={editForm.title}
                                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-2.5 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                                    {THAI_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </td>
                                <td className="px-4 py-2.5">
                                  <input type="text" value={editForm.first_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-3 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="px-4 py-2.5">
                                  <input type="text" value={editForm.last_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-3 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="px-4 py-2.5">
                                  <input type="text" value={editForm.email}
                                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-3 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="px-4 py-2.5">
                                  <select value={editForm.facultyCode}
                                    onChange={(e) => setEditForm((f) => ({ ...f, facultyCode: Number(e.target.value) }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-2.5 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                                    {Object.entries(FACULTY_MAP).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                  </select>
                                </td>
                                <td className="px-4 py-2.5">
                                  <select value={editForm.curriculumId}
                                    onChange={(e) => setEditForm((f) => ({ ...f, curriculumId: e.target.value }))}
                                    className="w-full rounded-lg border border-[#B7A3E3] px-2.5 py-2.5 font-sans text-sm focus:outline-none focus:ring-2 focus:ring-purple-300">
                                    {CURRICULUMS.map((c) => <option key={c.id} value={c.id}>{getCurriculumName(c.id)}</option>)}
                                  </select>
                                </td>
                                <td className="px-4 py-2.5 text-center">
                                  <span className="text-sm italic text-[#7A7287]">กำลังแก้ไข</span>
                                </td>
                                <td className="px-4 py-2.5">-</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <button onClick={handleSaveEdit} disabled={isLoading}
                                      className="rounded-md p-1.5 text-green-600 hover:bg-green-50 transition-colors cursor-pointer" title="บันทึก">
                                      <Save size={15} />
                                    </button>
                                    <button onClick={handleCancelEdit}
                                      className="rounded-md p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors cursor-pointer" title="ยกเลิก">
                                      <X size={15} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className={`whitespace-nowrap px-5 py-3.5 font-sans tabular-nums ${!row.student_code ? "text-gray-300 italic" : "text-[#2F2A3A]"}`}>
                                  {row.student_code || "-"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-[#514667]">{row.title || "-"}</td>
                                <td className="px-5 py-3.5 text-[#2F2A3A]">{row.first_name || "-"}</td>
                                <td className="px-5 py-3.5 text-[#2F2A3A]">{row.last_name || "-"}</td>
                                <td className={`whitespace-nowrap px-5 py-3.5 ${!row.email ? "text-gray-300 italic" : "text-[#514667]"}`}>
                                  {row.email || "-"}
                                </td>
                                <td className="px-5 py-3.5 leading-6 text-[#514667]">
                                  {row.facultyCode != null ? getFacultyName(row.facultyCode) : "-"}
                                </td>
                                <td className="px-5 py-3.5 leading-6 text-[#514667]">
                                  {row.curriculumId ? getCurriculumName(row.curriculumId) : "-"}
                                </td>
                                <td className="px-5 py-3.5 text-center">
                                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${STATUS_MAP[row.status].className}`}>
                                    {STATUS_MAP[row.status].label}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-sm leading-6 text-[#7A7287]" title={row.note}>
                                  {row.note || "-"}
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(row)}
                                      disabled={isAlreadyEnrolled}
                                      className={`rounded-md p-1.5 transition-colors ${
                                        isAlreadyEnrolled
                                          ? "cursor-not-allowed text-gray-300 opacity-60"
                                          : "cursor-pointer text-[#B7A3E3] hover:bg-purple-50 hover:text-[#7C5BD9]"
                                      }`}
                                      title={isAlreadyEnrolled ? "ลงทะเบียนแล้ว ไม่สามารถแก้ไขได้" : "แก้ไข"}
                                      aria-label={isAlreadyEnrolled ? "ลงทะเบียนแล้ว ไม่สามารถแก้ไขได้" : "แก้ไข"}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(row.row_index)}
                                      className="rounded-md p-1.5 text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer"
                                      title="นำออกจากรายการนำเข้า (ไม่ลบข้อมูลในระบบ)"
                                      aria-label="นำออกจากรายการนำเข้า ไม่ลบข้อมูลในระบบ"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="flex-shrink-0 border-t border-[#EFE8FB] px-6 py-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleClose}
                  className="h-11 min-w-28 cursor-pointer rounded-xl border border-[#B7A3E3] px-6 text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50"
                >
                  ยกเลิก
                </button>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {editingRowIndex !== null ? (
                    <p className="text-sm text-amber-600">บันทึกหรือยกเลิกการแก้ไขแถวก่อนยืนยัน</p>
                  ) : enrollableCount === 0 ? (
                    <p className="text-sm text-[#7A7287]">ไม่มีรายการที่พร้อมนำเข้า</p>
                  ) : (
                    <p className="text-sm text-[#514667]">
                      พร้อมนำเข้า <span className="font-semibold text-[#7C5BD9]">{enrollableCount}</span> รายการ
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#7C5BD9] px-6 text-sm font-medium text-white transition-all hover:bg-[#6A4BC5] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isLoading && <Loader2 size={16} className="animate-spin" />}
                    ยืนยันการนำเข้า
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 3 — RESULT
            ════════════════════════════════════════════════════════ */}
        {step === "result" && confirmResults && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { icon: CheckCircle2, count: confirmResults.summary.enrolled, label: "ลงทะเบียนสำเร็จ", color: "text-green-600 border-green-200 bg-green-50" },
                  { icon: Users, count: confirmResults.summary.alreadyEnrolled, label: "ลงทะเบียนแล้ว", color: "text-purple-600 border-purple-200 bg-purple-50" },
                  { icon: AlertTriangle, count: confirmResults.summary.skipped, label: "ข้าม", color: "text-amber-600 border-amber-200 bg-amber-50" },
                  { icon: XCircle, count: confirmResults.summary.failed, label: "ผิดพลาด", color: "text-red-600 border-red-200 bg-red-50" },
                ].map((card, i) => (
                  <div key={i} className={`flex items-center gap-4 rounded-2xl border px-5 py-4 ${card.color}`}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/70">
                      <card.icon size={21} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-2xl font-semibold leading-none tabular-nums">{card.count}</span>
                      <span className="mt-1.5 block text-sm font-semibold leading-5">{card.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#E7DDF8] bg-[#FAF8FF] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-semibold text-[#2F2A3A]">
                    รายการทั้งหมด {confirmResults.summary.total} รายการ
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#7A7287]">
                    ตรวจสอบรายการที่ข้ามหรือผิดพลาดก่อนปิดหน้าต่าง
                  </p>
                </div>
                {resultIssueCount > 0 && (
                  <button
                    type="button"
                    onClick={handleExportResultIssues}
                    className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100"
                  >
                    <Download size={16} />
                    Export รายการไม่สำเร็จ
                  </button>
                )}
              </div>

              {/* Results Table */}
              <div className="mt-4 overflow-auto rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
                <table className="min-w-[980px] w-full font-sans text-[15px]">
                  <thead>
                    <tr className="bg-[#F7F3FF] text-sm font-semibold leading-6 text-[#5B4A73]">
                      <th className="w-[160px] px-5 py-3.5 text-left">รหัสนักศึกษา</th>
                      <th className="w-[320px] px-5 py-3.5 text-left">อีเมล</th>
                      <th className="w-[170px] px-5 py-3.5 text-center">สถานะ</th>
                      <th className="px-5 py-3.5 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {confirmResults.results.map((r, i) => (
                      <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} transition-colors hover:bg-[#FAF8FF]`}>
                        <td className="whitespace-nowrap px-5 py-3.5 font-sans tabular-nums text-[#2F2A3A]">{r.student_code}</td>
                        <td className="whitespace-nowrap px-5 py-3.5 text-[#514667]">{r.email}</td>
                        <td className="px-5 py-3.5 text-center">
                          {r.status === "enrolled" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 ring-1 ring-green-200">
                              <CheckCircle2 size={14} /> สำเร็จ
                            </span>
                          ) : r.status === "already_enrolled" ? (
                            <span className="rounded-full bg-purple-50 px-3 py-1 text-sm font-medium text-purple-700 ring-1 ring-purple-200">
                              ลงทะเบียนแล้ว
                            </span>
                          ) : r.status === "skipped" ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 ring-1 ring-amber-200">
                              ข้าม
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 ring-1 ring-red-200">
                              ผิดพลาด
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-sm leading-6 text-[#7A7287]">{r.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-shrink-0 justify-center border-t border-[#EFE8FB] px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="h-11 min-w-36 cursor-pointer rounded-xl bg-[#7C5BD9] px-8 text-sm font-medium text-white transition-colors hover:bg-[#6A4BC5]"
              >
                ปิด
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
