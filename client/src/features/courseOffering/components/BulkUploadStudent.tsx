"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Edit2, Trash2, Loader2, Save, X } from "lucide-react";
import Papa from "papaparse";
import { apiFetch } from "@/lib/api";

// Row data from preview session
interface PreviewRow {
  id: string;
  row_index: number;
  student_code: string;
  email: string;
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

// Preview session response
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

// Confirm response
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

type FilterStatus =
  | "all"
  | "NEW"
  | "EXISTS_NOT_ENROLLED"
  | "ALREADY_ENROLLED"
  | "DUPLICATE_IDENTITY"
  | "MISSING";

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
  const [confirmResults, setConfirmResults] = useState<ConfirmResponse | null>(
    null,
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    student_code: "",
    email: "",
    first_name: "",
    last_name: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const getStatusText = (status: PreviewRow["status"]) => {
    const statusMap = {
      NEW: "นักศึกษาใหม่",
      EXISTS_NOT_ENROLLED: "มีในระบบ (ยังไม่ลงทะเบียน)",
      ALREADY_ENROLLED: "ลงทะเบียนแล้ว",
      DUPLICATE_IDENTITY: "ข้อมูลซ้ำ/ขัดแย้ง",
      MISSING: "ข้อมูลไม่ครบ",
    };
    return statusMap[status];
  };

  const getStatusColor = (status: PreviewRow["status"]) => {
    const colorMap = {
      NEW: "text-[#484848]",
      EXISTS_NOT_ENROLLED: "text-[#484848]",
      ALREADY_ENROLLED: "text-[#484848]",
      DUPLICATE_IDENTITY: "text-[#484848]",
      MISSING: "text-[#484848]",
    };
    return colorMap[status];
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("กรุณาเลือกไฟล์ CSV เท่านั้น");
      return;
    }

    setError(null);
    setIsLoading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Parse CSV rows
          const parsedRows = results.data.map((row: any) => ({
            student_code: (
              row.student_code ||
              row.studentId ||
              row.รหัสนักศึกษา ||
              ""
            ).trim(),
            email: (row.email || row.อีเมล || "").trim(),
            first_name: (
              row.first_name ||
              row.firstName ||
              row.ชื่อ ||
              ""
            ).trim(),
            last_name: (
              row.last_name ||
              row.lastName ||
              row.นามสกุล ||
              ""
            ).trim(),
          }));

          // Create preview session
          const response = await apiFetch<PreviewSessionResponse>(
            `/course-offerings/${offeringId}/import/preview`,
            {
              method: "POST",
              data: { rows: parsedRows },
            },
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
      error: (err) => {
        setError(`ไม่สามารถอ่านไฟล์ได้: ${err.message}`);
        setIsLoading(false);
      },
    });
  };

  const handleClickUploadArea = () => {
    fileInputRef.current?.click();
  };

  // Start editing a row
  const handleStartEdit = (row: PreviewRow) => {
    setEditingRowIndex(row.row_index);
    setEditForm({
      student_code: row.student_code,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
    });
  };

  // Save edit and get revalidated status
  const handleSaveEdit = async () => {
    if (editingRowIndex === null || !sessionId) return;

    setIsLoading(true);
    try {
      const updatedRow = await apiFetch<PreviewRow>(
        `/course-offerings/${offeringId}/import/preview/${sessionId}/${editingRowIndex}`,
        {
          method: "PATCH",
          data: editForm,
        },
      );

      // Update local state with revalidated row
      setRows((prev) =>
        prev.map((r) => (r.row_index === editingRowIndex ? updatedRow : r)),
      );
      setEditingRowIndex(null);
    } catch (err) {
      console.error("Failed to save edit:", err);
      setError("ไม่สามารถบันทึกการแก้ไขได้");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRowIndex(null);
  };

  // Delete a row
  const handleDelete = async (rowIndex: number) => {
    if (!sessionId) return;

    try {
      await apiFetch(
        `/course-offerings/${offeringId}/import/preview/${sessionId}/${rowIndex}`,
        { method: "DELETE" },
      );

      setRows((prev) => prev.filter((r) => r.row_index !== rowIndex));
    } catch (err) {
      console.error("Failed to delete row:", err);
      setError("ไม่สามารถลบรายการได้");
    }
  };

  // Confirm and enroll
  const handleConfirm = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    setError(null);

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
    setStep("upload");
    setSessionId(null);
    setRows([]);
    setConfirmResults(null);
    setFilterStatus("all");
    setError(null);
    setEditingRowIndex(null);
    onClose();
  };

  const filteredRows = rows.filter((row) => {
    if (filterStatus === "all") return true;
    return row.status === filterStatus;
  });

  const getStatusCount = (status: FilterStatus) => {
    if (status === "all") return rows.length;
    return rows.filter((r) => r.status === status).length;
  };

  const enrollableCount = rows.filter(
    (r) => r.status !== "ALREADY_ENROLLED" && r.status !== "MISSING",
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="text-center py-6 flex-shrink-0">
          <h2 className="text-2xl font-light text-gray-800">
            {step === "result" ? "ผลลัพธ์การลงทะเบียน" : "เพิ่มนักศึกษา"}
          </h2>
          {sessionId && step === "preview" && (
            <p className="text-sm text-gray-500 mt-1">
              {/* Session: {sessionId.slice(0, 8)}... */}
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        {step === "upload" ? (
          <div className="p-20 flex-1 overflow-y-auto">
            {/* Drag and Drop Area */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleClickUploadArea}
              className={`
                border-2 border-dashed rounded-3xl py-30 px-5 text-center cursor-pointer
                transition-all duration-200
                ${
                  isDragging
                    ? "border-purple-500 bg-purple-50 scale-[1.02]"
                    : "border-gray-300 bg-gray-50 hover:border-purple-400"
                }
                ${isLoading ? "pointer-events-none opacity-50" : ""}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              {isLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                  <p className="text-purple-500">กำลังประมวลผล...</p>
                </div>
              ) : (
                <>
                  <p className="text-purple-400 text-lg">อัพโหลดไฟล์ CSV</p>
                  <p className="text-gray-400 text-sm mt-2">
                    คอลัมน์: student_code, email, first_name, last_name
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={handleClose}
                className="px-28 py-3 border-1 border-[#9264F5] text-[#9264F5] rounded-lg hover:bg-[#9264F5] hover:text-white transition-colors font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : step === "preview" ? (
          <>
            {/* Filter Buttons */}
            <div className="px-8 pt-6 pb-4 flex-shrink-0">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors cursor-pointer ${
                    filterStatus === "all"
                      ? "border-[#B7A3E3] bg-white text-[#B7A3E3]"
                      : "border-gray-300 text-gray-600 hover:border-[#B7A3E3]"
                  }`}
                >
                  ทั้งหมด ({getStatusCount("all")})
                </button>
                <button
                  onClick={() => setFilterStatus("NEW")}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors cursor-pointer ${
                    filterStatus === "NEW"
                      ? "border-[#B7A3E3] text-[#B7A3E3]"
                      : "border-gray-300 text-gray-600 hover:border-[#B7A3E3]"
                  }`}
                >
                  ใหม่ ({getStatusCount("NEW")})
                </button>
                <button
                  onClick={() => setFilterStatus("EXISTS_NOT_ENROLLED")}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors cursor-pointer ${
                    filterStatus === "EXISTS_NOT_ENROLLED"
                      ? "border-[#B7A3E3] bg-white text-[#B7A3E3]"
                      : "border-gray-300 text-gray-600 hover:border-[#B7A3E3]"
                  }`}
                >
                  มีในระบบ ({getStatusCount("EXISTS_NOT_ENROLLED")})
                </button>
                <button
                  onClick={() => setFilterStatus("ALREADY_ENROLLED")}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors cursor-pointer ${
                    filterStatus === "ALREADY_ENROLLED"
                      ? "border-[#B7A3E3] bg-white text-[#B7A3E3]"
                      : "border-gray-300 text-gray-600 hover:border-[#B7A3E3]"
                  }`}
                >
                  ลงทะเบียนแล้ว ({getStatusCount("ALREADY_ENROLLED")})
                </button>
                <button
                  onClick={() => setFilterStatus("DUPLICATE_IDENTITY")}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors cursor-pointer ${
                    filterStatus === "DUPLICATE_IDENTITY"
                      ? "border-[#B7A3E3] bg-white text-[#B7A3E3]"
                      : "border-gray-300 text-gray-600 hover:border-[#B7A3E3]"
                  }`}
                >
                  ข้อมูลซ้ำ ({getStatusCount("DUPLICATE_IDENTITY")})
                </button>
                <button
                  onClick={() => setFilterStatus("MISSING")}
                  className={`px-3 py-1.5 rounded-lg border-2 text-sm transition-colors cursor-pointer ${
                    filterStatus === "MISSING"
                      ? "border-[#B7A3E3] bg-white text-[#B7A3E3]"
                      : "border-gray-300 text-gray-600 hover:border-[#B7A3E3]"
                  }`}
                >
                  ไม่ครบ ({getStatusCount("MISSING")})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="px-8 flex-1 overflow-y-auto">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-[#B7A3E3] text-white">
                    <tr>
                      <th className="py-3 px-4 text-left font-light text-sm rounded-tl-lg w-28">
                        รหัสนักศึกษา
                      </th>
                      <th className="py-3 px-4 text-left font-light text-sm">ชื่อ</th>
                      <th className="py-3 px-4 text-left font-light text-sm">นามสกุล</th>
                      <th className="py-3 px-4 text-left font-light text-sm">อีเมล</th>
                      <th className="py-3 px-4 text-left font-light text-sm">สถานะ</th>
                      <th className="py-3 px-4 text-left font-light text-sm">หมายเหตุ</th>
                      <th className="py-3 px-4 text-center font-light text-sm rounded-tr-lg w-24">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredRows.map((row, index) => (
                      <tr
                        key={row.id}
                        className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                      >
                        {editingRowIndex === row.row_index ? (
                          // Edit mode
                          <>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={editForm.student_code}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    student_code: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={editForm.first_name}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    first_name: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={editForm.last_name}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    last_name: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    email: e.target.value,
                                  }))
                                }
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </td>
                            <td className="py-2 px-4 text-gray-400 text-sm italic">
                              (บันทึกเพื่อตรวจสอบ)
                            </td>
                            <td className="py-2 px-4">-</td>
                            <td className="py-2 px-4">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isLoading}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="p-1.5 text-gray-500 hover:bg-gray-50 rounded transition-colors"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          // View mode
                          <>
                            <td className="py-3 px-4 text-gray-700 text-sm">
                              {row.student_code || "-"}
                            </td>
                            <td className="py-3 px-4 text-gray-700 text-sm">
                              {row.first_name || "-"}
                            </td>
                            <td className="py-3 px-4 text-gray-700 text-sm">
                              {row.last_name || "-"}
                            </td>
                            <td className="py-3 px-4 text-gray-700 text-sm">
                              {row.email || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded text-xs ${getStatusColor(row.status)}`}
                              >
                                {getStatusText(row.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-sm">
                              {row.note || "-"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 justify-center">
                                <button
                                  onClick={() => handleStartEdit(row)}
                                  className="p-1.5 text-purple-400 hover:bg-purple-50 rounded transition-colors"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(row.row_index)}
                                  className="p-1.5 text-[#9264F5] hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-8 py-6 flex justify-end gap-4 flex-shrink-0">
              <button
                onClick={handleClose}
                className="px-23 py-3 border-1 border-[#9264F5] text-[#9264F5] rounded-xl hover:bg-purple-50 transition-colors font-medium cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || enrollableCount === 0}
                className="px-23 py-3 bg-[#9264F5] text-white rounded-xl hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isLoading && <Loader2 size={20} className="animate-spin" />}
                ยืนยัน ({enrollableCount} รายการ)
              </button>
            </div>
          </>
        ) : (
          // Result step ====================================================
          <>
            <div className="px-8 py-6 flex-1 overflow-y-auto">
              {confirmResults && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="border border-[#B7A3E3] rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-[#B7A3E3]">
                        {confirmResults.summary.enrolled}
                      </div>
                      <div className="text-sm text-[#B7A3E3]">
                        ลงทะเบียนสำเร็จ
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {confirmResults.summary.alreadyEnrolled}
                      </div>
                      <div className="text-sm text-gray-700">
                        ลงทะเบียนแล้ว
                      </div>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {confirmResults.summary.skipped}
                      </div>
                      <div className="text-sm text-gray-700">ข้าม</div>
                    </div>
                    <div className="border border-gray-300 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-gray-600">
                        {confirmResults.summary.failed}
                      </div>
                      <div className="text-sm text-gray-700">ผิดพลาด</div>
                    </div>
                  </div>

                  {/* Results Table */}
                  <table className="w-full mt-6">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="py-2 px-4 text-left text-sm">
                          รหัสนักศึกษา
                        </th>
                        <th className="py-2 px-4 text-left text-sm">อีเมล</th>
                        <th className="py-2 px-4 text-left text-sm">สถานะ</th>
                        <th className="py-2 px-4 text-left text-sm">
                          หมายเหตุ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {confirmResults.results.map((result, i) => (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? "bg-gray-50" : "bg-white"}
                        >
                          <td className="py-2 px-4 text-sm">
                            {result.student_code}
                          </td>
                          <td className="py-2 px-4 text-sm">{result.email}</td>
                          <td className="py-2 px-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                result.status === "enrolled"
                                  ? "text-[#9264F5] bg-[#F1EFFF]"
                                  : result.status === "already_enrolled"
                                    ? "text-gray-500 bg-gray-50"
                                    : result.status === "skipped"
                                      ? "text-gray-500 bg-gray-50"
                                      : "text-red-500 bg-red-50"
                              }`}
                            >
                              {result.status === "enrolled"
                                ? "สำเร็จ"
                                : result.status === "already_enrolled"
                                  ? "ลงทะเบียนแล้ว"
                                  : result.status === "skipped"
                                    ? "ข้าม"
                                    : "ผิดพลาด"}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-sm text-gray-500">
                            {result.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-8 py-6 flex justify-center flex-shrink-0">
              <button
                onClick={handleClose}
                className="px-12 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium cursor-pointer"
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
