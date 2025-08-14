import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

type Step = {
  id: string;                 // "sidebar", "upload", ...
  target: string;             // CSS selector, e.g. [data-tour="sidebar"]
  title: string;
  body: string;
  placement?: "top"|"right"|"bottom"|"left"|"auto";
  navigateTo?: string;        // Optional path to navigate to
};

type Ctx = {
  steps: Step[];
  index: number;
  running: boolean;
  start: (steps?: Step[]) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  go: (i: number) => void;
};

const TourCtx = createContext<Ctx | null>(null);

export const useTour = () => {
  const v = useContext(TourCtx);
  if(!v) throw new Error("useTour must be inside <TourProvider>");
  return v;
};

const LS_KEY = "tala_tour_seen";

export function TourProvider({ children, defaultSteps }: { children: React.ReactNode; defaultSteps: Step[] }) {
  const [steps, setSteps] = useState<Step[]>(defaultSteps);
  const [index, setIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const api = useMemo<Ctx>(() => ({
    steps, index, running,
    start: (s) => { 
      if(s) setSteps(s); 
      setIndex(0); 
      setRunning(true); 
    },
    stop: () => { 
      setRunning(false); 
      localStorage.setItem(LS_KEY, "1");
    },
    next: () => {
      if (index >= steps.length - 1) {
        setRunning(false);
        localStorage.setItem(LS_KEY, "1");
      } else {
        const nextIndex = index + 1;
        const nextStep = steps[nextIndex];
        
        // If the next step requires navigation, navigate first
        if (nextStep?.navigateTo && location.pathname !== nextStep.navigateTo) {
          navigate(nextStep.navigateTo);
          // Give the page time to render before continuing
          setTimeout(() => setIndex(nextIndex), 300);
        } else {
          setIndex(nextIndex);
        }
      }
    },
    prev: () => setIndex(i => Math.max(0, i - 1)),
    go: (i: number) => setIndex(Math.max(0, Math.min(steps.length - 1, i))),
  }), [steps, index, running, navigate, location]);

  // Dismiss on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.key === "Escape") api.stop();
      if (e.key === "ArrowRight") api.next();
      if (e.key === "ArrowLeft") api.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, api]);

  // Auto-start for first-time users
  useEffect(() => {
    const seen = localStorage.getItem(LS_KEY);
    if (!seen && defaultSteps.length > 0) {
      setTimeout(() => setRunning(true), 800);   // small delay after mount
    }
  }, [defaultSteps]);

  return (
    <TourCtx.Provider value={api}>
      {children}
      <Spotlight steps={steps} index={index} running={running} onClose={api.stop} onPrev={api.prev} onNext={api.next}/>
    </TourCtx.Provider>
  );
}

/** Overlay + tooltip positioned near target element */
function Spotlight({ steps, index, running, onClose, onPrev, onNext }: {
  steps: Step[]; index: number; running: boolean;
  onClose: ()=>void; onPrev: ()=>void; onNext: ()=>void;
}) {
  const step = steps[index];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!running || !step) { 
      setRect(null); 
      return; 
    }
    
    const update = () => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        const newRect = el.getBoundingClientRect();
        setRect(newRect);
        // Scroll element into view if needed
        if (newRect.top < 100 || newRect.bottom > window.innerHeight - 100) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      raf.current = requestAnimationFrame(update); // track layout / resize
    };
    
    // Initial delay to ensure DOM is ready
    setTimeout(update, 100);
    
    return () => { 
      if (raf.current) cancelAnimationFrame(raf.current); 
    };
  }, [running, step?.target]);

  if (!running || !step || !rect) return null;

  // Tooltip position
  const pad = 16; // Increased padding from element
  const tooltipWidth = 280;
  const tooltipHeight = 180;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Prioritize placement that doesn't cover the element
  // For most elements, prefer bottom or top first
  const defaultPlacements: Step["placement"][] = ["bottom", "top", "right", "left"];
  const placements: Step["placement"][] = step.placement === "auto" || !step.placement
    ? defaultPlacements : [step.placement, ...defaultPlacements.filter(p => p !== step.placement)];

  // choose first placement that fits
  let ttTop = 0, ttLeft = 0, chosen: Step["placement"] | null = null;
  
  for (const p of placements) {
    if (p === "bottom" && rect.bottom + tooltipHeight + pad < viewportHeight) { 
      ttTop = rect.bottom + pad; 
      // Center horizontally relative to the element, but keep within viewport
      const idealLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      ttLeft = Math.max(pad, Math.min(idealLeft, viewportWidth - tooltipWidth - pad)); 
      chosen = "bottom"; 
      break; 
    }
    if (p === "top" && rect.top - tooltipHeight - pad > 0) { 
      ttTop = rect.top - tooltipHeight - pad; 
      // Center horizontally relative to the element, but keep within viewport
      const idealLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      ttLeft = Math.max(pad, Math.min(idealLeft, viewportWidth - tooltipWidth - pad)); 
      chosen = "top"; 
      break; 
    }
    if (p === "right" && rect.right + tooltipWidth + pad < viewportWidth) { 
      // Vertically center relative to element
      const idealTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
      ttTop = Math.max(pad, Math.min(idealTop, viewportHeight - tooltipHeight - pad)); 
      ttLeft = rect.right + pad; 
      chosen = "right"; 
      break; 
    }
    if (p === "left" && rect.left - tooltipWidth - pad > pad) { 
      // Vertically center relative to element
      const idealTop = rect.top + (rect.height / 2) - (tooltipHeight / 2);
      ttTop = Math.max(pad, Math.min(idealTop, viewportHeight - tooltipHeight - pad)); 
      ttLeft = rect.left - tooltipWidth - pad; 
      chosen = "left"; 
      break; 
    }
  }
  
  // Fallback if no placement fits - prefer bottom to avoid covering
  if (!chosen) { 
    // Try to place below even if it means scrolling
    if (rect.bottom + pad + 50 < viewportHeight) {
      ttTop = rect.bottom + pad;
      const idealLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      ttLeft = Math.max(pad, Math.min(idealLeft, viewportWidth - tooltipWidth - pad));
    } else {
      // Last resort: place above
      ttTop = Math.max(pad, rect.top - tooltipHeight - pad);
      const idealLeft = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      ttLeft = Math.max(pad, Math.min(idealLeft, viewportWidth - tooltipWidth - pad));
    }
  }

  const isLastStep = index === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* dim background - much lighter overlay */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />

      {/* highlight box with animation - lighter shadow */}
      <div
        className="absolute rounded-xl ring-4 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.2)] transition-all duration-300 pointer-events-none"
        style={{ 
          top: rect.top - 4, 
          left: rect.left - 4, 
          width: rect.width + 8, 
          height: rect.height + 8
        }}
        aria-hidden
      />

      {/* tooltip card */}
      <div
        className="absolute w-[280px] max-w-[calc(100vw-32px)] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xl animate-[toast-in_200ms_ease-out]"
        style={{ top: ttTop, left: ttLeft }}
        role="dialog" 
        aria-modal="true"
        aria-label={step.title}
      >
        <div className="flex items-start gap-2">
          <div className="font-semibold flex-1 text-gray-900 dark:text-white">{step.title}</div>
          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
            aria-label="Close tour"
          >
            <X size={16} className="text-gray-500 dark:text-gray-400"/>
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button 
            onClick={onPrev} 
            disabled={index === 0}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm"
          >
            <ChevronLeft size={16}/> Back
          </button>
          <div className="text-xs text-gray-500 dark:text-gray-400">{index+1} of {steps.length}</div>
          <button 
            onClick={onNext} 
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors ${
              isLastStep 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-primary hover:bg-primary/90 text-white'
            }`}
          >
            {isLastStep ? 'Finish' : 'Next'} <ChevronRight size={16}/>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export type { Step };