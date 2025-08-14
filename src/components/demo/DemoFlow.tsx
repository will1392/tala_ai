import React, { useState } from "react";
import Topbar from "../layout/Topbar";
import { PlayCircle, CheckCircle2, ChevronRight, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function DemoFlow() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ ts: number; type: string; text: string }[]>([]);
  const push = (type: string, text: string) => setLog((l) => [...l, { ts: Date.now(), type, text }]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setLog([]);
    const steps = [
      { t: 300, type: "status", text: "Received request and created job" },
      { t: 900, type: "progress", text: "Uploading 1 file (2.1MB)" },
      { t: 1500, type: "progress", text: "Extracting text (PDF) – 8 pages" },
      { t: 2100, type: "progress", text: "Searching knowledge base (5 hits)" },
      { t: 2600, type: "progress", text: "Drafting answer…" },
      { t: 3000, type: "complete", text: "Done" },
    ];
    for (const s of steps) {
      await new Promise((r) => setTimeout(r, s.t));
      push(s.type, s.text);
    }
    setRunning(false);
  };

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Demo Flow" />
      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Streaming Status (Mock)</div>
              <p className="text-sm text-[var(--muted)]">Shows how Tala can surface granular progress and errors.</p>
            </div>
            <button
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)]/90 text-black px-3 py-2 font-medium disabled:opacity-50"
            >
              <PlayCircle size={16} /> {running ? "Running…" : "Run Demo"}
            </button>
          </div>
          <div className="mt-3 space-y-2 max-h-[45vh] overflow-auto">
            <AnimatePresence>
              {log.map((row, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  className="text-sm flex items-center gap-2"
                >
                  {row.type === "complete" ? (
                    <CheckCircle2 className="text-green-400" size={16} />
                  ) : row.type === "progress" ? (
                    <ChevronRight size={16} className="text-[var(--muted)]" />
                  ) : (
                    <TriangleAlert size={16} className="text-yellow-400" />
                  )}
                  <span className="text-[var(--muted)]">{new Date(row.ts).toLocaleTimeString()}</span>
                  <span>• {row.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}