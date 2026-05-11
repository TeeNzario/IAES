"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit2,
  FileText,
  Loader2,
  Save,
  Trash2,
  UploadCloud,
  X,
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
      ["row_index", "question_text", "status", "note"],
      issueResults.map((r) => ({
        row_index: r.row_index,
        question_text: r.question_text,
        status: r.status,
        note: r.note,
      })),
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
                <p className="text-sm font-semibold text-[#2F2A3A]">เริ่มจากไฟล์ตัวอย่างได้ทันที</p>
                <p className="mt-0.5 text-xs leading-5 text-[#7A7287]">
                  ใช้หัวคอลัมน์ที่ระบบรองรับ พร้อมตัวอย่างคำถาม
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#D9CCF2] bg-white px-4 text-sm font-semibold text-[#7C5BD9] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
              >
                <Download size={16} />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </button>
            </div>

            {/* Column guide */}
            <div className="mb-4 rounded-xl border border-[#E7DDF8] bg-white p-4">
              <p className="text-sm font-semibold text-[#2F2A3A] mb-2">
                หัวคอลัมน์ที่รองรับ (ไทย / อังกฤษ)
              </p>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-[#7A7287] sm:grid-cols-2">
                <span><code className="bg-[#FAF8FF] px-1 py-0.5 rounded">ข้อความคำถาม</code> / <code className="bg-[#FAF8FF] px-1 py-0.5 rounded">question_text</code></span>
                <span><code className="bg-[#FAF8FF] px-1 py-0.5 rounded">ตัวเลือกที่ 1-4</code> / <code className="bg-[#FAF8FF] px-1 py-0.5 rounded">choice_1-4</code></span>
                <span><code className="bg-[#FAF8FF] px-1 py-0.5 rounded">คำตอบที่ถูก</code> / <code className="bg-[#FAF8FF] px-1 py-0.5 rounded">correct</code> <span className="text-[#7C5BD9]">(หมายเลข 1-4)</span></span>
                <span><code className="bg-[#FAF8FF] px-1 py-0.5 rounded">ระดับความยาก</code> / <code className="bg-[#FAF8FF] px-1 py-0.5 rounded">difficulty</code> <span className="text-[#7C5BD9]">(ง่าย/กลาง/ยาก)</span></span>
                <span className="sm:col-span-2"><code className="bg-[#FAF8FF] px-1 py-0.5 rounded">หมวดหมู่ความรู้</code> / <code className="bg-[#FAF8FF] px-1 py-0.5 rounded">knowledge_categories</code> <span className="text-[#7C5BD9]">(คั่นด้วยคอมม่า)</span></span>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors sm:p-14 ${
                isDragging
                  ? "border-[#B7A3E3] bg-[#F4EFFF]"
                  : "border-[#D9CCF2] bg-[#FAF8FF] hover:border-[#B7A3E3] hover:bg-[#FDFBFF]"
              }`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#E7DDF8]">
                {isLoading ? (
                  <Loader2 size={28} className="animate-spin text-[#7C5BD9]" />
                ) : (
                  <UploadCloud size={28} className="text-[#7C5BD9]" />
                )}
              </div>
              <p className="mb-2 text-base font-semibold text-[#2F2A3A]">
                {isLoading
                  ? "กำลังตรวจสอบ..."
                  : isDragging
                    ? "ปล่อยไฟล์ที่นี่เพื่ออัปโหลด"
                    : selectedFileName
                      ? `กำลังตรวจสอบ "${selectedFileName}"`
                      : "ลากไฟล์ CSV มาวาง หรือคลิกเพื่อเลือกไฟล์"}
              </p>
              <p className="text-sm text-[#7A7287]">
                รองรับเฉพาะไฟล์ .csv ที่มีหัวคอลัมน์ตามที่กำหนด
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 2 — PREVIEW ═══ */}
        {step === "preview" && (
          <>
            {/* Summary cards */}
            <div className="flex-shrink-0 px-5 pt-4 sm:px-6">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    filterStatus === "all"
                      ? "border-[#7C5BD9] bg-[#F4EFFF]"
                      : "border-[#E7DDF8] bg-white hover:bg-[#FAF8FF]"
                  }`}
                >
                  <p className="text-2xl font-bold text-[#2F2A3A]">{counts.all}</p>
                  <p className="text-xs font-medium text-[#7A7287]">ทั้งหมด</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("ready")}
                  className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    filterStatus === "ready"
                      ? "border-green-600 bg-green-50"
                      : "border-[#E7DDF8] bg-white hover:bg-[#FAF8FF]"
                  }`}
                >
                  <p className="text-2xl font-bold text-green-700">{counts.ready}</p>
                  <p className="text-xs font-medium text-[#7A7287]">พร้อมนำเข้า</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus("error")}
                  className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${
                    filterStatus === "error"
                      ? "border-red-500 bg-red-50"
                      : "border-[#E7DDF8] bg-white hover:bg-[#FAF8FF]"
                  }`}
                >
                  <p className="text-2xl font-bold text-red-600">{counts.error}</p>
                  <p className="text-xs font-medium text-[#7A7287]">ผิดพลาด</p>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="overflow-hidden rounded-xl border border-[#E7DDF8]">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="bg-[#B7A3E3] text-white">
                      <th className="px-3 py-3 text-center w-14">#</th>
                      <th className="px-3 py-3">คำถาม</th>
                      <th className="px-3 py-3 w-16 text-center">ตอบ</th>
                      <th className="px-3 py-3 w-24">ความยาก</th>
                      <th className="px-3 py-3 w-44">หมวดหมู่</th>
                      <th className="px-3 py-3 w-28 text-center">สถานะ</th>
                      <th className="px-3 py-3 w-24 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-base text-[#7A7287]">
                          ไม่มีข้อมูล
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const isEditing = editingRowIndex === row.row_index;
                        return (
                          <tr key={row.row_index} className={`${getRowBg(row, row.row_index)}`}>
                            <td className="px-3 py-2.5 text-center text-sm text-[#7A7287]">
                              {row.row_index + 1}
                            </td>

                            {/* Question text + choices */}
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editForm.question_text}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, question_text: e.target.value })
                                    }
                                    rows={2}
                                    className="w-full rounded-lg bg-white px-2.5 py-1.5 text-sm ring-1 ring-[#E7DDF8] focus:ring-2 focus:ring-[#B7A3E3] outline-none resize-y"
                                    placeholder="ข้อความคำถาม"
                                  />
                                  {[1, 2, 3, 4].map((n) => (
                                    <div key={n} className="flex items-center gap-2">
                                      <span className={`text-xs w-5 font-bold ${editForm.correct === n ? "text-emerald-600" : "text-[#7A7287]"}`}>
                                        {n}{editForm.correct === n ? "✓" : ""}
                                      </span>
                                      <input
                                        value={editForm[`choice_${n}` as keyof typeof editForm] as string}
                                        onChange={(e) =>
                                          setEditForm({ ...editForm, [`choice_${n}`]: e.target.value })
                                        }
                                        className="flex-1 rounded-lg bg-white px-2 py-1 text-sm ring-1 ring-[#E7DDF8] focus:ring-2 focus:ring-[#B7A3E3] outline-none"
                                        placeholder={`ตัวเลือกที่ ${n}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="min-w-0">
                                  <p className="font-medium text-[#2F2A3A] text-sm leading-relaxed line-clamp-2">
                                    {row.question_text}
                                  </p>
                                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                                    {[row.choice_1, row.choice_2, row.choice_3, row.choice_4].map((c, ci) => (
                                      <span
                                        key={ci}
                                        className={`text-xs leading-relaxed truncate ${
                                          row.correct_choice === ci + 1
                                            ? "text-emerald-700 font-semibold"
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
                            <td className="px-3 py-2.5 text-center">
                              {isEditing ? (
                                <select
                                  value={editForm.correct}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, correct: parseInt(e.target.value) })
                                  }
                                  className="rounded-lg bg-white px-2 py-1.5 text-sm ring-1 ring-[#E7DDF8] focus:ring-2 focus:ring-[#B7A3E3] outline-none"
                                >
                                  {[1, 2, 3, 4].map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                                  {row.correct_choice}
                                </span>
                              )}
                            </td>

                            {/* Difficulty */}
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <select
                                  value={editForm.difficulty}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, difficulty: e.target.value })
                                  }
                                  className="w-full rounded-lg bg-white px-1.5 py-1 text-xs ring-1 ring-[#E7DDF8] focus:ring-2 focus:ring-[#B7A3E3] outline-none"
                                >
                                  {DIFFICULTY_LABELS.map((d) => (
                                    <option key={d} value={d}>{d}</option>
                                  ))}
                                </select>
                              ) : (
                                <span
                                  className={`inline-block rounded-full px-2.5 py-1 text-sm font-semibold ${
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
                            <td className="px-3 py-2.5">
                              {isEditing ? (
                                <input
                                  value={editForm.knowledge_categories}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, knowledge_categories: e.target.value })
                                  }
                                  className="w-full rounded-lg bg-white px-2 py-1 text-xs ring-1 ring-[#E7DDF8] focus:ring-2 focus:ring-[#B7A3E3] outline-none"
                                  placeholder="คั่นด้วย ,"
                                />
                              ) : (
                                <p className="max-w-[160px] truncate text-sm text-[#514667]">
                                  {row.knowledge_categories || "-"}
                                </p>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  STATUS_MAP[row.status].className
                                }`}
                              >
                                {STATUS_MAP[row.status].label}
                              </span>
                              {row.note && (
                                <p className="mt-1 max-w-[150px] truncate text-xs leading-tight text-red-500">
                                  {row.note}
                                </p>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                {isEditing ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={handleSaveEdit}
                                      disabled={isLoading}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer"
                                      title="บันทึก"
                                    >
                                      <Save size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleCancelEdit}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                                      title="ยกเลิก"
                                    >
                                      <X size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEdit(row)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7C5BD9] hover:bg-[#F4EFFF] transition-colors cursor-pointer"
                                      title="แก้ไข"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(row.row_index)}
                                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                      title="ลบ"
                                    >
                                      <Trash2 size={14} />
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
            <div className="flex-shrink-0 border-t border-[#E7DDF8] bg-[#FAF8FF] px-5 py-3.5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-xs text-[#7A7287]">
                  <span className="flex items-center gap-1">
                    <FileText size={14} />
                    พร้อมนำเข้า {readyCount} / {counts.all} รายการ
                  </span>
                  {errorCount > 0 && (
                    <button
                      type="button"
                      onClick={handleExportIssueRows}
                      className="flex items-center gap-1 font-semibold text-[#7C5BD9] hover:underline cursor-pointer"
                    >
                      <Download size={13} />
                      ดาวน์โหลดรายการผิดพลาด ({errorCount})
                    </button>
                  )}
                </div>
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
                    className="rounded-xl border border-[#D9CCF2] bg-white px-4 py-2 text-sm font-semibold text-[#514667] transition-colors hover:bg-[#F4EFFF] cursor-pointer"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={!canConfirm}
                    className={`rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                      canConfirm
                        ? "bg-[#B7A3E3] hover:bg-[#A48FD6] cursor-pointer"
                        : "bg-[#B7A3E3] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        กำลังนำเข้า...
                      </span>
                    ) : (
                      `ยืนยันการนำเข้า ${readyCount} รายการ`
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ STEP 3 — RESULT ═══ */}
        {step === "result" && confirmResults && (
          <>
            <div className="flex-shrink-0 px-5 pt-4 sm:px-6">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-[#E7DDF8] bg-white p-3">
                  <p className="text-2xl font-bold text-[#2F2A3A]">{confirmResults.summary.total}</p>
                  <p className="text-xs font-medium text-[#7A7287]">ทั้งหมด</p>
                </div>
                <div className="rounded-xl border border-green-200 bg-green-50 p-3">
                  <p className="text-2xl font-bold text-green-700">{confirmResults.summary.imported}</p>
                  <p className="text-xs font-medium text-green-600">นำเข้าสำเร็จ</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <p className="text-2xl font-bold text-amber-700">{confirmResults.summary.skipped}</p>
                  <p className="text-xs font-medium text-amber-600">ข้าม</p>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-2xl font-bold text-red-600">{confirmResults.summary.failed}</p>
                  <p className="text-xs font-medium text-red-500">ล้มเหลว</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="overflow-hidden rounded-xl border border-[#E7DDF8]">
                <table className="w-full text-left text-base">
                  <thead>
                    <tr className="bg-[#B7A3E3] text-white">
                      <th className="px-3 py-3 w-14 text-center">#</th>
                      <th className="px-3 py-3">คำถาม</th>
                      <th className="px-3 py-3 w-28 text-center">สถานะ</th>
                      <th className="px-3 py-3">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {confirmResults.results.map((r, i) => {
                      const statusStyle =
                        r.status === "imported"
                          ? "bg-green-50 text-green-700"
                          : r.status === "skipped"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-600";
                      const statusLabel =
                        r.status === "imported"
                          ? "สำเร็จ"
                          : r.status === "skipped"
                            ? "ข้าม"
                            : "ล้มเหลว";
                      return (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-3 py-2.5 text-center text-sm text-[#7A7287]">
                            {r.row_index + 1}
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="max-w-sm truncate text-sm font-medium text-[#2F2A3A]">
                              {r.question_text}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span
                              className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyle}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-sm text-[#7A7287]">
                            {r.note || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-[#E7DDF8] bg-[#FAF8FF] px-5 py-3.5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-xs text-[#7A7287]">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-green-600" />
                    นำเข้าสำเร็จ {confirmResults.summary.imported} / {confirmResults.summary.total} รายการ
                  </span>
                  {resultIssueCount > 0 && (
                    <button
                      type="button"
                      onClick={handleExportResultIssues}
                      className="flex items-center gap-1 font-semibold text-[#7C5BD9] hover:underline cursor-pointer"
                    >
                      <Download size={13} />
                      ดาวน์โหลดรายการผิดพลาด ({resultIssueCount})
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl bg-[#B7A3E3] px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A48FD6] cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
