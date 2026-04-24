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
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`p-4 rounded-full ${styles.iconBg}`}>
            <Icon size={36} className={styles.icon} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-700 text-center text-base mb-8 leading-relaxed">
          {message}
        </p>

        {/* Button */}
        <button
          onClick={onClose}
          className={`w-full px-5 py-3 text-white rounded-xl transition-colors font-semibold text-base ${styles.button}`}
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}
