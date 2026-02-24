"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppNotification } from "@/types/notifications";

import { readNotifications, writeNotifications, EVENT_NAME } from "@/utils/notifications";
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

async function readStorageAsync(): Promise<AppNotification[]> {
  if (typeof window === "undefined") return [];
  try {
    const items = await readNotifications();
    return sanitizeNotifications(items || []);
  } catch {
    return [];
  }
}

export function useSharedNotifications(initialItems: AppNotification[]) {
  const [items, setItems] = useState<AppNotification[]>(initialItems);
  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);
  const sanitizedInitial = useMemo(() => sanitizeNotifications(initialItems), [initialItems]);
  const initialSignature = useMemo(() => signature(sanitizedInitial), [sanitizedInitial]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    (async () => {
      const schemaVersion = window.localStorage.getItem(STORAGE_SCHEMA_KEY);
      if (schemaVersion !== STORAGE_SCHEMA_VERSION) {
        try {
          window.localStorage.removeItem("financepro.notifications.v1");
        } catch {}
        window.localStorage.setItem(STORAGE_SCHEMA_KEY, STORAGE_SCHEMA_VERSION);
        await writeNotifications(sanitizedInitial);
        setItems((prev) => (sameNotifications(prev, sanitizedInitial) ? prev : sanitizedInitial));
        return;
      }

      const stored = await readStorageAsync();
      if (stored.length === 0) {
        await writeNotifications(sanitizedInitial);
        setItems((prev) => (sameNotifications(prev, sanitizedInitial) ? prev : sanitizedInitial));
        return;
      }

      const merged = mergeById(stored, sanitizedInitial);
      setItems((prev) => (sameNotifications(prev, merged) ? prev : merged));
    })();
  }, [initialSignature, sanitizedInitial]);

  const persistAsync = useCallback((next: AppNotification[]) => {
    void (async () => {
      try {
        await writeNotifications(next);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onStorage = async () => {
      const next = await readStorageAsync();
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
