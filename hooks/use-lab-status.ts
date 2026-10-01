"use client";

import { useSyncExternalStore } from "react";
import type { LabsStatusResponse } from "@/lib/labs/jobs";

/**
 * Lab status shared by every component on the page (top bar, lab panels):
 * one poll of GET /api/labs/status per tab, every 2 s while an operation runs
 * or a lab is starting, every 10 s otherwise, and paused while the tab is
 * hidden.
 */

const FAST_MS = 2000;
const SLOW_MS = 10000;

let snapshot: LabsStatusResponse | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

function isBusy(data: LabsStatusResponse | null) {
  return !!data && (data.current !== null || Object.values(data.status?.states ?? {}).includes("starting"));
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (listeners.size === 0 || document.visibilityState === "hidden") return;
  timer = setTimeout(() => void refreshLabStatus(), isBusy(snapshot) ? FAST_MS : SLOW_MS);
}

/** Fetches the status now (e.g. right after starting an operation). */
export function refreshLabStatus(): Promise<void> {
  inFlight ??= fetch("/api/labs/status", { cache: "no-store" })
    .then((response) => (response.ok ? (response.json() as Promise<LabsStatusResponse>) : null))
    .then((data) => {
      if (data) {
        snapshot = data;
        listeners.forEach((notify) => notify());
      }
    })
    .catch(() => {
      // The dev server restarting, for instance: the next poll tries again.
    })
    .finally(() => {
      inFlight = null;
      schedule();
    });
  return inFlight;
}

function onVisibilityChange() {
  if (document.visibilityState === "visible") void refreshLabStatus();
  else schedule();
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibilityChange);
    void refreshLabStatus();
  }
  return () => {
    listeners.delete(notify);
    if (listeners.size === 0) {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      schedule();
    }
  };
}

export function useLabStatus(): LabsStatusResponse | null {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => null,
  );
}
