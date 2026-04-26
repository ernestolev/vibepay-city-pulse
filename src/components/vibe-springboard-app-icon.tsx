import { useId } from "react";
import { cn } from "@/lib/utils";

/** “Sparkasse”-style: red + white S (generic, not a trademarked mark). + Payone/DSV accent dot. */
export type SpringboardAppIconVariant = "sparkasse" | "dsv";

export interface VibeSpringboardAppIconProps {
  className?: string;
  /** 64 = springboard; larger when zooming */
  size?: number;
  variant?: SpringboardAppIconVariant;
}

/**
 * Home-screen tile for the device demo: bank (Sparkasse-like S or DSV Gruppe) + Payone green dot.
 */
export function VibeSpringboardAppIcon({
  className,
  size = 64,
  variant = "sparkasse",
}: VibeSpringboardAppIconProps) {
  const uid = useId();
  const gradId = `vibe-spring-grad-${uid.replace(/:/g, "")}`;

  if (variant === "dsv") {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className={cn("shrink-0 select-none", className)}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0f2940" />
            <stop offset="100%" stopColor="#1a3d56" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
        <circle cx="50" cy="16" r="3.2" fill="#10b981" />
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fill="white"
          fontSize="18"
          fontWeight="800"
          fontFamily="Open Sans, system-ui, sans-serif"
          letterSpacing="0.14em"
        >
          DSV
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e60012" />
          <stop offset="100%" stopColor="#b0080a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${gradId})`} />
      <circle cx="50" cy="16" r="3.2" fill="#10b981" />
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fill="white"
        fontSize="34"
        fontWeight="800"
        fontFamily="Open Sans, system-ui, sans-serif"
        letterSpacing="-0.02em"
      >
        S
      </text>
    </svg>
  );
}
