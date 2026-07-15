"use client";
import { useEffect } from "react";
export function useFilingShortcuts(h: { onSave?: () => void; onSearch?: () => void; onNew?: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); h.onSave?.(); }
      if (k === "k") { e.preventDefault(); h.onSearch?.(); }
      if (k === "n") { e.preventDefault(); h.onNew?.(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [h]);
}
