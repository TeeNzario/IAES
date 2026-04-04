"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, type AuthUser } from "@/lib/auth";

export default function ForbiddenPage() {
  const [homeHref, setHomeHref] = useState("/");

  useEffect(() => {
    const user = getUser<AuthUser>();
    if (user?.type === "STAFF" && user?.staff_role === "ADMIN") {
      setHomeHref("/admin");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#F1EAFF] flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-[#7C3AED] mb-4">403</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-8">
          You do not have permission to access this page.
        </p>
        <Link
          href={homeHref}
          className="inline-block px-6 py-3 bg-[#7C3AED] text-white rounded-full font-medium hover:bg-[#6D28D9] transition-colors"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
}
