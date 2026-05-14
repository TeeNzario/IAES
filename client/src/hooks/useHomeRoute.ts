"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getUser } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";
import {
  getHomeHrefForUser,
  getHomeLabelForUser,
} from "@/utils/homeRoute";

const EMPTY_USER_SNAPSHOT = "null";

function subscribeToUserStore(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener("focus", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("focus", onStoreChange);
  };
}

function getUserSnapshot() {
  const user = getUser<AuthUser>();
  if (!user) return EMPTY_USER_SNAPSHOT;

  return JSON.stringify({
    type: user.type ?? null,
    userType: user.userType ?? null,
    staff_role: user.staff_role ?? null,
    role: user.role ?? null,
  });
}

function getServerUserSnapshot() {
  return EMPTY_USER_SNAPSHOT;
}

export function useHomeRoute() {
  const userSnapshot = useSyncExternalStore(
    subscribeToUserStore,
    getUserSnapshot,
    getServerUserSnapshot,
  );

  return useMemo(() => {
    let user: Parameters<typeof getHomeHrefForUser>[0] = null;

    try {
      user = JSON.parse(userSnapshot) as NonNullable<typeof user>;
    } catch {
      user = null;
    }

    return {
      href: getHomeHrefForUser(user),
      label: getHomeLabelForUser(user),
    };
  }, [userSnapshot]);
}
