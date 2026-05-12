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
  X,
  XCircle,
} from "lucide-react";
import Papa from "papaparse";
import { apiFetch } from "@/lib/api";
import { FIELD_LIMITS, maxLengthMessage } from "@/config/fieldLimits";

// ── Types ──

interface PreviewRow {
  id: string;
  row_index: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_choice: number;
  difficulty: string;
  knowledge_categories: string;
  status: "NEW" | "ERROR";
  note?: string;
  is_deleted: boolean;
}

interface PreviewSessionResponse {
  sessionId: string;
  expiresAt: string;
  rows: PreviewRow[];
  summary: {
    total: number;
    ready: number;
    errors: number;
  };
}

interface ConfirmResponse {
  results: {
    row_index: number;
    question_text: string;
    status: "imported" | "failed" | "skipped";
    note?: string;
  }[];
  summary: {
    total: number;
    imported: number;
    failed: number;
    skipped: number;
  };
}

interface BulkUploadQuestionProps {
  isOpen: boolean;
  onClose: () => void;
  offeringId: string;
  onSuccess?: () => void;
}

type FilterStatus = "all" | "ready" | "error";
type ImportStep = "upload" | "preview" | "result";

const DIFFICULTY_LABELS = ["ง่าย", "กลาง", "ยาก"] as const;
const DIFFICULTY_MAP: Record<string, string> = { easy: "ง่าย", medium: "กลาง", hard: "ยาก" };

const CSV_TEMPLATE_ROWS = [
  {
    question_text: "ข้อใดคือเมืองหลวงของประเทศไทย?",
    choice_1: "เชียงใหม่",
    choice_2: "กรุงเทพมหานคร",
    choice_3: "ภูเก็ต",
    choice_4: "พัทยา",
    correct: 2,
    difficulty: "ง่าย",
    knowledge_categories: "ภูมิศาสตร์",
  },
  {
    question_text: "สูตรเคมีของน้ำคืออะไร?",
    choice_1: "CO2",
    choice_2: "H2O",
    choice_3: "NaCl",
    choice_4: "O2",
    correct: 2,
    difficulty: "ง่าย",
    knowledge_categories: "เคมี,วิทยาศาสตร์ทั่วไป",
  },
];

const REQUIRED_COLUMNS = [
  "question_text",
  "choice_1",
  "choice_2",
  "choice_3",
  "choice_4",
  "correct",
  "difficulty",
  "knowledge_categories",
];

const RESULT_ISSUE_EXPORT_COLUMNS = ["row_index", ...REQUIRED_COLUMNS, "status", "note"];

type CsvValue = string | number | null | undefined;
type CsvRow = Record<string, CsvValue>;

// ── Helpers ──

function readCsvCell(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function parseDifficulty(value: unknown): string {
  const text = String(value ?? "").trim();
  if (DIFFICULTY_LABELS.includes(text as (typeof DIFFICULTY_LABELS)[number])) return text;
  const mapped = DIFFICULTY_MAP[text.toLowerCase()];
  if (mapped) return mapped;
  return text || "";
}

function parseCorrect(value: unknown): number | string {
  const text = String(value ?? "").trim();
  const n = parseInt(text, 10);
  if (n >= 1 && n <= 4) return n;
  return text || "";
}

function downloadCsv(filename: string, columns: string[], rows: CsvRow[]) {
  const csv = Papa.unparse({
    fields: columns,
    data: rows.map((row) => columns.map((column) => row[column] ?? "")),
  });
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
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
    question_text: row.question_text,
    choice_1: row.choice_1,
    choice_2: row.choice_2,
    choice_3: row.choice_3,
    choice_4: row.choice_4,
    correct: row.correct_choice,
    difficulty: row.difficulty,
    knowledge_categories: row.knowledge_categories,
    status: row.status,
    note: row.note,
  };
}

function getCsvDownloadDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function BulkUploadQuestion({
  isOpen,
  onClose,
  offeringId,
  onSuccess,
}: BulkUploadQuestionProps) {
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
    question_text: "",
    choice_1: "",
    choice_2: "",
    choice_3: "",
    choice_4: "",
    correct: 1 as number,
    difficulty: "ง่าย",
    knowledge_categories: "",
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  if (!isOpen) return null;

  // ── Validation ──

  const validateEditForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!editForm.question_text.trim())
      errs.question_text = "ต้องระบุข้อความคำถาม";
    else if (editForm.question_text.length > FIELD_LIMITS.questionText)
      errs.question_text = maxLengthMessage("ข้อความคำถาม", FIELD_LIMITS.questionText);
    if (!editForm.choice_1.trim()) errs.choice_1 = "ต้องระบุตัวเลือกที่ 1";
    else if (editForm.choice_1.length > FIELD_LIMITS.choiceText)
      errs.choice_1 = maxLengthMessage("ตัวเลือกที่ 1", FIELD_LIMITS.choiceText);
    if (!editForm.choice_2.trim()) errs.choice_2 = "ต้องระบุตัวเลือกที่ 2";
    else if (editForm.choice_2.length > FIELD_LIMITS.choiceText)
      errs.choice_2 = maxLengthMessage("ตัวเลือกที่ 2", FIELD_LIMITS.choiceText);
    if (!editForm.choice_3.trim()) errs.choice_3 = "ต้องระบุตัวเลือกที่ 3";
    else if (editForm.choice_3.length > FIELD_LIMITS.choiceText)
      errs.choice_3 = maxLengthMessage("ตัวเลือกที่ 3", FIELD_LIMITS.choiceText);
    if (!editForm.choice_4.trim()) errs.choice_4 = "ต้องระบุตัวเลือกที่ 4";
    else if (editForm.choice_4.length > FIELD_LIMITS.choiceText)
      errs.choice_4 = maxLengthMessage("ตัวเลือกที่ 4", FIELD_LIMITS.choiceText);
    if (editForm.correct < 1 || editForm.correct > 4)
      errs.correct = "คำตอบที่ถูกต้องเป็น 1-4";
    if (!DIFFICULTY_LABELS.includes(editForm.difficulty as (typeof DIFFICULTY_LABELS)[number]))
      errs.difficulty = "ระดับความยากต้องเป็น ง่าย, กลาง, หรือ ยาก";
    if (!editForm.knowledge_categories.trim())
      errs.knowledge_categories = "ต้องระบุหมวดหมู่ความรู้อย่างน้อย 1 รายการ";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step copy ──

  const STEP_COPY: Record<ImportStep, { title: string; description: string; index: string }> = {
    upload: {
      title: "นำเข้าข้อสอบจาก CSV",
      description: "อัปโหลดไฟล์ข้อสอบ ระบบจะตรวจสอบความถูกต้องก่อนนำเข้าจริง",
      index: "1/3",
    },
    preview: {
      title: "ตรวจสอบข้อมูลก่อนยืนยัน",
      description: "แก้ไขหรือลบแถวที่ผิดก่อนยืนยัน เฉพาะรายการที่พร้อมนำเข้าจะถูกบันทึก",
      index: "2/3",
    },
    result: {
      title: "ผลลัพธ์การนำเข้า",
      description: "สรุปรายการที่นำเข้าสำเร็จ รายการที่ข้าม และรายการที่ผิดพลาด",
      index: "3/3",
    },
  };

  const getRowCategory = (status: string): FilterStatus => {
    if (status === "NEW") return "ready";
    return "error";
  };

  const getRowBg = (row: PreviewRow, index: number) => {
    if (row.status === "ERROR") return "bg-red-50/50";
    return index % 2 === 0 ? "bg-white" : "bg-gray-50/50";
  };

  // ── Upload ──

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };

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
              question_text: readCsvCell(row, ["question_text", "ข้อความคำถาม", "questionText", "question"]),
              choice_1: readCsvCell(row, ["choice_1", "ตัวเลือกที่ 1", "choice1"]),
              choice_2: readCsvCell(row, ["choice_2", "ตัวเลือกที่ 2", "choice2"]),
              choice_3: readCsvCell(row, ["choice_3", "ตัวเลือกที่ 3", "choice3"]),
              choice_4: readCsvCell(row, ["choice_4", "ตัวเลือกที่ 4", "choice4"]),
              correct: parseCorrect(readCsvCell(row, ["correct", "คำตอบที่ถูก", "answer", "correct_choice"])),
              difficulty: parseDifficulty(readCsvCell(row, ["difficulty", "ระดับความยาก", "level"])),
              knowledge_categories: readCsvCell(row, ["knowledge_categories", "หมวดหมู่ความรู้", "categories", "tags"]),
            };
          });

          if (parsedRows.length === 0) {
            setError("ไฟล์ CSV ไม่มีข้อมูลสำหรับนำเข้า");
            return;
          }

          const response = await apiFetch<PreviewSessionResponse>(
            `/course-offerings/${offeringId}/question-bank/import/preview`,
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
      error: (err) => {
        setError(`ไม่สามารถอ่านไฟล์ได้: ${err.message}`);
        setIsLoading(false);
      },
    });
  };

  // ── Edit ──

  const handleStartEdit = (row: PreviewRow) => {
    setEditingRowIndex(row.row_index);
    setEditForm({
      question_text: row.question_text,
      choice_1: row.choice_1,
      choice_2: row.choice_2,
      choice_3: row.choice_3,
      choice_4: row.choice_4,
      correct: row.correct_choice,
      difficulty: row.difficulty,
      knowledge_categories: row.knowledge_categories,
    });
    setEditErrors({});
  };

  const handleSaveEdit = async () => {
    if (editingRowIndex === null || !sessionId) return;
    if (!validateEditForm()) return;
    setIsLoading(true);
    setError(null);
    try {
      const updatedRow = await apiFetch<PreviewRow>(
        `/course-offerings/${offeringId}/question-bank/import/preview/${sessionId}/${editingRowIndex}`,
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

  // ── Delete / Confirm ──

  const handleDelete = async (rowIndex: number) => {
    if (!sessionId) return;
    setError(null);
    try {
      await apiFetch(
        `/course-offerings/${offeringId}/question-bank/import/preview/${sessionId}/${rowIndex}`,
        { method: "DELETE" },
      );
      setRows((prev) => prev.filter((r) => r.row_index !== rowIndex));
      if (editingRowIndex === rowIndex) setEditingRowIndex(null);
    } catch (err) {
      console.error("Failed to delete row:", err);
      setError("ไม่สามารถนำรายการออกจากรายการนำเข้าได้");
    }
  };

  const handleConfirm = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch<ConfirmResponse>(
        `/course-offerings/${offeringId}/question-bank/import/confirm/${sessionId}`,
        { method: "POST" },
      );
      setConfirmResults(response);
      setStep("result");
      onSuccess?.();
    } catch (err) {
      console.error("Confirm failed:", err);
      setError("เกิดข้อผิดพลาดในการนำเข้าข้อสอบ");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Download helpers ──

  const handleDownloadTemplate = () => {
    downloadCsv(
      `iaes-question-import-template-${getCsvDownloadDate()}.csv`,
      REQUIRED_COLUMNS,
      CSV_TEMPLATE_ROWS,
    );
  };

  const handleExportIssueRows = () => {
    const issueRows = rows.filter((row) => row.status === "ERROR");
    if (issueRows.length === 0) return;
    downloadCsv(
      `iaes-question-import-preview-errors-${getCsvDownloadDate()}.csv`,
      [...REQUIRED_COLUMNS, "status", "note"],
      issueRows.map(mapPreviewRowToCsv),
    );
  };

  const handleExportResultIssues = () => {
    const issueResults =
      confirmResults?.results.filter(
        (r) => r.status === "failed" || r.status === "skipped",
      ) ?? [];
    if (issueResults.length === 0) return;
    downloadCsv(
      `iaes-question-import-result-errors-${getCsvDownloadDate()}.csv`,
      RESULT_ISSUE_EXPORT_COLUMNS,
      issueResults.map((r) => {
        const previewRow = rows.find((row) => row.row_index === r.row_index);

        return {
          row_index: r.row_index + 1,
          question_text: r.question_text,
          choice_1: previewRow?.choice_1,
          choice_2: previewRow?.choice_2,
          choice_3: previewRow?.choice_3,
          choice_4: previewRow?.choice_4,
          correct: previewRow?.correct_choice,
          difficulty: previewRow?.difficulty,
          knowledge_categories: previewRow?.knowledge_categories,
          status: r.status,
          note: r.note,
        };
      }),
    );
  };

  const handleClose = () => {
    setStep("upload");
    setSessionId(null);
    setRows([]);
    setConfirmResults(null);
    setFilterStatus("all");
    setError(null);
    setEditingRowIndex(null);
    setSelectedFileName(null);
    setIsDragging(false);
    setIsLoading(false);
    dragDepthRef.current = 0;
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  // ── Filter counts ──

  const filteredRows = rows.filter((row) => {
    if (filterStatus === "all") return true;
    return getRowCategory(row.status) === filterStatus;
  });

  const counts = {
    all: rows.length,
    ready: rows.filter((r) => r.status === "NEW").length,
    error: rows.filter((r) => r.status === "ERROR").length,
  };

  const readyCount = rows.filter((r) => r.status === "NEW").length;
  const errorCount = rows.filter((r) => r.status === "ERROR").length;
  const canConfirm = readyCount > 0 && !isLoading && editingRowIndex === null;

  const resultIssueCount =
    confirmResults?.results.filter(
      (r) => r.status === "failed" || r.status === "skipped",
    ).length ?? 0;

  const FILTER_TABS: { key: FilterStatus; label: string; activeClass: string }[] = [
    { key: "all", label: "ทั้งหมด", activeClass: "bg-[#7C5BD9] text-white border-[#7C5BD9]" },
    { key: "ready", label: "พร้อมนำเข้า", activeClass: "bg-green-600 text-white border-green-600" },
    { key: "error", label: "ผิดพลาด", activeClass: "bg-red-500 text-white border-red-500" },
  ];

  const STATUS_MAP: Record<PreviewRow["status"], { label: string; className: string }> = {
    NEW: { label: "พร้อมนำเข้า", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    ERROR: { label: "ผิดพลาด", className: "bg-red-50 text-red-600 ring-1 ring-red-200" },
  };

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

        {/* ═══ STEP 1 — UPLOAD ═══ */}
        {step === "upload" && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#E7DDF8] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-semibold leading-6 text-[#2F2A3A]">เริ่มจากไฟล์ตัวอย่างได้ทันที</p>
                <p className="mt-1 text-sm leading-6 text-[#7A7287]">
                  ใช้หัวคอลัมน์ที่ระบบรองรับ พร้อมตัวอย่างคำถาม
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex h-12 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-[#D9CCF2] bg-white px-5 text-base font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF]"
              >
                <Download size={18} />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-all duration-200 sm:py-10 ${
                isDragging
                  ? "scale-[1.01] border-[#7C5BD9] bg-purple-50"
                  : "border-[#D9CEF4] bg-[#FBFAFF] hover:border-[#B7A3E3] hover:bg-purple-50/40"
              } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
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
                    รองรับเฉพาะไฟล์ .csv ที่มีหัวคอลัมน์คำถาม ตัวเลือก คำตอบ ความยาก และหมวดหมู่ความรู้
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
                  <p className="text-base font-semibold leading-6 text-[#2F2A3A]">
                    หัวคอลัมน์ที่รองรับ
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="rounded-xl border border-[#EFE8FB] bg-[#FBFAFF] px-4 py-3">
                      <p className="text-sm font-semibold leading-5 text-[#2F2A3A]">ข้อความคำถาม</p>
                      <code className="mt-2 inline-flex rounded-lg bg-[#F4EFFF] px-2.5 py-1 text-sm font-semibold text-[#7C5BD9]">
                        question_text
                      </code>
                    </div>
                    <div className="rounded-xl border border-[#EFE8FB] bg-[#FBFAFF] px-4 py-3">
                      <p className="text-sm font-semibold leading-5 text-[#2F2A3A]">ตัวเลือกคำตอบ</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {["choice_1", "choice_2", "choice_3", "choice_4"].map((column) => (
                          <code key={column} className="rounded-lg bg-[#F4EFFF] px-2.5 py-1 text-sm font-semibold text-[#7C5BD9]">
                            {column}
                          </code>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#EFE8FB] bg-[#FBFAFF] px-4 py-3">
                      <p className="text-sm font-semibold leading-5 text-[#2F2A3A]">คำตอบที่ถูก</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="rounded-lg bg-[#F4EFFF] px-2.5 py-1 text-sm font-semibold text-[#7C5BD9]">
                          correct
                        </code>
                        <span className="text-sm leading-6 text-[#6A6276]">หมายเลข 1-4</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#EFE8FB] bg-[#FBFAFF] px-4 py-3">
                      <p className="text-sm font-semibold leading-5 text-[#2F2A3A]">ระดับความยาก</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="rounded-lg bg-[#F4EFFF] px-2.5 py-1 text-sm font-semibold text-[#7C5BD9]">
                          difficulty
                        </code>
                        <span className="text-sm leading-6 text-[#6A6276]">ง่าย / กลาง / ยาก</span>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#EFE8FB] bg-[#FBFAFF] px-4 py-3 lg:col-span-2">
                      <p className="text-sm font-semibold leading-5 text-[#2F2A3A]">หมวดหมู่ความรู้</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="rounded-lg bg-[#F4EFFF] px-2.5 py-1 text-sm font-semibold text-[#7C5BD9]">
                          knowledge_categories
                        </code>
                        <span className="text-sm leading-6 text-[#6A6276]">คั่นหลายหมวดหมู่ด้วยคอมม่า</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="h-11 min-w-32 cursor-pointer rounded-xl border border-[#B7A3E3] px-6 text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2 — PREVIEW ═══ */}
        {step === "preview" && (
          <>
            <div className="flex-shrink-0 border-b border-[#EFE8FB] px-5 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { key: "all" as const, label: "ทั้งหมด", count: counts.all, className: "bg-[#F7F3FF] text-[#7C5BD9]" },
                  { key: "ready" as const, label: "พร้อมนำเข้า", count: counts.ready, className: "bg-green-50 text-green-700" },
                  { key: "error" as const, label: "ผิดพลาด", count: counts.error, className: "bg-red-50 text-red-600" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFilterStatus(item.key)}
                    className={`cursor-pointer rounded-2xl px-5 py-4 text-left transition-colors ${item.className} ${
                      filterStatus === item.key ? "ring-2 ring-[#B7A3E3]" : "hover:ring-1 hover:ring-[#E7DDF8]"
                    }`}
                  >
                    <p className="text-sm font-semibold leading-5">{item.label}</p>
                    <p className="mt-1.5 text-2xl font-semibold leading-none tabular-nums">{item.count}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {FILTER_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setFilterStatus(tab.key)}
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                        filterStatus === tab.key
                          ? tab.activeClass
                          : "border-[#D9CEF4] bg-white text-[#6A6276] hover:border-[#B7A3E3] hover:text-[#7C5BD9]"
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          filterStatus === tab.key ? "bg-white/20" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {counts[tab.key]}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportIssueRows}
                  disabled={errorCount === 0}
                  className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Download size={16} />
                  Export แถวที่ผิดพลาด
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-5 py-3 sm:px-6">
              <div className="min-w-[1720px] overflow-hidden rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
                <table className="w-full text-left font-sans text-[15px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#F7F3FF] text-sm font-semibold leading-6 text-[#5B4A73]">
                      <th className="w-[60px] px-5 py-3.5 text-center">#</th>
                      <th className="w-[520px] px-5 py-3.5 text-left">คำถาม</th>
                      <th className="w-[80px] px-5 py-3.5 text-center">ตอบ</th>
                      <th className="w-[120px] px-5 py-3.5 text-left">ความยาก</th>
                      <th className="w-[240px] px-5 py-3.5 text-left">หมวดหมู่</th>
                      <th className="w-[180px] px-5 py-3.5 text-center">สถานะ</th>
                      <th className="w-[260px] px-5 py-3.5 text-left">หมายเหตุ</th>
                      <th className="w-[120px] px-5 py-3.5 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-sm text-[#7A7287]">
                          ไม่พบรายการในกลุ่มนี้
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row, index) => {
                        const isEditing = editingRowIndex === row.row_index;
                        return (
                          <tr key={row.row_index} className={`${getRowBg(row, index)} transition-colors hover:bg-[#FAF8FF]`}>
                            <td className="px-5 py-3.5 text-center text-sm text-[#7A7287]">
                              {row.row_index + 1}
                            </td>

                            {/* Question text + choices */}
                            <td className="px-5 py-3.5">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editForm.question_text}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, question_text: e.target.value })
                                    }
                                    rows={2}
                                    className="w-full resize-y rounded-lg border border-[#B7A3E3] bg-white px-3 py-2.5 font-sans text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                    placeholder="ข้อความคำถาม"
                                  />
                                  {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="flex items-center gap-2">
                                      <span className={`w-5 text-xs font-bold ${editForm.correct === n ? "text-emerald-600" : "text-[#7A7287]"}`}>
                                        {n}{editForm.correct === n ? "✓" : ""}
                                      </span>
                                      <input
                                        value={editForm[`choice_${n}` as keyof typeof editForm] as string}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, [`choice_${n}`]: e.target.value })
                                        }
                                        className="flex-1 rounded-lg border border-[#B7A3E3] bg-white px-3 py-2 font-sans text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                        placeholder={`ตัวเลือกที่ ${n}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="min-w-0">
                                  <p className="line-clamp-2 text-[15px] font-semibold leading-6 text-[#2F2A3A]">
                                    {row.question_text}
                                  </p>
                                  <div className="mt-2 grid grid-cols-2 gap-x-5 gap-y-1.5">
                                    {[row.choice_1, row.choice_2, row.choice_3, row.choice_4].map((c, ci) => (
                                      <span
                                        key={ci}
                                        className={`truncate text-sm leading-6 ${
                                          row.correct_choice === ci + 1
                                            ? "font-semibold text-emerald-700"
                                            : "text-[#7A7287]"
                                        }`}
                                      >
                                        {ci + 1}. {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Correct choice */}
                            <td className="px-5 py-3.5 text-center">
                              {isEditing ? (
                                <select
                                  value={editForm.correct}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, correct: parseInt(e.target.value) })
                                  }
                                  className="rounded-lg border border-[#B7A3E3] bg-white px-2.5 py-2.5 font-sans text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                >
                                  {[1, 2, 3, 4].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                                  {row.correct_choice}
                                </span>
                              )}
                            </td>

                            {/* Difficulty */}
                            <td className="px-5 py-3.5">
                              {isEditing ? (
                                <select
                                  value={editForm.difficulty}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, difficulty: e.target.value })
                                  }
                                  className="w-full rounded-lg border border-[#B7A3E3] bg-white px-2.5 py-2.5 font-sans text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                >
                                  {DIFFICULTY_LABELS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
                                    row.difficulty === "ง่าย"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : row.difficulty === "กลาง"
                                        ? "bg-amber-100 text-amber-700"
                                        : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {row.difficulty || "-"}
                                </span>
                              )}
                            </td>

                            {/* Knowledge categories */}
                            <td className="px-5 py-3.5">
                              {isEditing ? (
                                <input
                                  value={editForm.knowledge_categories}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, knowledge_categories: e.target.value })
                                  }
                                  className="w-full rounded-lg border border-[#B7A3E3] bg-white px-3 py-2.5 font-sans text-sm outline-none focus:ring-2 focus:ring-purple-300"
                                  placeholder="คั่นด้วย ,"
                                />
                              ) : (
                                <p className="line-clamp-2 max-w-[250px] text-sm leading-6 text-[#514667]" title={row.knowledge_categories}>
                                  {row.knowledge_categories || "-"}
                                </p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-5 py-3.5 text-center">
                              <span
                                className={`inline-flex min-w-[112px] justify-center rounded-full px-3.5 py-1 text-sm font-medium ${
                                  STATUS_MAP[row.status].className
                                }`}
                              >
                                {STATUS_MAP[row.status].label}
                              </span>
                            </td>

                            {/* Note */}
                            <td className="px-5 py-3.5 text-sm leading-6 text-[#7A7287]" title={row.status === "NEW" ? undefined : row.note}>
                              <p className="line-clamp-2 max-w-[240px]">
                                {row.status === "NEW" ? "-" : row.note || "-"}
                              </p>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-3.5">
                              <div className="flex items-center justify-center gap-2">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleSaveEdit}
                                      disabled={isLoading}
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-green-600 transition-colors hover:bg-green-50"
                                      title="บันทึก"
                                    >
                                      <Save size={17} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                                      title="ยกเลิก"
                                    >
                                      <X size={17} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(row)}
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[#B7A3E3] transition-colors hover:bg-purple-50 hover:text-[#7C5BD9]"
                                      title="แก้ไข"
                                    >
                                      <Edit2 size={17} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(row.row_index)}
                                      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-red-50 hover:text-red-500"
                                      title="ลบ"
                                    >
                                      <Trash2 size={17} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Edit validation errors */}
              {editingRowIndex !== null && Object.keys(editErrors).length > 0 && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
                  {Object.entries(editErrors).map(([key, msg]) => (
                    <p key={key}>&bull; {msg}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-[#EFE8FB] px-6 py-4">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("upload");
                      setSessionId(null);
                      setRows([]);
                      setFilterStatus("all");
                      setError(null);
                      setEditingRowIndex(null);
                      setSelectedFileName(null);
                    }}
                    className="h-11 min-w-28 cursor-pointer rounded-xl border border-[#D9CCF2] bg-white px-6 text-sm font-medium text-[#514667] transition-colors hover:bg-[#F4EFFF]"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="h-11 min-w-28 cursor-pointer rounded-xl border border-[#B7A3E3] px-6 text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50"
                  >
                    ยกเลิก
                  </button>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {editingRowIndex !== null ? (
                    <p className="text-sm text-amber-600">บันทึกหรือยกเลิกการแก้ไขแถวก่อนยืนยัน</p>
                  ) : readyCount === 0 ? (
                    <p className="text-sm text-[#7A7287]">ไม่มีรายการที่พร้อมนำเข้า</p>
                  ) : (
                    <p className="text-sm text-[#514667]">
                      พร้อมนำเข้า <span className="font-semibold text-[#7C5BD9]">{readyCount}</span> รายการ
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

        {/* ═══ STEP 3 — RESULT ═══ */}
        {step === "result" && confirmResults && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { icon: FileText, count: confirmResults.summary.total, label: "ทั้งหมด", color: "text-[#7C5BD9] border-[#E7DDF8] bg-[#F7F3FF]" },
                  { icon: CheckCircle2, count: confirmResults.summary.imported, label: "นำเข้าสำเร็จ", color: "text-green-600 border-green-200 bg-green-50" },
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

              <div className="mt-4 overflow-auto rounded-2xl bg-white ring-1 ring-[#E7DDF8]">
                <table className="min-w-[1480px] w-full text-left font-sans text-[15px]">
                  <thead>
                    <tr className="bg-[#F7F3FF] text-sm font-semibold leading-6 text-[#5B4A73]">
                      <th className="w-[60px] px-5 py-3.5 text-center">#</th>
                      <th className="w-[520px] px-5 py-3.5 text-left">คำถาม</th>
                      <th className="w-[80px] px-5 py-3.5 text-center">ตอบ</th>
                      <th className="w-[120px] px-5 py-3.5 text-center">ความยาก</th>
                      <th className="w-[240px] px-5 py-3.5 text-left">หมวดหมู่</th>
                      <th className="w-[180px] px-5 py-3.5 text-center">สถานะ</th>
                      <th className="w-[260px] px-5 py-3.5 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {confirmResults.results.map((r, i) => {
                      const previewRow = rows.find((row) => row.row_index === r.row_index);
                      const statusStyle =
                        r.status === "imported"
                          ? "bg-green-50 text-green-700 ring-green-200"
                          : r.status === "skipped"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-red-50 text-red-600 ring-red-200";
                      const statusLabel =
                        r.status === "imported"
                          ? "สำเร็จ"
                          : r.status === "skipped"
                            ? "ข้าม"
                            : "ล้มเหลว";
                      const resultNote =
                        r.status === "imported"
                          ? "-"
                          : (previewRow?.note || r.note || "-");

                      return (
                        <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} transition-colors hover:bg-[#FAF8FF]`}>
                          <td className="px-5 py-3.5 text-center text-sm text-[#7A7287]">
                            {r.row_index + 1}
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="max-w-[500px] truncate text-[15px] font-medium leading-6 text-[#2F2A3A]" title={r.question_text}>
                              {r.question_text}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            {previewRow?.correct_choice ? (
                              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-emerald-100 px-3 text-sm font-semibold text-emerald-700">
                                {previewRow.correct_choice}
                              </span>
                            ) : (
                              <span className="text-[#7A7287]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className="inline-flex min-w-[72px] justify-center rounded-full bg-[#F4EFFF] px-3.5 py-1 text-sm font-medium text-[#6A4BC5]">
                              {previewRow?.difficulty || "-"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm leading-6 text-[#514667]">
                            <p className="line-clamp-2 max-w-[220px]" title={previewRow?.knowledge_categories}>
                              {previewRow?.knowledge_categories || "-"}
                            </p>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span
                              className={`inline-flex min-w-[112px] justify-center rounded-full px-3.5 py-1 text-sm font-medium ring-1 ${statusStyle}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-sm leading-6 text-[#7A7287]" title={r.status === "imported" ? undefined : resultNote}>
                            <p className="line-clamp-2 max-w-[240px]">
                              {resultNote}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
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
