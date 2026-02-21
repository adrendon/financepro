import type { AppNotification } from "@/types/notifications";

const STORAGE_KEY = "financepro.notifications.v1";
const EVENT_NAME = "financepro-notifications-updated";

function readNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
}

export function pushNotification(notification: AppNotification) {
  const current = readNotifications();
  const deduped = current.filter((item) => item.id !== notification.id);
  const next = [notification, ...deduped].slice(0, 50);
  writeNotifications(next);
}
