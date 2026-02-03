"use client";

import React, { useState } from "react";

interface KnowledgeCategory {
  knowledge_category_id: string;
  name: string;
}

interface KnowledgeCategoriesCellProps {
  categories: KnowledgeCategory[];
  maxVisible?: number;
}

export default function KnowledgeCategoriesCell({
  categories,
  maxVisible = 3,
}: KnowledgeCategoriesCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (categories.length === 0) {
    return <span className="text-gray-400 text-sm">-</span>;
  }

  const visibleCategories = categories.slice(0, maxVisible);
  const hiddenCategories = categories.slice(maxVisible);
  const hasMore = hiddenCategories.length > 0;

  return (
    <div className="flex items-center gap-1 flex-nowrap overflow-hidden relative">
      {visibleCategories.map((cat) => (
        <span
          key={cat.knowledge_category_id}
          className="inline-flex items-center bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full whitespace-nowrap max-w-[80px] overflow-hidden text-ellipsis"
          title={cat.name}
        >
          {cat.name}
        </span>
      ))}

      {hasMore && (
        <div className="relative">
          <span
            className="inline-flex items-center bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full cursor-pointer hover:bg-gray-300"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            +{hiddenCategories.length}
          </span>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
              <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-xs">
                <div className="flex flex-wrap gap-1">
                  {categories.map((cat) => (
                    <span
                      key={cat.knowledge_category_id}
                      className="inline-flex items-center bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
                {/* Tooltip arrow */}
                <div className="absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
