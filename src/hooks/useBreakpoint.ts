import { useEffect, useState } from "react";

export function useIsMobile(bp: number = 768) { // md = 768px by default
  const [isMobile, set] = useState(() => 
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  
  useEffect(() => {
    const onResize = () => set(window.innerWidth < bp);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);
  
  return isMobile;
}

export function useIsTablet(minBp: number = 768, maxBp: number = 1024) {
  const [isTablet, set] = useState(() => 
    typeof window !== "undefined" 
      ? window.innerWidth >= minBp && window.innerWidth < maxBp 
      : false
  );
  
  useEffect(() => {
    const onResize = () => set(window.innerWidth >= minBp && window.innerWidth < maxBp);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minBp, maxBp]);
  
  return isTablet;
}