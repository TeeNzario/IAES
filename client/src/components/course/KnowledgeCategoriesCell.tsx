"use client";

import React from "react";

interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
  code?: string;
}

interface KnowledgeCategoriesCellProps {
  categories: KnowledgeCategory[];
}

export default function KnowledgeCategoriesCell({
  categories,
}: KnowledgeCategoriesCellProps) {
  const count = categories.length;

  if (count === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
        ไม่มี
      </span>
    );
  }

  const title = categories
    .map((category) => category.name)
    .join("\n");

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700"
      title={title}
    >
      มี {count} หมวดหมู่
    </span>
  );
}
