"use client";

import React from "react";
import type { ThemeType } from "./theme-detector";

// ---------------------------------------------------------------------------
// CSS Keyframes — injected once into <head>
// ---------------------------------------------------------------------------

const EFFECTS_CSS = `
@keyframes cssfx-breathe {
  0%, 100% { opacity: var(--fx-lo, 0.3); }
  50% { opacity: var(--fx-hi, 0.6); }
}

@keyframes cssfx-fog-drift {
  0%, 100% { transform: translateX(0) translateY(0) scaleX(1.3); opacity: var(--fx-hi); }
  30% { transform: translateX(3%) translateY(-5%) scaleX(1.5); opacity: var(--fx-lo); }
  60% { transform: translateX(-2%) translateY(-2%) scaleX(1.4); opacity: var(--fx-hi); }
}

@keyframes cssfx-shimmer-sweep {
  0% { transform: translateX(-150%) skewX(-15deg); }
  100% { transform: translateX(250%) skewX(-15deg); }
}

@keyframes cssfx-laser-scan {
  0% { transform: translateX(-100%) rotate(var(--laser-angle, -20deg)); opacity: 0; }
  10% { opacity: var(--fx-hi, 0.4); }
  90% { opacity: var(--fx-hi, 0.4); }
  100% { transform: translateX(200vw) rotate(var(--laser-angle, -20deg)); opacity: 0; }
}

@keyframes cssfx-strobe {
  0%, 92%, 100% { opacity: 0; }
  93% { opacity: 0.06; }
  94% { opacity: 0; }
  96% { opacity: 0.04; }
  97% { opacity: 0; }
}

@keyframes cssfx-glow-pulse {
  0%, 100% { box-shadow: inset 0 0 60px var(--glow-c1), inset 0 0 120px var(--glow-c2, transparent); }
  50% { box-shadow: inset 0 0 100px var(--glow-c1), inset 0 0 200px var(--glow-c2, transparent); }
}

@keyframes cssfx-aurora {
  0% { background-position: 0% 50%; opacity: var(--fx-lo); }
  50% { background-position: 100% 50%; opacity: var(--fx-hi); }
  100% { background-position: 0% 50%; opacity: var(--fx-lo); }
}

@keyframes cssfx-rainbow-shift {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

@keyframes cssfx-moonbeam {
  0%, 100% { opacity: var(--fx-lo); transform: scale(1); }
  50% { opacity: var(--fx-hi); transform: scale(1.08); }
}

@keyframes cssfx-sun-rotate {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes cssfx-heat-shimmer {
  0%, 100% { transform: translateY(0) scaleY(1); }
  25% { transform: translateY(-1px) scaleY(1.002); }
  75% { transform: translateY(1px) scaleY(0.998); }
}

@keyframes cssfx-flicker-glow {
  0%, 100% { opacity: var(--fx-hi); }
  15% { opacity: calc(var(--fx-hi) * 0.7); }
  30% { opacity: var(--fx-hi); }
  45% { opacity: calc(var(--fx-hi) * 0.5); }
  60% { opacity: calc(var(--fx-hi) * 0.85); }
  80% { opacity: calc(var(--fx-hi) * 0.6); }
}

@keyframes cssfx-spotlight-sway {
  0%, 100% { transform: translateX(-50%) scaleX(1) rotate(0deg); }
  25% { transform: translateX(-45%) scaleX(1.05) rotate(1deg); }
  75% { transform: translateX(-55%) scaleX(0.95) rotate(-1deg); }
}

@keyframes cssfx-neon-flicker {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    box-shadow: inset 0 0 40px var(--neon-c), inset 0 0 80px var(--neon-c);
    opacity: var(--fx-hi);
  }
  20%, 24%, 55% {
    box-shadow: none;
    opacity: 0;
  }
}
`;

if (typeof document !== "undefined") {
  const id = "theme-css-effects-kf";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = EFFECTS_CSS;
    document.head.appendChild(s);
  }
}

// ---------------------------------------------------------------------------
// Reusable Effect Primitives
// ---------------------------------------------------------------------------

/** Frosted edges — icy glow around viewport */
function FrostEdges({ color = "rgba(200,230,255,0.15)", opacity = 0.5, speed = 6 }: {
  color?: string; opacity?: number; speed?: number;
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        boxShadow: `inset 0 0 80px ${color}, inset 0 0 180px ${color}`,
        animation: `cssfx-breathe ${speed}s ease-in-out infinite`,
        ["--fx-lo" as string]: `${opacity * 0.5}`,
        ["--fx-hi" as string]: `${opacity}`,
      }}
      aria-hidden="true"
    />
  );
}

/** Rising fog/mist from bottom of screen */
function Fog({ color = "rgba(0,20,0,0.15)", opacity = 0.4, speed = 12 }: {
  color?: string; opacity?: number; speed?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          bottom: "-25%",
          left: "-10%",
          width: "120%",
          height: "65%",
          background: `radial-gradient(ellipse at 50% 100%, ${color} 0%, transparent 70%)`,
          animation: `cssfx-fog-drift ${speed}s ease-in-out infinite`,
          ["--fx-lo" as string]: `${opacity * 0.4}`,
          ["--fx-hi" as string]: `${opacity}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "0%",
          width: "110%",
          height: "55%",
          background: `radial-gradient(ellipse at 30% 100%, ${color} 0%, transparent 60%)`,
          animation: `cssfx-fog-drift ${speed * 1.4}s ease-in-out infinite`,
          animationDelay: `${speed * 0.3}s`,
          ["--fx-lo" as string]: `${opacity * 0.3}`,
          ["--fx-hi" as string]: `${opacity * 0.7}`,
        }}
      />
    </div>
  );
}

/** Coloured edge vignette with breathing animation */
function Vignette({ color = "rgba(255,20,147,0.08)", opacity = 0.5, speed = 5 }: {
  color?: string; opacity?: number; speed?: number;
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        boxShadow: `inset 0 0 100px ${color}, inset 0 0 250px ${color}`,
        animation: `cssfx-breathe ${speed}s ease-in-out infinite`,
        ["--fx-lo" as string]: `${opacity * 0.4}`,
        ["--fx-hi" as string]: `${opacity}`,
      }}
      aria-hidden="true"
    />
  );
}

/** Diagonal light shimmer sweep across screen */
function ShimmerSweep({ color = "rgba(255,215,0,0.06)", speed = 6, width = 200 }: {
  color?: string; speed?: number; width?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          top: "-50%",
          left: 0,
          width: `${width}px`,
          height: "200%",
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation: `cssfx-shimmer-sweep ${speed}s ease-in-out infinite`,
          animationDelay: "1s",
        }}
      />
    </div>
  );
}

/** Scanning laser beam line (DJ/Club) */
function LaserSweep({ color = "#FF00FF", opacity = 0.3, speed = 4, angle = -20, width = 2 }: {
  color?: string; opacity?: number; speed?: number; angle?: number; width?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: `${width}px`,
          background: `linear-gradient(90deg, transparent 0%, ${color} 30%, ${color} 50%, transparent 100%)`,
          opacity,
          animation: `cssfx-laser-scan ${speed}s linear infinite`,
          ["--laser-angle" as string]: `${angle}deg`,
          ["--fx-hi" as string]: `${opacity}`,
          boxShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
        }}
      />
    </div>
  );
}

/** Periodic strobe flash — very subtle */
function StrobeFlash({ color = "rgba(255,255,255,0.08)", speed = 3 }: {
  color?: string; speed?: number;
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        background: color,
        animation: `cssfx-strobe ${speed}s linear infinite`,
      }}
      aria-hidden="true"
    />
  );
}

/** Animated glowing inset border */
function GlowBorder({ color1 = "rgba(255,165,0,0.08)", color2 = "rgba(255,100,0,0.04)", speed = 4 }: {
  color1?: string; color2?: string; speed?: number;
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        animation: `cssfx-glow-pulse ${speed}s ease-in-out infinite`,
        ["--glow-c1" as string]: color1,
        ["--glow-c2" as string]: color2,
      }}
      aria-hidden="true"
    />
  );
}

/** Multi-color aurora / northern-lights wave at top */
function Aurora({ colors = ["rgba(186,255,201,0.06)", "rgba(186,225,255,0.06)", "rgba(255,186,255,0.04)"], speed = 10, opacity = 0.6 }: {
  colors?: string[]; speed?: number; opacity?: number;
}) {
  return (
    <div
      className="fixed inset-x-0 top-0 pointer-events-none"
      style={{
        zIndex: 8,
        height: "40%",
        background: `linear-gradient(90deg, ${colors.join(", ")})`,
        backgroundSize: "300% 100%",
        animation: `cssfx-aurora ${speed}s ease-in-out infinite`,
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, transparent 100%)",
        ["--fx-lo" as string]: `${opacity * 0.3}`,
        ["--fx-hi" as string]: `${opacity}`,
      }}
      aria-hidden="true"
    />
  );
}

/** Rainbow-shifting edge glow */
function RainbowEdge({ speed = 4, opacity = 0.3 }: { speed?: number; opacity?: number }) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        boxShadow: "inset 0 0 60px rgba(255,0,0,0.05), inset 0 0 120px rgba(0,255,0,0.03), inset 0 0 180px rgba(0,0,255,0.04)",
        background: `linear-gradient(90deg, 
          rgba(255,0,24,0.03), rgba(255,165,44,0.03), rgba(255,255,65,0.02),
          rgba(0,128,24,0.03), rgba(0,0,249,0.03), rgba(134,0,125,0.03),
          rgba(255,0,24,0.03))`,
        backgroundSize: "200% 100%",
        animation: `cssfx-rainbow-shift ${speed}s linear infinite`,
        opacity,
      }}
      aria-hidden="true"
    />
  );
}

/** Moonbeam — soft radial glow from corner */
function Moonbeam({ color = "rgba(192,192,192,0.1)", position = "top-right" as "top-right" | "top-left", speed = 8, opacity = 0.5 }: {
  color?: string; position?: "top-right" | "top-left"; speed?: number; opacity?: number;
}) {
  const isRight = position === "top-right";
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          top: "-10%",
          [isRight ? "right" : "left"]: "-10%",
          width: "50%",
          height: "50%",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          animation: `cssfx-moonbeam ${speed}s ease-in-out infinite`,
          ["--fx-lo" as string]: `${opacity * 0.4}`,
          ["--fx-hi" as string]: `${opacity}`,
        }}
      />
    </div>
  );
}

/** Sun rays — rotating gradient beams from corner */
function SunRays({ color = "rgba(255,215,0,0.04)", speed = 30, opacity = 0.5 }: {
  color?: string; speed?: number; opacity?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          top: "-50%",
          right: "-50%",
          width: "100%",
          height: "100%",
          background: `conic-gradient(from 0deg, transparent 0deg, ${color} 10deg, transparent 20deg, transparent 40deg, ${color} 50deg, transparent 60deg, transparent 80deg, ${color} 90deg, transparent 100deg, transparent 120deg, ${color} 130deg, transparent 140deg, transparent 160deg, ${color} 170deg, transparent 180deg, transparent 200deg, ${color} 210deg, transparent 220deg, transparent 240deg, ${color} 250deg, transparent 260deg, transparent 280deg, ${color} 290deg, transparent 300deg, transparent 320deg, ${color} 330deg, transparent 340deg, transparent 360deg)`,
          opacity,
          animation: `cssfx-sun-rotate ${speed}s linear infinite`,
        }}
      />
    </div>
  );
}

/** Soft bottom glow — warm stage / ambient light */
function BottomGlow({ color = "rgba(156,39,176,0.08)", opacity = 0.5, speed = 6 }: {
  color?: string; opacity?: number; speed?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "30%",
          background: `radial-gradient(ellipse at bottom center, ${color} 0%, transparent 70%)`,
          animation: `cssfx-breathe ${speed}s ease-in-out infinite`,
          ["--fx-lo" as string]: `${opacity * 0.4}`,
          ["--fx-hi" as string]: `${opacity}`,
        }}
      />
    </div>
  );
}

/** Spotlight cone from top */
function SpotlightCone({ color = "rgba(255,255,255,0.04)", speed = 8, opacity = 0.6 }: {
  color?: string; speed?: number; opacity?: number;
}) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 8 }} aria-hidden="true">
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          width: "40%",
          height: "100%",
          background: `linear-gradient(180deg, ${color} 0%, transparent 80%)`,
          clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)",
          animation: `cssfx-spotlight-sway ${speed}s ease-in-out infinite`,
          opacity,
        }}
      />
    </div>
  );
}

/** Neon edge glow with occasional flicker */
function NeonEdge({ color = "rgba(255,0,255,0.06)", speed = 8 }: {
  color?: string; speed?: number;
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        animation: `cssfx-neon-flicker ${speed}s ease-in-out infinite`,
        ["--neon-c" as string]: color,
        ["--fx-hi" as string]: "1",
      }}
      aria-hidden="true"
    />
  );
}

/** Flickering warm glow — like candlelight / diyas */
function FlickerGlow({ color = "rgba(255,165,0,0.1)", spread = 100, speed = 2.5 }: {
  color?: string; spread?: number; speed?: number;
}) {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 8,
        boxShadow: `inset 0 0 ${spread}px ${color}`,
        animation: `cssfx-flicker-glow ${speed}s ease-in-out infinite`,
        ["--fx-hi" as string]: "1",
      }}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Per-theme CSS effect compositions
// ---------------------------------------------------------------------------

interface ThemeCSSEffectsProps {
  theme: ThemeType;
}

export function ThemeCSSEffects({ theme }: ThemeCSSEffectsProps) {
  if (theme === "none") return null;

  switch (theme) {
    // ── Seasonal / Holiday ────────────────────────────────────────────────

    case "christmas":
      return (
        <>
          <FrostEdges color="rgba(200,230,255,0.12)" opacity={0.5} speed={6} />
          <ShimmerSweep color="rgba(255,255,255,0.04)" speed={8} width={150} />
        </>
      );

    case "new_year":
      return (
        <>
          <ShimmerSweep color="rgba(255,215,0,0.08)" speed={5} width={250} />
          <GlowBorder color1="rgba(255,215,0,0.06)" color2="rgba(75,0,130,0.04)" speed={4} />
        </>
      );

    case "halloween":
      return (
        <>
          <Fog color="rgba(0,30,0,0.12)" opacity={0.5} speed={14} />
          <Vignette color="rgba(0,20,0,0.12)" opacity={0.6} speed={4} />
        </>
      );

    case "valentines":
      return (
        <>
          <Vignette color="rgba(255,20,147,0.06)" opacity={0.5} speed={5} />
          <ShimmerSweep color="rgba(255,182,193,0.06)" speed={7} width={180} />
        </>
      );

    case "easter":
      return (
        <Aurora
          colors={["rgba(255,179,186,0.05)", "rgba(186,255,201,0.05)", "rgba(186,225,255,0.04)", "rgba(255,255,186,0.03)"]}
          speed={12}
          opacity={0.5}
        />
      );

    // ── Brunch / Glam ─────────────────────────────────────────────────────

    case "bottomless_brunch":
      return (
        <>
          <ShimmerSweep color="rgba(255,215,0,0.06)" speed={6} width={200} />
          <Vignette color="rgba(255,193,7,0.04)" opacity={0.35} speed={6} />
        </>
      );

    case "lipstick_powder_paint":
      return (
        <>
          <ShimmerSweep color="rgba(255,105,180,0.05)" speed={5} width={180} />
          <Vignette color="rgba(255,20,147,0.05)" opacity={0.4} speed={5} />
          <ShimmerSweep color="rgba(255,215,0,0.04)" speed={8} width={120} />
        </>
      );

    // ── Music / Entertainment ─────────────────────────────────────────────

    case "live_music":
      return (
        <>
          <BottomGlow color="rgba(156,39,176,0.08)" opacity={0.5} speed={5} />
          <SpotlightCone color="rgba(255,255,255,0.03)" speed={8} opacity={0.4} />
        </>
      );

    case "dj_club":
      return (
        <>
          <LaserSweep color="#FF00FF" opacity={0.15} speed={3} angle={-15} width={2} />
          <LaserSweep color="#00FFFF" opacity={0.1} speed={4.5} angle={-25} width={1} />
          <StrobeFlash color="rgba(255,255,255,0.06)" speed={4} />
          <NeonEdge color="rgba(157,0,255,0.04)" speed={10} />
        </>
      );

    case "comedy":
      return (
        <>
          <SpotlightCone color="rgba(255,215,0,0.04)" speed={7} opacity={0.5} />
          <BottomGlow color="rgba(255,215,0,0.04)" opacity={0.3} speed={6} />
        </>
      );

    case "drag_shows":
      return (
        <>
          <RainbowEdge speed={5} opacity={0.25} />
          <ShimmerSweep color="rgba(255,215,0,0.06)" speed={4} width={200} />
        </>
      );

    case "themed_parties":
      return (
        <>
          <ShimmerSweep color="rgba(255,107,107,0.05)" speed={5} width={200} />
          <Vignette color="rgba(77,150,255,0.04)" opacity={0.3} speed={5} />
        </>
      );

    // ── Food & Drink ──────────────────────────────────────────────────────

    case "food_drink":
      return (
        <GlowBorder color1="rgba(212,160,55,0.05)" color2="rgba(255,215,0,0.03)" speed={6} />
      );

    case "street_food":
      return (
        <>
          <BottomGlow color="rgba(255,140,0,0.08)" opacity={0.4} speed={4} />
          <FlickerGlow color="rgba(255,100,0,0.05)" spread={80} speed={3} />
        </>
      );

    // ── Cultural / Identity ───────────────────────────────────────────────

    case "pride":
      return (
        <RainbowEdge speed={4} opacity={0.3} />
      );

    case "afrobeats":
      return (
        <>
          <BottomGlow color="rgba(255,69,0,0.08)" opacity={0.5} speed={3} />
          <FlickerGlow color="rgba(255,69,0,0.04)" spread={60} speed={2.5} />
        </>
      );

    case "day_raves":
      return (
        <>
          <SunRays color="rgba(255,215,0,0.03)" speed={25} opacity={0.4} />
          <Vignette color="rgba(255,215,0,0.04)" opacity={0.3} speed={5} />
        </>
      );

    case "open_mic":
      return (
        <SpotlightCone color="rgba(255,255,255,0.03)" speed={10} opacity={0.4} />
      );

    // ── Professional ──────────────────────────────────────────────────────

    case "networking":
      return (
        <Vignette color="rgba(59,130,246,0.03)" opacity={0.25} speed={8} />
      );

    case "workshops":
      return (
        <>
          <Moonbeam color="rgba(255,215,0,0.06)" position="top-left" speed={8} opacity={0.3} />
          <Vignette color="rgba(76,175,80,0.03)" opacity={0.2} speed={7} />
        </>
      );

    // ── South-Asian / Religious ───────────────────────────────────────────

    case "diwali":
      return (
        <>
          <FlickerGlow color="rgba(255,165,0,0.08)" spread={100} speed={2.5} />
          <ShimmerSweep color="rgba(255,215,0,0.06)" speed={5} width={200} />
          <GlowBorder color1="rgba(255,140,0,0.06)" color2="rgba(255,215,0,0.04)" speed={3} />
        </>
      );

    case "eid":
      return (
        <>
          <Moonbeam color="rgba(192,192,192,0.08)" position="top-right" speed={8} opacity={0.4} />
          <Vignette color="rgba(25,25,112,0.05)" opacity={0.3} speed={7} />
        </>
      );

    default:
      return null;
  }
}
