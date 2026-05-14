import type { AuthUser } from "@/types/auth";

type HomeRouteUser =
  | Pick<AuthUser, "type" | "userType" | "staff_role" | "role">
  | null
  | undefined;

function isAdmin(user: HomeRouteUser): boolean {
  const userType = String(user?.type ?? user?.userType ?? "").toUpperCase();
  const staffRole = String(user?.staff_role ?? user?.role ?? "").toUpperCase();
  return userType === "STAFF" && staffRole === "ADMIN";
}

export function getHomeHrefForUser(user: HomeRouteUser) {
  return isAdmin(user) ? "/admin/manage-users" : "/";
}

export function getHomeLabelForUser(user: HomeRouteUser) {
  return isAdmin(user) ? "กลับหน้าจัดการผู้ใช้" : "กลับหน้าหลัก";
}
