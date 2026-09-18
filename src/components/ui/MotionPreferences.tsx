import type { ReactNode } from "react";

/** Kept as a compatibility wrapper; motion preferences are handled in CSS. */
export function MotionPreferences({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
