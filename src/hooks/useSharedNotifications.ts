"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppNotification } from "@/types/notifications";

const STORAGE_KEY = "financepro.notifications.v1";
const EVENT_NAME = "financepro-notifications-updated";

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

function readStorage(): AppNotification[] {
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

function writeStorage(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: items }));
}

export function useSharedNotifications(initialItems: AppNotification[]) {
  const [items, setItems] = useState<AppNotification[]>(() => {
    const stored = readStorage();
    if (stored.length > 0) return mergeById(stored, initialItems);
    return initialItems;
  });
  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);

  useEffect(() => {
    const stored = readStorage();
    if (stored.length === 0) writeStorage(initialItems);
  }, [initialItems]);

  useEffect(() => {
    const onStorage = () => {
      const next = readStorage();
      if (next.length > 0) setItems(next);
    };

    const onLocalEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AppNotification[]>;
      if (Array.isArray(customEvent.detail)) {
        setItems(customEvent.detail);
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
      writeStorage(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((item) => ({ ...item, unread: false }));
      writeStorage(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, unread: false } : item));
      writeStorage(next);
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      writeStorage(next);
      return next;
    });
  }, []);

  return {
    items,
    unreadCount,
    mergeIncoming,
    markAllRead,
    markRead,
    dismiss,
  };
}
