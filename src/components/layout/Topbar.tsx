import React from "react";
import { Sparkles, PlusCircle, Settings, Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContextNew";

export default function Topbar({ title, onNew }: { title: string; onNew?: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--panel)]/70 border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <Sparkles className="text-[var(--primary)]" />
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {onNew && (
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm hover:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--ring)]"
            >
              <PlusCircle size={16} /> New
            </button>
          )}
          <button
            aria-label="Toggle theme"
            onClick={toggle}
            className="rounded-xl border border-[var(--border)] p-2 hover:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--ring)]"
            title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="rounded-xl border border-[var(--border)] p-2 hover:border-[var(--primary)]/60 focus:ring-2 focus:ring-[var(--ring)]" title="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}