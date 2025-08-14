import React from "react";
import { AlertTriangle, Info, CheckCircle2, X } from "lucide-react";
import { getAriaRole, getAriaLive } from "../../utils/accessibility";

type Kind = "info" | "success" | "warning" | "error";

export default function InlineNotice({
  kind = "info",
  title,
  message,
  onDismiss,
  className = "",
}: {
  kind?: Kind;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const Icon = kind === "error" ? AlertTriangle : kind === "warning" ? AlertTriangle : kind === "success" ? CheckCircle2 : Info;
  const tone =
    kind === "error" ? "text-red-400" :
    kind === "warning" ? "text-yellow-400" :
    kind === "success" ? "text-green-400" : "text-gray-500 dark:text-gray-400";

  return (
    <div 
      className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 ${className}`}
      role={getAriaRole(kind)}
      aria-live={getAriaLive(kind)}
      aria-atomic="true"
    >
      <div className="flex items-start gap-2">
        <Icon size={18} className={tone} aria-hidden="true" />
        <div className="flex-1">
          {title ? <div className="font-medium mb-0.5 text-gray-900 dark:text-white">{title}</div> : null}
          <div className="text-sm text-gray-700 dark:text-gray-300">{message}</div>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss} 
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary" 
            aria-label={`Dismiss ${title || 'notice'}`}
          >
            <X size={16} className="text-gray-500 dark:text-gray-400" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}