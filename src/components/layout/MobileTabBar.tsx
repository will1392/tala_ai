import React from "react";
import { MessageCircle, BookOpen, Settings, Home } from "lucide-react";

type Tab = "chat" | "knowledge" | "dashboard" | "settings";

export default function MobileTabBar({
  value, 
  onChange,
}: { 
  value: Tab; 
  onChange: (v: Tab) => void 
}) {
  const Item = ({ 
    tab, 
    label, 
    Icon 
  }: {
    tab: Tab; 
    label: string; 
    Icon: any
  }) => (
    <button
      onClick={() => onChange(tab)}
      className={`flex-1 py-3 px-2 min-h-[56px] flex flex-col items-center justify-center
                  transition-colors ${
                    value === tab 
                      ? "text-primary" 
                      : "text-gray-500 dark:text-gray-400"
                  }`}
      aria-current={value === tab ? "page" : undefined}
    >
      <Icon size={20} />
      <span className="text-[11px] mt-1">{label}</span>
    </button>
  );
  
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40
                 border-t border-gray-200 dark:border-gray-700 
                 bg-white dark:bg-gray-800 shadow-lg"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Primary navigation"
      data-tour="tabs"
    >
      <div className="flex">
        <Item tab="dashboard" label="Home" Icon={Home} />
        <Item tab="chat" label="Chat" Icon={MessageCircle} />
        <Item tab="knowledge" label="Knowledge" Icon={BookOpen} />
        <Item tab="settings" label="Settings" Icon={Settings} />
      </div>
    </nav>
  );
}