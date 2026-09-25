"use client";

import { type RefObject, useEffect } from "react";

/**
 * Keeps a CSS custom property on <html> equal to the element's live height, so sticky and fixed elements
 * elsewhere (e.g. `top-[var(--header-h)]`) line up with it however it wraps or resizes.
 */
export function usePublishedHeight(ref: RefObject<HTMLElement | null>, variable: `--${string}`) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const root = document.documentElement.style;
    const observer = new ResizeObserver(([entry]) => {
      root.setProperty(variable, `${Math.round(entry.borderBoxSize[0].blockSize)}px`);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.removeProperty(variable);
    };
  }, [ref, variable]);
}
