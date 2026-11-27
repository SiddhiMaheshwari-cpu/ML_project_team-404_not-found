import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Smoothly tweens a number toward `target`. Jumps instantly when the user
// prefers reduced motion.
export default function useAnimatedNumber(target, duration = 800) {
  const [value, setValue] = useState(target ?? 0);
  const fromRef = useRef(target ?? 0);

  useEffect(() => {
    if (target == null) return undefined;
    if (prefersReducedMotion()) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * eased;
      fromRef.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}
