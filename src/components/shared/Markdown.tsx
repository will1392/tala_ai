import React, { useMemo, useRef, useEffect } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

marked.setOptions({
  breaks: true,         // treat single newlines as <br>
  gfm: true,            // GitHub flavoured (tables, strikethrough)
  headerIds: false,     // avoid auto-ids unless you want TOC
});

function sanitize(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    try {
      const raw = marked.parse(content) as string;
      const safe = sanitize(raw);
      return safe.replaceAll("<a ", '<a target="_blank" rel="noopener noreferrer" ');
    } catch {
      return "";
    }
  }, [content]);

  // Add copy buttons to code blocks
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const blocks = root.querySelectorAll("pre > code");
    blocks.forEach((code) => {
      const pre = code.parentElement as HTMLElement;
      if (!pre || pre.querySelector("[data-copy]")) return;
      const btn = document.createElement("button");
      btn.textContent = "Copy";
      btn.setAttribute("data-copy", "1");
      btn.className =
        "absolute top-2 right-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 hover:border-primary/60 transition-colors";
      btn.onclick = () => {
        navigator.clipboard.writeText(code.textContent || "");
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = "Copy"), 1200);
      };
      pre.style.position = "relative";
      pre.appendChild(btn);
    });
  }, [html]);

  // If parsing failed or content isn't markdown-y, fall back to plain text
  const looksPlain = !/[#*_`>\[\]\(\)\-\+|]/.test(content) && !content.includes("\n");

  if (!html || looksPlain) {
    return <p className="whitespace-pre-wrap leading-relaxed text-gray-900 dark:text-gray-100">{content}</p>;
  }

  return (
    <div
      ref={ref}
      className="tala-prose prose prose-sm dark:prose-invert max-w-none"
      // NOTE: safe because we sanitize above
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}