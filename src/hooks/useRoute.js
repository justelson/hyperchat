import { useCallback, useEffect, useState } from "react";

export function useRoute() {
  const [routePath, setRoutePath] = useState(() => {
    if (typeof window === "undefined") return "/app";
    return window.location.pathname || "/app";
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handlePopState = () => setRoutePath(window.location.pathname || "/app");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path, options = {}) => {
    if (typeof window === "undefined") return;
    const nextPath = path || "/app";
    if (window.location.pathname === nextPath && !options.replace) return;
    const method = options.replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
    setRoutePath(nextPath);
  }, []);

  return { routePath, navigate };
}
