"use client";

import React, { useMemo } from "react";
import {
  detectTheme,
  type ThemeDetectionInput,
  type ThemeType,
} from "./theme-detector";
import type { EventDetail } from "@/services/common/events/type";
import { THEME_CONFIGS, CSSDecoration } from "./theme-configs";
import { ParticleEngine } from "./particle-engine";
import { AmbientOverlay } from "./ambient-overlay";
import { ThemeCSSEffects } from "./theme-css-effects";
import { ThemeSVGOverlays } from "./theme-svg-overlays";
import { useIsPreviewMode } from "@/contexts/preview-context";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ThemeAnimationManagerProps {
  /** Live public event page: use API event detail for theme keywords / `detected_theme`. */
  eventData?: EventDetail | null;
  /**
   * Vendor editor + onboarding previews use step-based payloads; pass mapped fields so
   * `detectTheme` sees the same copy as the live page (otherwise previews show no theme FX).
   */
  themeDetectionSource?: ThemeDetectionInput | null;
  enabled?: boolean;
  intensity?: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// CSS Decoration animation keyframes (injected once)
// ---------------------------------------------------------------------------

const DECORATION_CSS = `
@keyframes deco-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

@keyframes deco-pulse-glow {
  0%, 100% { transform: scale(1); opacity: var(--deco-opa); }
  50% { transform: scale(1.12); opacity: calc(var(--deco-opa) + 0.08); }
}

@keyframes deco-drift {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(8px) translateY(-4px); }
  75% { transform: translateX(-8px) translateY(4px); }
}

@keyframes deco-spin-slow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes deco-flicker {
  0%, 100% { opacity: var(--deco-opa); }
  15% { opacity: calc(var(--deco-opa) * 0.5); }
  30% { opacity: var(--deco-opa); }
  50% { opacity: calc(var(--deco-opa) * 0.4); }
  65% { opacity: calc(var(--deco-opa) * 0.85); }
  80% { opacity: calc(var(--deco-opa) * 0.55); }
}

/* Preview frames: keep FX inside the device frame (not the editor chrome). */
.theme-animations-contained {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  pointer-events: none !important;
  z-index: 30;
}
.theme-animations-contained .fixed {
  position: absolute !important;
}
`;

if (typeof document !== "undefined") {
  const existing = document.getElementById("theme-deco-keyframes");
  if (!existing) {
    const style = document.createElement("style");
    style.id = "theme-deco-keyframes";
    style.textContent = DECORATION_CSS;
    document.head.appendChild(style);
  } else if (!existing.textContent?.includes("theme-animations-contained")) {
    existing.textContent += `
.theme-animations-contained {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow: hidden !important;
  pointer-events: none !important;
  z-index: 30;
}
.theme-animations-contained .fixed {
  position: absolute !important;
}
`;
  }
}

// ---------------------------------------------------------------------------
// Decoration position & animation helpers
// ---------------------------------------------------------------------------

const DECO_POSITION_STYLES: Record<CSSDecoration["position"], React.CSSProperties> = {
  "top-left": { position: "fixed", top: "96px", left: "16px" },
  "top-right": { position: "fixed", top: "96px", right: "16px" },
  "bottom-left": { position: "fixed", bottom: "16px", left: "16px" },
  "bottom-right": { position: "fixed", bottom: "16px", right: "16px" },
};

const DECO_ANIMATION_MAP: Record<CSSDecoration["animation"], string> = {
  float: "deco-float 5s ease-in-out infinite",
  "pulse-glow": "deco-pulse-glow 4s ease-in-out infinite",
  drift: "deco-drift 6s ease-in-out infinite",
  "spin-slow": "deco-spin-slow 20s linear infinite",
  flicker: "deco-flicker 2.5s ease-in-out infinite",
};

// ---------------------------------------------------------------------------
// CSS Decorations Renderer — renders gradient orbs, rings, diamonds, etc.
// ---------------------------------------------------------------------------

function CSSDecorations({
  decorations,
}: {
  decorations: CSSDecoration[] | undefined;
}) {
  const list = Array.isArray(decorations) ? decorations : [];
  return (
    <>
      {list.map((deco, i) => {
        const colors = deco.gradientColors ?? [];
        const gradient = `radial-gradient(circle, ${colors.join(", ")})`;

        // Shape-specific styles
        let shapeStyles: React.CSSProperties = {};
        switch (deco.shape) {
          case "orb":
            shapeStyles = {
              width: `${deco.size}px`,
              height: `${deco.size}px`,
              borderRadius: "50%",
              background: gradient,
              filter: `blur(${deco.blur}px)`,
            };
            break;
          case "ring":
            shapeStyles = {
              width: `${deco.size}px`,
              height: `${deco.size}px`,
              borderRadius: "50%",
              background: "transparent",
              border: `2px solid ${colors[0] ?? "#fff"}`,
              boxShadow: `0 0 ${deco.blur}px ${colors[0] ?? "#fff"}, inset 0 0 ${deco.blur * 0.5}px ${colors[0] ?? "#fff"}`,
            };
            break;
          case "diamond":
            shapeStyles = {
              width: `${deco.size * 0.7}px`,
              height: `${deco.size}px`,
              background: gradient,
              filter: `blur(${deco.blur}px)`,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
            };
            break;
          case "streak":
            shapeStyles = {
              width: `${deco.size * 1.5}px`,
              height: `${deco.size * 0.15}px`,
              borderRadius: `${deco.size}px`,
              background: `linear-gradient(90deg, transparent, ${colors[0] ?? "#fff"}, transparent)`,
              filter: `blur(${deco.blur * 0.5}px)`,
            };
            break;
          case "crescent":
            shapeStyles = {
              width: `${deco.size}px`,
              height: `${deco.size}px`,
              borderRadius: "50%",
              background: gradient,
              filter: `blur(${deco.blur * 0.3}px)`,
              boxShadow: `inset ${deco.size * 0.25}px -${deco.size * 0.1}px 0 ${deco.size * 0.15}px rgba(0,0,0,0.9)`,
            };
            break;
        }

        return (
          <div
            key={i}
            className="pointer-events-none"
            style={{
              ...DECO_POSITION_STYLES[deco.position],
              ...shapeStyles,
              zIndex: 11,
              animation: DECO_ANIMATION_MAP[deco.animation],
              animationDelay: `${deco.delay}s`,
              ["--deco-opa" as string]: `${deco.opacity}`,
              opacity: deco.opacity,
            }}
            aria-hidden="true"
          />
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Main Manager Component — 5-layer rendering pipeline
// ---------------------------------------------------------------------------

export function ThemeAnimationManager({
  eventData,
  themeDetectionSource,
  enabled = true,
  intensity = "medium",
}: ThemeAnimationManagerProps) {
  const isPreviewMode = useIsPreviewMode();
  const detectedTheme = detectTheme(
    themeDetectionSource ?? (eventData as ThemeDetectionInput | null | undefined),
  );

  // Memoize config lookup
  const themeConfig = useMemo(() => {
    if (detectedTheme === "none") return null;
    return THEME_CONFIGS[detectedTheme as Exclude<ThemeType, "none">] ?? null;
  }, [detectedTheme]);

  // Don't render if animations are disabled or no theme detected / incomplete config
  if (
    !enabled ||
    !themeConfig ||
    !themeConfig.particles ||
    !themeConfig.ambient ||
    !Array.isArray(themeConfig.decorations)
  ) {
    return null;
  }

  return (
    <div
      className={cn(
        "theme-animations-container",
        isPreviewMode && "theme-animations-contained",
      )}
      data-theme={detectedTheme}
      aria-hidden="true"
    >
      {/* Layer 1: Theme-specific CSS effects (z-8) — fog, frost, lasers, shimmer, vignettes */}
      <ThemeCSSEffects theme={detectedTheme} />

      {/* Layer 2: Ambient Overlay (z-9) — mood gradients & color washes */}
      <AmbientOverlay config={themeConfig.ambient} />

      {/* Layer 3: Canvas Particles (z-10) — atmospheric particle effects */}
      <ParticleEngine
        config={themeConfig.particles}
        intensity={intensity}
        contained={isPreviewMode}
      />

      {/* Layer 4: CSS Decorations (z-11) — gradient orbs, rings, streaks at corners */}
      <CSSDecorations decorations={themeConfig.decorations ?? []} />

      {/* Layer 5: SVG Overlays (z-12) — unique animated SVG elements per theme */}
      <ThemeSVGOverlays theme={detectedTheme} />
    </div>
  );
}
