"use client";

import React from "react";
import { Plus } from "lucide-react";

interface AddCardProps {
  onClick: () => void;
}

/** "+" tile that matches the purple add card from the UI mocks. */
export default function AddCard({ onClick }: AddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-44 w-full items-center justify-center rounded-2xl bg-[#B7A3E3] text-white shadow-sm transition-all hover:bg-[#A48FD6] hover:shadow-md cursor-pointer"
      aria-label="เพิ่มใหม่"
    >
      <Plus size={42} strokeWidth={1.5} />
    </button>
  );
}
