import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SafeAreaProps {
  children: ReactNode;
  /** Apply top safe-area padding (status bar / notch). Default true. */
  top?: boolean;
  /** Apply bottom safe-area padding (home indicator). Default true. */
  bottom?: boolean;
  /** Apply horizontal safe-area padding (landscape notches). Default false. */
  x?: boolean;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "main" | "section" | "header" | "footer";
}

/**
 * Unified Safe Area wrapper.
 * Applies env(safe-area-inset-*) padding so content never sits under the
 * device status bar / home indicator. Use around page content or any
 * scroll container that should respect device safe zones.
 */
export function SafeArea({
  children,
  top = true,
  bottom = true,
  x = false,
  className,
  style,
  as: Tag = "div",
}: SafeAreaProps) {
  return (
    <Tag
      className={cn(
        top && "safe-top",
        bottom && "safe-bottom",
        x && "safe-x",
        className,
      )}
      style={style}
    >
      {children}
    </Tag>
  );
}
