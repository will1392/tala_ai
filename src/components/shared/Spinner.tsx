import React from "react";

export default function Spinner({ size = 16 }: { size?: number }) {
  const s = `${size}px`;
  return (
    <span
      className="inline-block animate-spin motion-reduce:animate-none rounded-full border-[3px] border-gray-300 dark:border-gray-600 border-t-primary"
      style={{ width: s, height: s }}
      aria-label="Loading"
      role="status"
    />
  );
}