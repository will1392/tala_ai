import React from "react";
import { motion } from "framer-motion";

export default function ChatBubble({ from, text }: { from: "user" | "assistant"; text: string }) {
  const isUser = from === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm border ${
        isUser ? "ml-auto bg-[var(--panel)] border-[var(--border)]" : "bg-[var(--primary)]/10 border-[var(--primary)]/30"
      }`}
      role="group"
    >
      <p className="text-sm leading-relaxed">{text}</p>
    </motion.div>
  );
}