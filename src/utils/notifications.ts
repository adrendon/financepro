import type { AppNotification } from "@/types/notifications";
import { createClient } from "@/utils/supabase/client";

const STORAGE_KEY = "financepro.notifications.v1";
const EVENT_NAME = "financepro-notifications-updated";

async function getStorageKey() {
  if (typeof window === "undefined") return { key: `${STORAGE_KEY}.server`, userId: null };
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const id = data?.user?.id || null;
    return { key: id ? `${STORAGE_KEY}.${id}` : `${STORAGE_KEY}.anon`, userId: id };
  } catch {
    return { key: `${STORAGE_KEY}.anon`, userId: null };
  }
}

async function readNotifications(): Promise<AppNotification[]> {
  if (typeof window === "undefined") return [];
  try {
    const { key, userId } = await getStorageKey();
    const raw = window.localStorage.getItem(key);
    // If there's an authenticated user, only read the per-user key to avoid showing other users' notifications
    if (userId) {
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AppNotification[];
      return Array.isArray(parsed) ? parsed : [];
    }

    // No authenticated user: fall back to the legacy global key
    const rawGlobal = raw ?? window.localStorage.getItem(STORAGE_KEY);
    if (!rawGlobal) return [];
    const parsed = JSON.parse(rawGlobal) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeNotifications(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  const { key, userId } = await getStorageKey();
  const serialized = JSON.stringify(items);
  try {
    window.localStorage.setItem(key, serialized);
  } catch {}

  // Only write the legacy global key for anonymous or server contexts to avoid cross-account leakage
  if (!userId) {
    try {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    } catch {}
  }

  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
}

export async function pushNotification(notification: AppNotification) {
  const current = await readNotifications();
  const deduped = current.filter((item) => item.id !== notification.id);
  const next = [notification, ...deduped].slice(0, 50);
  await writeNotifications(next);
}

export { readNotifications, writeNotifications, EVENT_NAME };
