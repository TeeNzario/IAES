"use client";

import React from "react";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: "error" | "success" | "warning";
}

export default function AlertModal({
  isOpen,
  onClose,
  title,
  message,
  variant = "error",
}: AlertModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    error: {
      icon: "text-red-500",
      iconBg: "bg-red-100",
      button: "bg-red-600 hover:bg-red-700",
    },
    success: {
      icon: "text-green-500",
      iconBg: "bg-green-100",
      button: "bg-green-600 hover:bg-green-700",
    },
    warning: {
      icon: "text-yellow-500",
      iconBg: "bg-yellow-100",
      button: "bg-yellow-600 hover:bg-yellow-700",
    },
  };

  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
  };

  const styles = variantStyles[variant];
  const Icon = icons[variant];

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${styles.iconBg}`}>
            <Icon size={32} className={styles.icon} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 text-center mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 text-center text-sm mb-6 leading-relaxed">
          {message}
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className={`w-full px-5 py-2.5 text-white rounded-xl transition-colors font-semibold text-sm ${styles.button}`}
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}
