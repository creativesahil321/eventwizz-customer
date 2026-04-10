"use client";

import React, { useMemo } from "react";
import type { AmbientConfig } from "./theme-configs";

interface AmbientOverlayProps {
  config: AmbientConfig;
}

// ---------------------------------------------------------------------------
// CSS keyframes injected once
// ---------------------------------------------------------------------------
const AMBIENT_CSS = `
@keyframes ambient-breathe {
  0%, 100% { opacity: var(--amb-lo); transform: scale(1); }
  50% { opacity: var(--amb-hi); transform: scale(1.05); }
}

@keyframes ambient-pulse {
  0%, 100% { opacity: var(--amb-lo); }
  50% { opacity: var(--amb-hi); }
}

@keyframes ambient-sweep {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes ambient-rainbow {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

@keyframes ambient-flicker {
  0%, 100% { opacity: var(--amb-hi); }
  25% { opacity: var(--amb-lo); }
  50% { opacity: var(--amb-hi); }
  75% { opacity: calc(var(--amb-lo) + (var(--amb-hi) - var(--amb-lo)) * 0.5); }
}

@keyframes ambient-spotlight {
  0%, 100% { opacity: var(--amb-lo); transform: translateX(-50%) scaleX(1); }
  50% { opacity: var(--amb-hi); transform: translateX(-50%) scaleX(1.15); }
}
`;

// Inject CSS once
if (typeof document !== "undefined") {
  const existing = document.getElementById("ambient-overlay-keyframes");
  if (!existing) {
    const style = document.createElement("style");
    style.id = "ambient-overlay-keyframes";
    style.textContent = AMBIENT_CSS;
    document.head.appendChild(style);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AmbientOverlay({ config }: AmbientOverlayProps) {
  const { colors, gradientType, gradientAngle, animation, duration, opacity } =
    config;

  const gradient = useMemo(() => {
    const colorStr = colors.join(", ");
    switch (gradientType) {
      case "radial":
        return `radial-gradient(ellipse at 50% 30%, ${colorStr})`;
      case "conic":
        return `conic-gradient(from 0deg at 50% 50%, ${colorStr})`;
      case "linear":
      default:
        return `linear-gradient(${gradientAngle ?? 135}deg, ${colorStr})`;
    }
  }, [colors, gradientType, gradientAngle]);

  const animationName = useMemo(() => {
    switch (animation) {
      case "breathe":
        return "ambient-breathe";
      case "pulse":
        return "ambient-pulse";
      case "sweep":
        return "ambient-sweep";
      case "rainbow-cycle":
        return "ambient-rainbow";
      case "flicker":
        return "ambient-flicker";
      case "spotlight":
        return "ambient-spotlight";
      default:
        return "none";
    }
  }, [animation]);

  // For spotlight, render a different structure
  if (animation === "spotlight") {
    return (
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 9 }}
        aria-hidden="true"
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            width: "50%",
            height: "100%",
            background:
              "radial-gradient(ellipse at top center, rgba(255,255,255,0.06) 0%, transparent 70%)",
            animation: `ambient-spotlight ${duration}s ease-in-out infinite`,
            ["--amb-lo" as string]: `${opacity * 0.5}`,
            ["--amb-hi" as string]: `${opacity}`,
          }}
        />
      </div>
    );
  }

  // Sweep needs larger background-size for the animation
  const isSweep = animation === "sweep";

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 9,
        background: gradient,
        backgroundSize: isSweep ? "300% 300%" : "100% 100%",
        animation: `${animationName} ${duration}s ease-in-out infinite`,
        ["--amb-lo" as string]: `${opacity * 0.4}`,
        ["--amb-hi" as string]: `${opacity}`,
        opacity,
      }}
      aria-hidden="true"
    />
  );
}
