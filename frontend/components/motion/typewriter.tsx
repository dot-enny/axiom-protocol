"use client";

import { animate, motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface TypewriterProps {
  text: string;
  className?: string;
  charsPerSecond?: number;
}

/**
 * Terminal boot-up effect: characters reveal at a constant (linear) rate
 * — no easing curve, no bounce — then a hard-edged cursor blink takes
 * over once typing finishes. The blink is a square wave (instant on/off
 * via keyframe `times`), not a soft opacity fade.
 */
export function Typewriter({
  text,
  className = "",
  charsPerSecond = 40,
}: TypewriterProps) {
  const ref = useRef<HTMLPreElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(0, text.length, {
      duration: text.length / charsPerSecond,
      ease: "linear",
      onUpdate: (value) => setCount(Math.round(value)),
    });
    return () => controls.stop();
  }, [isInView, text, charsPerSecond]);

  const done = count >= text.length;

  return (
    <pre ref={ref} className={className}>
      {text.slice(0, count)}
      <motion.span
        aria-hidden
        className="inline-block bg-current align-text-bottom"
        style={{ width: "0.55em", height: "1.1em", marginLeft: 2 }}
        animate={
          done
            ? { opacity: [1, 1, 0, 0, 1] }
            : { opacity: 1 }
        }
        transition={
          done
            ? {
                duration: 1,
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.49, 0.5, 0.99, 1],
              }
            : undefined
        }
      />
    </pre>
  );
}
