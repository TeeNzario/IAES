"use client";

import Link from "next/link";
import { BookOpen, History, UsersRound } from "lucide-react";

type CourseTabKey = "home" | "members" | "history";

interface CourseTabsProps {
  offeringId: string;
  active: CourseTabKey;
}

const tabs = [
  {
    key: "home",
    label: "หน้าหลัก",
    icon: BookOpen,
    href: (offeringId: string) => `/course/${offeringId}`,
  },
  {
    key: "history",
    label: "ประวัติการสอบ",
    icon: History,
    href: (offeringId: string) => `/course/${offeringId}/history`,
  },
  {
    key: "members",
    label: "สมาชิก",
    icon: UsersRound,
    href: (offeringId: string) => `/course/${offeringId}/members`,
  },
] as const;

export default function CourseTabs({ offeringId, active }: CourseTabsProps) {
  return (
    <nav className="mb-4 border-b border-[#DDD1F6] pb-2" aria-label="เมนูรายวิชา">
      <div className="grid grid-cols-3 gap-1.5 sm:inline-flex sm:items-center sm:gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;

          return (
            <Link
              key={tab.key}
              href={tab.href(offeringId)}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors sm:px-3 ${
                isActive
                  ? "bg-white text-[#7455C9] shadow-sm ring-1 ring-[#CDBCF2]"
                  : "text-[#6F667C] hover:bg-white/65 hover:text-[#7455C9]"
              }`}
            >
              <Icon size={15} className="shrink-0" />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
