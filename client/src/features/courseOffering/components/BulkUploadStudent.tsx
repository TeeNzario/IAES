"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Edit2, Trash2, Loader2, Save, X, UploadCloud, FileText, CheckCircle2, XCircle, AlertTriangle, Users } from "lucide-react";
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
  facultyCode: number;
  title: string;
  curriculumId?: string;
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

function parseFacultyCode(value: unknown): number | undefined {
  const text = String(value ?? "").trim();
  if (!text) return undefined;

  const numeric = Number(text);
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

export default function BulkUploadModal({
  isOpen,
  onClose,
  offeringId,
  onSuccess,
}: BulkUploadModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "result">("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [confirmResults, setConfirmResults] = useState<ConfirmResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!isOpen) return null;

  // ---- Helpers ----
  const STATUS_MAP: Record<PreviewRow["status"], { label: string; className: string }> = {
    NEW: { label: "นักศึกษาใหม่", className: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    EXISTS_NOT_ENROLLED: { label: "มีในระบบ", className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
    ALREADY_ENROLLED: { label: "ลงทะเบียนแล้ว", className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200" },
    DUPLICATE_IDENTITY: { label: "ข้อมูลขัดแย้ง", className: "bg-red-50 text-red-600 ring-1 ring-red-200" },
    MISSING: { label: "ข้อมูลไม่ครบ", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
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
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { setError("กรุณาเลือกไฟล์ CSV เท่านั้น"); return; }
    setError(null); setIsLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const parsedRows = results.data.map((rawRow) => {
            const row = rawRow as Record<string, unknown>;
            return {
              student_code: readCsvCell(row, ["studentCode", "student_code", "studentId", "รหัสนักศึกษา"]),
              email: readCsvCell(row, ["email", "อีเมล"]),
              facultyCode: parseFacultyCode(readCsvCell(row, ["facultyCode", "faculty_code", "สำนักวิชา", "คณะ"])),
              title: readCsvCell(row, ["title", "prefix", "คำนำหน้า"]),
              curriculumId: parseCurriculumId(readCsvCell(row, ["curriculumId", "curriculum_id", "curriculumCode", "หลักสูตร"])),
              first_name: readCsvCell(row, ["firstName", "first_name", "ชื่อ"]),
              last_name: readCsvCell(row, ["lastName", "last_name", "นามสกุล"]),
            };
          });

          const response = await apiFetch<PreviewSessionResponse>(
            `/course-offerings/${offeringId}/import/preview`,
            { method: "POST", data: { rows: parsedRows } },
          );

          setSessionId(response.sessionId);
          setRows(response.rows);
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

  // ---- Delete / Confirm ----
  const handleDelete = async (rowIndex: number) => {
    if (!sessionId) return;
    try {
      await apiFetch(`/course-offerings/${offeringId}/import/preview/${sessionId}/${rowIndex}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.row_index !== rowIndex));
    } catch (err) {
      console.error("Failed to delete row:", err);
      setError("ไม่สามารถลบรายการได้");
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

  const handleClose = () => {
    setStep("upload"); setSessionId(null); setRows([]);
    setConfirmResults(null); setFilterStatus("all");
    setError(null); setEditingRowIndex(null);
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

  const FILTER_TABS: { key: FilterStatus; label: string; activeClass: string }[] = [
    { key: "all", label: "ทั้งหมด", activeClass: "bg-[#7C5BD9] text-white border-[#7C5BD9]" },
    { key: "new", label: "นำเข้าใหม่", activeClass: "bg-green-600 text-white border-green-600" },
    { key: "enrolled", label: "ลงทะเบียนแล้ว", activeClass: "bg-purple-500 text-white border-purple-500" },
    { key: "error", label: "มีปัญหา", activeClass: "bg-red-500 text-white border-red-500" },
  ];

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-[#E7DDF8] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#2F2A3A]">
                {step === "upload" && "นำเข้านักศึกษาจาก CSV"}
                {step === "preview" && "ตรวจสอบข้อมูลก่อนยืนยัน"}
                {step === "result" && "ผลลัพธ์การนำเข้า"}
              </h2>
              {step === "preview" && (
                <p className="mt-0.5 text-sm text-[#7A7287]">
                  ตรวจสอบและแก้ไขข้อมูลให้ถูกต้องก่อนกดยืนยัน
                </p>
              )}
            </div>
            {step !== "upload" && (
              <span className="text-sm text-[#7A7287] tabular-nums">
                {rows.length} แถว
              </span>
            )}
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            STEP 1 — UPLOAD
            ════════════════════════════════════════════════════════ */}
        {step === "upload" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed
                px-6 py-16 transition-all duration-200
                ${isDragging
                  ? "border-[#7C5BD9] bg-purple-50 scale-[1.01]"
                  : "border-gray-300 bg-gray-50/70 hover:border-[#B7A3E3] hover:bg-purple-50/30"
                }
                ${isLoading ? "pointer-events-none opacity-50" : ""}
              `}
            >
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              {isLoading ? (
                <>
                  <Loader2 className="mb-3 h-10 w-10 animate-spin text-[#7C5BD9]" />
                  <p className="text-sm font-medium text-[#7C5BD9]">กำลังประมวลผลและตรวจสอบข้อมูล...</p>
                </>
              ) : (
                <>
                  <UploadCloud className={`mb-3 h-12 w-12 transition-colors ${isDragging ? "text-[#7C5BD9]" : "text-[#B7A3E3]"}`} />
                  <p className="text-base font-medium text-[#514667]">
                    {isDragging ? "วางไฟล์ CSV ที่นี่" : "ลากไฟล์ CSV มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์"}
                  </p>
                  <p className="mt-2 text-sm text-[#7A7287]">
                    รองรับไฟล์ .csv · คอลัมน์: student_code, email, title, first_name, last_name, facultyCode, curriculumId
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={handleClose}
                className="h-11 min-w-32 rounded-xl border border-[#B7A3E3] px-6 text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50 cursor-pointer"
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
            {/* Filter tabs */}
            <div className="flex-shrink-0 border-b border-[#EFE8FB] px-6 py-3">
              <div className="flex flex-wrap gap-2">
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterStatus(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer
                      ${filterStatus === tab.key
                        ? tab.activeClass
                        : "border-gray-300 bg-white text-gray-600 hover:border-[#B7A3E3] hover:text-[#7C5BD9]"
                      }`}
                  >
                    {tab.label}
                    <span className={`tabular-nums rounded-full px-1.5 py-0.5 text-[10px] font-semibold
                      ${filterStatus === tab.key ? "bg-white/20" : "bg-gray-100 text-gray-500"}
                    `}>
                      {counts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-2">
              <div className="min-w-[1100px] overflow-hidden rounded-xl ring-1 ring-[#E7DDF8]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F3FF] text-xs font-semibold text-[#5B4A73] uppercase tracking-wide">
                      <th className="py-2.5 px-3 text-left w-[90px]">รหัสนักศึกษา</th>
                      <th className="py-2.5 px-3 text-left w-[60px]">คำนำหน้า</th>
                      <th className="py-2.5 px-3 text-left w-[100px]">ชื่อ</th>
                      <th className="py-2.5 px-3 text-left w-[100px]">นามสกุล</th>
                      <th className="py-2.5 px-3 text-left w-[180px]">อีเมล</th>
                      <th className="py-2.5 px-3 text-left w-[140px]">สำนักวิชา</th>
                      <th className="py-2.5 px-3 text-left w-[130px]">หลักสูตร</th>
                      <th className="py-2.5 px-3 text-center w-[110px]">สถานะ</th>
                      <th className="py-2.5 px-3 text-left w-[140px]">หมายเหตุ</th>
                      <th className="py-2.5 px-3 text-center w-[80px]">จัดการ</th>
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
                        return (
                          <tr key={row.id} className={`${getRowBg(row, index)} transition-colors`}>
                            {isEditing ? (
                              <>
                                <td className="py-1.5 px-2">
                                  <input type="text" value={editForm.student_code}
                                    onChange={(e) => setEditForm((f) => ({ ...f, student_code: e.target.value }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="py-1.5 px-2">
                                  <select value={editForm.title}
                                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-1.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300">
                                    {THAI_TITLES.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </td>
                                <td className="py-1.5 px-2">
                                  <input type="text" value={editForm.first_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="py-1.5 px-2">
                                  <input type="text" value={editForm.last_name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="py-1.5 px-2">
                                  <input type="text" value={editForm.email}
                                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300" />
                                </td>
                                <td className="py-1.5 px-2">
                                  <select value={editForm.facultyCode}
                                    onChange={(e) => setEditForm((f) => ({ ...f, facultyCode: Number(e.target.value) }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-1.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300">
                                    {Object.entries(FACULTY_MAP).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                                  </select>
                                </td>
                                <td className="py-1.5 px-2">
                                  <select value={editForm.curriculumId}
                                    onChange={(e) => setEditForm((f) => ({ ...f, curriculumId: e.target.value }))}
                                    className="w-full rounded-md border border-[#B7A3E3] px-1.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-300">
                                    {CURRICULUMS.map((c) => <option key={c.id} value={c.id}>{getCurriculumName(c.id)}</option>)}
                                  </select>
                                </td>
                                <td className="py-1.5 px-2 text-center">
                                  <span className="text-[11px] italic text-[#7A7287]">กำลังแก้ไข</span>
                                </td>
                                <td className="py-1.5 px-2">-</td>
                                <td className="py-1.5 px-2">
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
                                <td className={`py-2 px-3 font-mono text-xs ${!row.student_code ? "text-gray-300 italic" : "text-[#2F2A3A]"}`}>
                                  {row.student_code || "-"}
                                </td>
                                <td className="py-2 px-3 text-xs text-[#514667]">{row.title || "-"}</td>
                                <td className="py-2 px-3 text-xs text-[#2F2A3A]">{row.first_name || "-"}</td>
                                <td className="py-2 px-3 text-xs text-[#2F2A3A]">{row.last_name || "-"}</td>
                                <td className={`py-2 px-3 text-xs ${!row.email ? "text-gray-300 italic" : "text-[#514667]"}`}>
                                  {row.email || "-"}
                                </td>
                                <td className="py-2 px-3 text-xs text-[#514667]">
                                  {row.facultyCode != null ? getFacultyName(row.facultyCode) : "-"}
                                </td>
                                <td className="py-2 px-3 text-xs text-[#514667]">
                                  {row.curriculumId ? getCurriculumName(row.curriculumId) : "-"}
                                </td>
                                <td className="py-2 px-2 text-center">
                                  <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_MAP[row.status].className}`}>
                                    {STATUS_MAP[row.status].label}
                                  </span>
                                </td>
                                <td className="py-2 px-2 text-[11px] text-[#7A7287] leading-tight max-w-[140px] truncate" title={row.note}>
                                  {row.note || "-"}
                                </td>
                                <td className="py-2 px-2">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => handleStartEdit(row)}
                                      className="rounded-md p-1.5 text-[#B7A3E3] hover:bg-purple-50 hover:text-[#7C5BD9] transition-colors cursor-pointer" title="แก้ไข">
                                      <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(row.row_index)}
                                      className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer" title="ลบ">
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
                  onClick={handleClose}
                  className="h-11 min-w-28 rounded-xl border border-[#B7A3E3] px-6 text-sm font-medium text-[#7C5BD9] transition-colors hover:bg-purple-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <div className="flex items-center gap-3">
                  {enrollableCount === 0 ? (
                    <p className="text-sm text-[#7A7287]">ไม่มีรายการที่พร้อมนำเข้า</p>
                  ) : (
                    <p className="text-sm text-[#514667]">
                      พร้อมนำเข้า <span className="font-semibold text-[#7C5BD9]">{enrollableCount}</span> รายการ
                    </p>
                  )}
                  <button
                    onClick={handleConfirm}
                    disabled={isLoading || enrollableCount === 0}
                    className="flex h-11 items-center gap-2 rounded-xl bg-[#7C5BD9] px-6 text-sm font-medium text-white transition-all hover:bg-[#6A4BC5] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
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
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Summary Cards */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: CheckCircle2, count: confirmResults.summary.enrolled, label: "ลงทะเบียนสำเร็จ", color: "text-green-600 border-green-200 bg-green-50" },
                  { icon: Users, count: confirmResults.summary.alreadyEnrolled, label: "ลงทะเบียนแล้ว", color: "text-purple-600 border-purple-200 bg-purple-50" },
                  { icon: AlertTriangle, count: confirmResults.summary.skipped, label: "ข้าม", color: "text-amber-600 border-amber-200 bg-amber-50" },
                  { icon: XCircle, count: confirmResults.summary.failed, label: "ผิดพลาด", color: "text-red-600 border-red-200 bg-red-50" },
                ].map((card, i) => (
                  <div key={i} className={`flex flex-col items-center rounded-xl border p-4 ${card.color}`}>
                    <card.icon size={22} className="mb-1 opacity-70" />
                    <span className="text-2xl font-bold tabular-nums">{card.count}</span>
                    <span className="text-xs font-medium mt-0.5">{card.label}</span>
                  </div>
                ))}
              </div>

              {/* Results Table */}
              <div className="overflow-hidden rounded-xl ring-1 ring-[#E7DDF8]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F7F3FF] text-xs font-semibold text-[#5B4A73] uppercase tracking-wide">
                      <th className="py-2.5 px-4 text-left">รหัสนักศึกษา</th>
                      <th className="py-2.5 px-4 text-left">อีเมล</th>
                      <th className="py-2.5 px-4 text-center w-[120px]">สถานะ</th>
                      <th className="py-2.5 px-4 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8FB]">
                    {confirmResults.results.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                        <td className="py-2.5 px-4 font-mono text-xs text-[#2F2A3A]">{r.student_code}</td>
                        <td className="py-2.5 px-4 text-xs text-[#514667]">{r.email}</td>
                        <td className="py-2.5 px-4 text-center">
                          {r.status === "enrolled" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-green-200">
                              <CheckCircle2 size={12} /> สำเร็จ
                            </span>
                          ) : r.status === "already_enrolled" ? (
                            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700 ring-1 ring-purple-200">
                              ลงทะเบียนแล้ว
                            </span>
                          ) : r.status === "skipped" ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                              ข้าม
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-red-200">
                              ผิดพลาด
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#7A7287]">{r.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex-shrink-0 border-t border-[#EFE8FB] px-6 py-4 flex justify-center">
              <button
                onClick={handleClose}
                className="h-11 min-w-36 rounded-xl bg-[#7C5BD9] px-8 text-sm font-medium text-white transition-colors hover:bg-[#6A4BC5] cursor-pointer"
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
