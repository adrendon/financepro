"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppNotification } from "@/types/notifications";

const STORAGE_KEY = "financepro.notifications.v1";
const EVENT_NAME = "financepro-notifications-updated";
const STORAGE_SCHEMA_KEY = "financepro.notifications.schema";
const STORAGE_SCHEMA_VERSION = "2";
const LEGACY_SEEDED_IDS = new Set([
  "sec-1",
  "bill-1",
  "budget-1",
  "payment-1",
  "budget-warning",
  "security-warning",
  "payment-info",
]);

function sanitizeNotifications(items: AppNotification[]) {
  return items.filter(
    (item) => !LEGACY_SEEDED_IDS.has(item.id) && !item.id.startsWith("due-")
  );
}

function mergeById(current: AppNotification[], incoming: AppNotification[]) {
  const map = new Map<string, AppNotification>();

  current.forEach((item) => map.set(item.id, item));

  incoming.forEach((item) => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      return;
    }

    map.set(item.id, {
      ...item,
      unread: existing.unread,
    });
  });

  return Array.from(map.values());
}

function fingerprint(item: AppNotification) {
  return [
    item.id,
    item.title,
    item.message,
    item.time,
    item.unread ? "1" : "0",
    item.kind,
    item.actionLabel ?? "",
    item.actionHref ?? "",
    item.progress ?? "",
    item.dueDateISO ?? "",
    item.isPaid ? "1" : "0",
  ].join("|");
}

function signature(items: AppNotification[]) {
  return items.map(fingerprint).join("||");
}

function sameNotifications(a: AppNotification[], b: AppNotification[]) {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (fingerprint(a[index]) !== fingerprint(b[index])) return false;
  }
  return true;
}

function readStorage(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    return Array.isArray(parsed) ? sanitizeNotifications(parsed) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  const sanitized = sanitizeNotifications(items);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: sanitized }));
}

export function useSharedNotifications(initialItems: AppNotification[]) {
  const [items, setItems] = useState<AppNotification[]>(initialItems);
  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);
  const sanitizedInitial = useMemo(() => sanitizeNotifications(initialItems), [initialItems]);
  const initialSignature = useMemo(() => signature(sanitizedInitial), [sanitizedInitial]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const schemaVersion = window.localStorage.getItem(STORAGE_SCHEMA_KEY);
    if (schemaVersion !== STORAGE_SCHEMA_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
      writeStorage(sanitizedInitial);
      setItems((prev) => (sameNotifications(prev, sanitizedInitial) ? prev : sanitizedInitial));
      return;
    }

    const stored = readStorage();
    if (stored.length === 0) {
      writeStorage(sanitizedInitial);
      setItems((prev) => (sameNotifications(prev, sanitizedInitial) ? prev : sanitizedInitial));
      return;
    }

    const merged = mergeById(stored, sanitizedInitial);
    setItems((prev) => (sameNotifications(prev, merged) ? prev : merged));
  }, [initialSignature, sanitizedInitial]);

  const persistAsync = useCallback((next: AppNotification[]) => {
    queueMicrotask(() => {
      writeStorage(next);
    });
  }, []);

  useEffect(() => {
    const onStorage = () => {
      const next = readStorage();
      if (next.length > 0) {
        setItems((prev) => (sameNotifications(prev, next) ? prev : next));
      }
    };

    const onLocalEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AppNotification[]>;
      if (Array.isArray(customEvent.detail)) {
        setItems((prev) => (sameNotifications(prev, customEvent.detail) ? prev : customEvent.detail));
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, onLocalEvent as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, onLocalEvent as EventListener);
    };
  }, []);

  const mergeIncoming = useCallback((incoming: AppNotification[]) => {
    setItems((prev) => {
      const next = mergeById(prev, incoming);
      persistAsync(next);
      return next;
    });
  }, [persistAsync]);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, unread: false }));
      persistAsync(next);
      return next;
    });
  }, [persistAsync]);

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, unread: false } : item));
      persistAsync(next);
      return next;
    });
  }, [persistAsync]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      persistAsync(next);
      return next;
    });
  }, [persistAsync]);

  return {
    items,
    unreadCount,
    mergeIncoming,
    markAllRead,
    markRead,
    dismiss,
  };
}
