"use client";

import React, { useEffect, useRef, useState } from "react";

interface CreateModalProps {
  isOpen: boolean;
  title: string;
  /** Placeholder for the (required) name/title input. */
  inputPlaceholder: string;
  /** Confirm button label. Defaults to "ยืนยัน". */
  confirmLabel?: string;
  /** Whether to show an extra optional description textarea. */
  withDescription?: boolean;
  /** Optional description placeholder. */
  descriptionPlaceholder?: string;
  /** Initial values (used for edit mode). */
  initialValue?: string;
  initialDescription?: string;
  /** Async submit. Reject to keep modal open and surface error. */
  onSubmit: (value: string, description?: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Reusable purple-overlay modal matching the "สร้างโฟลเดอร์ใหม่" / "สร้างชุดคำถาม"
 * mocks: white rounded card, single input, right-aligned purple "ยืนยัน" link.
 */
export default function CreateModal({
  isOpen,
  title,
  inputPlaceholder,
  confirmLabel = "ยืนยัน",
  withDescription = false,
  descriptionPlaceholder = "คำอธิบาย (ไม่บังคับ)",
  initialValue = "",
  initialDescription = "",
  onSubmit,
  onClose,
}: CreateModalProps) {
  const [value, setValue] = useState(initialValue);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
      setDescription(initialDescription);
      setError(null);
      // Focus the input shortly after open.
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen, initialValue, initialDescription]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleConfirm = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("กรุณากรอกข้อมูล");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed, withDescription ? description.trim() : undefined);
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })
          ?.response?.data?.message ??
        (err as { message?: string })?.message ??
        "เกิดข้อผิดพลาด";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#B7A3E3]/60 p-4 backdrop-blur-[2px]"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-medium text-[#575757]">{title}</h2>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={inputPlaceholder}
          disabled={submitting}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !withDescription) handleConfirm();
            if (e.key === "Escape") onClose();
          }}
          className="w-full rounded-lg bg-[#F4EFFF] px-4 py-2.5 text-sm font-light text-[#575757] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#B7A3E3]"
        />

        {withDescription && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={descriptionPlaceholder}
            disabled={submitting}
            rows={3}
            className="mt-3 w-full resize-none rounded-lg bg-[#F4EFFF] px-4 py-2.5 text-sm font-light text-[#575757] placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#B7A3E3]"
          />
        )}

        {error && (
          <p className="mt-2 text-xs text-red-500">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-sm font-light text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="text-sm font-medium text-[#B7A3E3] hover:text-[#A48FD6] cursor-pointer disabled:opacity-50"
          >
            {submitting ? "กำลังบันทึก..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
