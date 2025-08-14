import React from "react";
import { ChevronRight } from "lucide-react";

export const STAGES = ["received", "uploading", "processing", "answering", "complete"] as const;
export type Stage = typeof STAGES[number];

export default function StageBar({ stage }: { stage: Stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div className="flex items-center gap-6 px-2 py-3">
      {STAGES.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`h-2 w-14 rounded-full ${i <= idx ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
          <div className={`h-3 w-3 rounded-full ${i <= idx ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />
          <span className={`text-xs ${i <= idx ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>{s}</span>
          {i < STAGES.length - 1 && <ChevronRight size={14} className="text-[var(--muted)]" />}
        </div>
      ))}
    </div>
  );
}