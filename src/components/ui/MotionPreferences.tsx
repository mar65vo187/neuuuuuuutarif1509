"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/** Context-only wrapper: no additional HTML or visual layout. */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
