"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

type RoomContentTransitionProps = {
  /** Changes when the active room changes — remounts children with a soft fade/slide. */
  roomKey: string | number;
  children: ReactNode;
  className?: string;
};

const transition = {
  duration: 0.32,
  ease: [0.22, 1, 0.36, 1] as const,
};

/**
 * Soft cross-fade + slight rise when room-scoped content swaps.
 * Keeps package/date updates feeling intentional rather than abrupt.
 */
export function RoomContentTransition({
  roomKey,
  children,
  className,
}: RoomContentTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={roomKey}
        className={cn(className)}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
