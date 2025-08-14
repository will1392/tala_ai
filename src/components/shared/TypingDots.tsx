import React from "react";

export default function TypingDots() {
  return (
    <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400" aria-live="polite">
      <span className="sr-only">Assistant is typing</span>
      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce motion-reduce:animate-none [animation-delay:-0.2s]" />
      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce motion-reduce:animate-none" />
      <span className="inline-block w-2 h-2 rounded-full bg-gray-500 dark:bg-gray-400 animate-bounce motion-reduce:animate-none [animation-delay:0.2s]" />
    </div>
  );
}