"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";

const LoginPage = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-600">กำลังพาไปหน้าเข้าสู่ระบบ...</p>
    </div>
  );
};

export default LoginPage;
