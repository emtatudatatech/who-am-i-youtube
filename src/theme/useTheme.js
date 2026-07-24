import { useEffect, useState } from "react";

// Persisted light/dark toggle. Stamps data-theme on <html>; absent = follow OS.
export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "system");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      root.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const toggle = () => setTheme(resolved === "dark" ? "light" : "dark");
  return { theme: resolved, toggle };
}
