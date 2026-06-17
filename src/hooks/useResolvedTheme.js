import { useEffect, useState } from "react";

export function useResolvedTheme(theme = "system") {
  const getSystemTheme = () => {
    if (typeof window === "undefined" || !window.matchMedia) return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(query.matches ? "dark" : "light");
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return theme === "system" ? systemTheme : theme;
}
