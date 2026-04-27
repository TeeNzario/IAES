"use client";

import React from "react";
import { ArrowRight, Pencil } from "lucide-react";

export interface FolderCardProps {
  /** Small label shown at the top-left of the card (e.g. "ปีการศึกษา" or "ชุดคำถาม"). */
  label?: string;
  /** Main title of the card (year number or collection title). */
  title: string;
  /** Optional description (only used by collection cards). */
  description?: string | null;
  /** Variant decides which corner action icon to render. */
  variant: "year" | "collection";
  /** Click on the whole card. */
  onClick?: () => void;
  /** Click on the action icon (arrow for year, pencil for collection). */
  onAction?: () => void;
}

/**
 * Reusable card matching the คลังคำถาม UI: white card with rounded corners,
 * top-left purple label, and a circular purple action button at the bottom-right.
 */
export default function FolderCard({
  label,
  title,
  description,
  variant,
  onClick,
  onAction,
}: FolderCardProps) {
  const ActionIcon = variant === "year" ? ArrowRight : Pencil;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative h-44 w-full rounded-2xl bg-white p-4 text-left shadow-sm transition-all hover:shadow-md hover:bg-[#F4EFFF] cursor-pointer"
    >
      {label && (
        <span className="text-[11px] font-light text-[#B7A3E3]">{label}</span>
      )}
      <div className="mt-1 pr-2">
        <h3 className="text-lg font-light leading-tight text-[#575757] line-clamp-3">
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-xs font-light text-gray-400 line-clamp-3">
            {description}
          </p>
        )}
      </div>

      <span
        role="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onAction?.();
        }}
        className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#B7A3E3] text-white shadow-sm transition-transform hover:scale-105"
      >
        <ActionIcon size={14} />
      </span>
    </button>
  );
}
