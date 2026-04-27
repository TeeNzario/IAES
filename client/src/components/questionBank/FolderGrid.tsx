"use client";

import React from "react";

interface FolderGridProps {
  children: React.ReactNode;
}

/** 3-column responsive grid for folder/collection cards. */
export default function FolderGrid({ children }: FolderGridProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  );
}
