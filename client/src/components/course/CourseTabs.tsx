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
    <nav className="mb-5 border-b border-[#DDD1F6] pb-3" aria-label="เมนูรายวิชา">
      <div className="grid grid-cols-3 gap-2 sm:inline-grid sm:grid-cols-[9rem_11rem_9rem] sm:gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.key;

          return (
            <Link
              key={tab.key}
              href={tab.href(offeringId)}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-[15px] font-medium transition-colors sm:px-3 ${
                isActive
                  ? "bg-white text-[#7455C9] shadow-sm ring-1 ring-[#CDBCF2]"
                  : "text-[#6F667C] hover:bg-white/65 hover:text-[#7455C9]"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="truncate">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
