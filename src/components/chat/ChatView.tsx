import React, { useState } from "react";
import Topbar from "../layout/Topbar";
import StageBar from "./StageBar";
import type { Stage } from "./StageBar";
import ChatBubble from "./ChatBubble";
import { Upload, Send } from "lucide-react";

export default function ChatView() {
  const [stage, setStage] = useState<Stage>("received");
  const [messages, setMessages] = useState<{ from: "user" | "assistant"; text: string }[]>([
    { from: "assistant", text: "Hi! I can analyze travel docs and give you fast answers." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  function simulatePipeline(userText: string) {
    const steps: { wait: number; stage: Stage; reply?: string }[] = [
      { wait: 400, stage: "uploading" },
      { wait: 700, stage: "processing" },
      {
        wait: 900,
        stage: "answering",
        reply: "Here are 3 ideas for your Portugal beach trip: Lagos (Ponta da Piedade), Comporta, and Praia da Marinha. Want a day-by-day plan?",
      },
      { wait: 300, stage: "complete" },
    ];
    let t = 0;
    steps.forEach((step) => {
      t += step.wait;
      setTimeout(() => {
        setStage(step.stage);
        if (step.reply) setMessages((m) => [...m, { from: "assistant", text: step.reply! }]);
      }, t);
    });
  }

  const onSend = () => {
    if (!input.trim()) return;
    setBusy(true);
    setMessages((m) => [...m, { from: "user", text: input }]);
    setInput("");
    setStage("received");
    simulatePipeline(input);
    setTimeout(() => setBusy(false), 2400);
  };

  return (
    <div className="h-full flex flex-col">
      <Topbar title="Chat" />
      <div className="mx-auto w-full max-w-5xl px-4">
        <StageBar stage={stage} />
        <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-4 h-[60vh] overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <ChatBubble key={i} from={m.from} text={m.text} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 flex items-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] pr-2 focus-within:ring-2 focus-within:ring-[var(--ring)]">
            <button className="p-2 text-[var(--muted)] hover:text-[var(--fg)]" title="Upload (mock)">
              <Upload size={18} />
            </button>
            <input
              aria-label="Message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              placeholder="Ask Tala…"
              className="w-full bg-transparent px-2 py-3 outline-none text-sm"
            />
            <button
              onClick={onSend}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[var(--primary)]/90 text-black px-3 py-2 font-medium disabled:opacity-50"
            >
              <Send size={16} /> Send
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">This is a sandboxed demo with staged progress and dummy responses.</p>
      </div>
    </div>
  );
}