import type { AuthUser } from "@/types/auth";

type HomeRouteUser =
  | Pick<AuthUser, "type" | "userType" | "staff_role" | "role">
  | null
  | undefined;

export function getHomeHrefForUser(user: HomeRouteUser) {
  const userType = String(user?.type ?? user?.userType ?? "").toUpperCase();
  const staffRole = String(user?.staff_role ?? user?.role ?? "").toUpperCase();

  if (userType === "STAFF" && staffRole === "ADMIN") {
    return "/admin/manage-users";
  }

  return "/";
}

export function getHomeLabelForUser(user: HomeRouteUser) {
  const userType = String(user?.type ?? user?.userType ?? "").toUpperCase();
  const staffRole = String(user?.staff_role ?? user?.role ?? "").toUpperCase();

  if (userType === "STAFF" && staffRole === "ADMIN") {
    return "กลับหน้าจัดการผู้ใช้";
  }

  return "กลับหน้าหลัก";
}
