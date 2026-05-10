"use client";

import React from "react";
import CreateCourseForm from "./CreateCourseForm";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateCourseModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCourseModalProps) {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close only when clicking the backdrop itself, not its children
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/45 z-50 flex items-start justify-center overflow-y-auto p-4 py-6 sm:p-6"
      onClick={handleBackdropClick}
    >
      <CreateCourseForm onSuccess={handleSuccess} onCancel={onClose} />
    </div>
  );
}
