import { useCallback, useEffect, useState } from "react";

const SIDEBAR_WIDTH_KEY = "hyperchat:sidebar-width";
const DEFAULT_WIDTH = 364;
const MIN_WIDTH = 292;
const MAX_WIDTH = 520;

const clamp = (value) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

const readStoredWidth = () => {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
  return Number.isFinite(stored) ? clamp(stored) : DEFAULT_WIDTH;
};

export function useSidebarResize() {
  const [sidebarWidth, setSidebarWidth] = useState(readStoredWidth);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((event) => {
    event?.preventDefault?.();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return undefined;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    const handlePointerMove = (event) => {
      const nextWidth = clamp(event.clientX);
      setSidebarWidth(nextWidth);
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(nextWidth));
    };

    const stop = () => setIsResizing(false);

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stop);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stop);
    };
  }, [isResizing]);

  return { sidebarWidth, isResizing, startResizing };
}
