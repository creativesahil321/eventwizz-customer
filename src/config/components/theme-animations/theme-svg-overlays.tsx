"use client";

import React from "react";
import type { ThemeType } from "./theme-detector";

// ---------------------------------------------------------------------------
// SVG Animation Keyframes — injected once
// ---------------------------------------------------------------------------

const SVG_CSS = `
@keyframes svg-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes svg-sway {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  75% { transform: rotate(-2deg); }
}

@keyframes svg-pulse-glow {
  0%, 100% { filter: drop-shadow(0 0 4px var(--svg-glow, rgba(255,255,255,0.3))); opacity: var(--svg-lo, 0.6); }
  50% { filter: drop-shadow(0 0 12px var(--svg-glow, rgba(255,255,255,0.6))); opacity: var(--svg-hi, 1); }
}

@keyframes svg-flicker {
  0%, 100% { opacity: var(--svg-hi, 0.9); }
  15% { opacity: calc(var(--svg-hi, 0.9) * 0.6); }
  30% { opacity: var(--svg-hi, 0.9); }
  50% { opacity: calc(var(--svg-hi, 0.9) * 0.4); }
  65% { opacity: calc(var(--svg-hi, 0.9) * 0.8); }
  80% { opacity: calc(var(--svg-hi, 0.9) * 0.5); }
}

@keyframes svg-wave {
  0% { transform: translateX(0) scaleY(1); }
  25% { transform: translateX(2px) scaleY(1.02); }
  50% { transform: translateX(0) scaleY(0.98); }
  75% { transform: translateX(-2px) scaleY(1.01); }
  100% { transform: translateX(0) scaleY(1); }
}

@keyframes svg-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

@keyframes svg-spin-slow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes svg-bounce-bar {
  0%, 100% { transform: scaleY(0.3); }
  50% { transform: scaleY(1); }
}

@keyframes svg-flame-dance {
  0%, 100% { transform: scaleX(1) scaleY(1) translateY(0); }
  20% { transform: scaleX(0.95) scaleY(1.05) translateY(-1px); }
  40% { transform: scaleX(1.05) scaleY(0.95) translateY(0); }
  60% { transform: scaleX(0.97) scaleY(1.03) translateY(-2px); }
  80% { transform: scaleX(1.03) scaleY(0.98) translateY(-1px); }
}

@keyframes svg-web-pulse {
  0%, 100% { opacity: 0.15; }
  50% { opacity: 0.3; }
}

@keyframes svg-rise-bubble {
  0% { transform: translateY(0) scale(1); opacity: 0.6; }
  100% { transform: translateY(-60px) scale(0.5); opacity: 0; }
}
`;

if (typeof document !== "undefined") {
  const id = "theme-svg-overlays-kf";
  if (!document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = SVG_CSS;
    document.head.appendChild(s);
  }
}

// ---------------------------------------------------------------------------
// SVG Overlay Components — one per visual element type
// ---------------------------------------------------------------------------

/** Christmas string lights garland along top edge */
function StringLights() {
  const bulbColors = ["#FF4444", "#44FF44", "#4444FF", "#FFFF44", "#FF44FF", "#44FFFF", "#FF8844", "#FF4444"];
  return (
    <div className="fixed left-0 w-full pointer-events-none" style={{ top: "80px", zIndex: 12 }} aria-hidden="true">
      <svg viewBox="0 0 1200 60" className="w-full" style={{ height: "50px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} preserveAspectRatio="none">
        {/* Wire */}
        <path
          d="M 0 8 Q 75 35 150 12 Q 225 -10 300 15 Q 375 40 450 10 Q 525 -15 600 18 Q 675 45 750 8 Q 825 -12 900 14 Q 975 38 1050 6 Q 1125 -10 1200 12"
          fill="none"
          stroke="rgba(60,60,60,0.6)"
          strokeWidth="2"
        />
        {/* Bulbs */}
        {bulbColors.map((color, i) => {
          const x = 75 + i * 140;
          const yOffset = [22, 0, 20, -4, 28, -6, 22, 0];
          const y = 14 + yOffset[i];
          return (
            <g key={i}>
              <line x1={x} y1={y - 6} x2={x} y2={y} stroke="rgba(60,60,60,0.6)" strokeWidth="1.5" />
              <ellipse cx={x} cy={y + 5} rx="5" ry="7" fill={color} opacity="0.9">
                <animate attributeName="opacity" values="0.9;0.5;0.9" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
              </ellipse>
              <ellipse cx={x} cy={y + 5} rx="8" ry="10" fill={color} opacity="0.15">
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur={`${1.5 + i * 0.3}s`} repeatCount="indefinite" />
              </ellipse>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Halloween spider web in top-left corner */
function SpiderWeb() {
  return (
    <div
      className="fixed left-0 pointer-events-none"
      style={{ top: "80px", zIndex: 12, width: "200px", height: "200px", animation: "svg-web-pulse 4s ease-in-out infinite" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" width="200" height="200" opacity="0.2">
        {/* Radial threads */}
        {[0, 30, 60, 90].map((angle) => (
          <line
            key={angle}
            x1="0" y1="0"
            x2={Math.cos((angle * Math.PI) / 180) * 200}
            y2={Math.sin((angle * Math.PI) / 180) * 200}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.8"
          />
        ))}
        {/* Spiral threads */}
        {[40, 80, 120, 160].map((r, i) => (
          <path
            key={i}
            d={`M ${r * Math.cos(0)} ${r * Math.sin(0)} 
                Q ${r * 0.7 * Math.cos(Math.PI / 12)} ${r * 0.7 * Math.sin(Math.PI / 12)} ${r * Math.cos(Math.PI / 6)} ${r * Math.sin(Math.PI / 6)}
                Q ${r * 0.7 * Math.cos(Math.PI / 4)} ${r * 0.7 * Math.sin(Math.PI / 4)} ${r * Math.cos(Math.PI / 3)} ${r * Math.sin(Math.PI / 3)}
                Q ${r * 0.7 * Math.cos((5 * Math.PI) / 12)} ${r * 0.7 * Math.sin((5 * Math.PI) / 12)} ${r * Math.cos(Math.PI / 2)} ${r * Math.sin(Math.PI / 2)}`}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="0.6"
          />
        ))}
        {/* Spider */}
        <circle cx="70" cy="70" r="3" fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
}

/** Diwali diya (oil lamp) with animated flame — bottom corners */
function DiyaLamps() {
  const Diya = ({ x, delay }: { x: string; delay: number }) => (
    <div
      className="fixed bottom-4 pointer-events-none"
      style={{ [x === "left" ? "left" : "right"]: "24px", zIndex: 12 }}
      aria-hidden="true"
    >
      <svg width="50" height="70" viewBox="0 0 50 70" style={{ filter: "drop-shadow(0 0 8px rgba(255,150,0,0.4))" }}>
        {/* Flame */}
        <g style={{ animation: `svg-flame-dance 1.5s ease-in-out infinite`, animationDelay: `${delay}s`, transformOrigin: "25px 25px" }}>
          <ellipse cx="25" cy="18" rx="6" ry="14" fill="#FF8C00" opacity="0.8" />
          <ellipse cx="25" cy="16" rx="3.5" ry="10" fill="#FFD700" opacity="0.9" />
          <ellipse cx="25" cy="14" rx="1.5" ry="6" fill="#FFFACD" opacity="1" />
        </g>
        {/* Glow */}
        <ellipse cx="25" cy="18" rx="16" ry="20" fill="rgba(255,150,0,0.1)">
          <animate attributeName="rx" values="16;20;16" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.1;0.15;0.1" dur="2s" repeatCount="indefinite" />
        </ellipse>
        {/* Lamp body */}
        <path d="M 15 35 Q 10 45 12 55 Q 25 60 38 55 Q 40 45 35 35 Z" fill="#C8960C" opacity="0.8" />
        <ellipse cx="25" cy="35" rx="10" ry="3" fill="#D4A037" opacity="0.9" />
        {/* Wick */}
        <line x1="25" y1="32" x2="25" y2="26" stroke="#333" strokeWidth="1" />
      </svg>
    </div>
  );

  return (
    <>
      <Diya x="left" delay={0} />
      <Diya x="right" delay={0.7} />
    </>
  );
}

/** Eid crescent moon + star — top right */
function CrescentMoonStar() {
  return (
    <div
      className="fixed right-8 pointer-events-none"
      style={{
        top: "104px", // 80px (header) + 24px
        zIndex: 12,
        animation: "svg-float 6s ease-in-out infinite",
        filter: "drop-shadow(0 0 10px rgba(192,192,192,0.3))",
      }}
      aria-hidden="true"
    >
      <svg width="60" height="60" viewBox="0 0 60 60">
        {/* Crescent */}
        <path
          d="M 30 5 A 22 22 0 1 0 30 55 A 17 17 0 1 1 30 5"
          fill="rgba(220,220,220,0.25)"
          stroke="rgba(192,192,192,0.4)"
          strokeWidth="0.5"
        />
        {/* Glow */}
        <path
          d="M 30 5 A 22 22 0 1 0 30 55 A 17 17 0 1 1 30 5"
          fill="rgba(192,192,192,0.1)"
          style={{ filter: "blur(4px)" }}
        />
        {/* Star */}
        <polygon
          points="48,18 50,24 56,24 51,28 53,34 48,30 43,34 45,28 40,24 46,24"
          fill="rgba(255,215,0,0.5)"
          stroke="rgba(255,215,0,0.3)"
          strokeWidth="0.3"
        >
          <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
        </polygon>
      </svg>
    </div>
  );
}

/** Valentine's heart garland across top */
function HeartGarland() {
  const heartPath = "M 0 -4 C -2 -8 -8 -8 -8 -3 C -8 1 0 6 0 6 C 0 6 8 1 8 -3 C 8 -8 2 -8 0 -4 Z";
  const colors = ["#FF1493", "#FF69B4", "#FFB6C1", "#FF6B9D", "#FF85A2"];
  return (
    <div className="fixed left-0 w-full pointer-events-none" style={{ top: "80px", zIndex: 12 }} aria-hidden="true">
      <svg viewBox="0 0 1200 50" className="w-full" style={{ height: "40px" }} preserveAspectRatio="none">
        {/* Wire */}
        <path
          d="M 0 10 Q 100 30 200 12 Q 300 -5 400 15 Q 500 32 600 8 Q 700 -8 800 18 Q 900 35 1000 10 Q 1100 -5 1200 15"
          fill="none"
          stroke="rgba(255,20,147,0.15)"
          strokeWidth="1"
        />
        {/* Hearts */}
        {[120, 280, 440, 600, 760, 920, 1080].map((x, i) => {
          const yVals = [18, 6, 20, 10, 24, 4, 16];
          return (
            <g key={i} transform={`translate(${x}, ${yVals[i]}) scale(0.8)`}>
              <path
                d={heartPath}
                fill={colors[i % colors.length]}
                opacity="0.6"
              >
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
              </path>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** New Year / Brunch champagne glass with rising bubbles */
function ChampagneGlass({ position = "right" }: { position?: "left" | "right" }) {
  const side = position === "left" ? "left" : "right";
  return (
    <div
      className="fixed bottom-4 pointer-events-none"
      style={{ [side]: "20px", zIndex: 12, animation: "svg-float 5s ease-in-out infinite" }}
      aria-hidden="true"
    >
      <svg width="40" height="80" viewBox="0 0 40 80" style={{ filter: "drop-shadow(0 0 6px rgba(255,215,0,0.2))" }}>
        {/* Glass */}
        <path d="M 10 10 L 12 40 L 15 42 L 15 65 L 10 68 L 30 68 L 25 65 L 25 42 L 28 40 L 30 10 Z" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1" />
        <path d="M 12 15 L 14 38 L 26 38 L 28 15 Z" fill="rgba(255,215,0,0.06)" />
        {/* Bubbles */}
        {[
          { cx: 17, cy: 30, r: 1.5, dur: "2s", delay: "0s" },
          { cx: 22, cy: 25, r: 1, dur: "2.5s", delay: "0.5s" },
          { cx: 20, cy: 33, r: 1.2, dur: "1.8s", delay: "1s" },
          { cx: 24, cy: 28, r: 0.8, dur: "2.2s", delay: "0.3s" },
          { cx: 18, cy: 22, r: 1, dur: "2s", delay: "0.8s" },
        ].map((b, i) => (
          <circle key={i} cx={b.cx} cy={b.cy} r={b.r} fill="rgba(255,215,0,0.4)">
            <animate attributeName="cy" values={`${b.cy};${b.cy - 20}`} dur={b.dur} repeatCount="indefinite" begin={b.delay} />
            <animate attributeName="opacity" values="0.4;0" dur={b.dur} repeatCount="indefinite" begin={b.delay} />
          </circle>
        ))}
      </svg>
    </div>
  );
}

/** DJ/Club music equalizer bars */
function EqualizerBars() {
  const barCount = 12;
  const barWidth = 4;
  const gap = 3;
  const colors = ["#FF00FF", "#E040FB", "#00FFFF", "#18FFFF", "#9D00FF", "#B388FF", "#FF0066", "#FF00FF", "#00FF99", "#00FFFF", "#FFE500", "#FF0066"];
  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ zIndex: 12, opacity: 0.25 }}
      aria-hidden="true"
    >
      <svg width={(barWidth + gap) * barCount} height="40" viewBox={`0 0 ${(barWidth + gap) * barCount} 40`}>
        {Array.from({ length: barCount }).map((_, i) => (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y="0"
            width={barWidth}
            height="40"
            fill={colors[i % colors.length]}
            rx="1"
            style={{
              transformOrigin: `${i * (barWidth + gap) + barWidth / 2}px 40px`,
              animation: `svg-bounce-bar ${0.4 + Math.random() * 0.8}s ease-in-out infinite`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

/** Pride rainbow arc — top corner */
function RainbowArc() {
  const rainbowColors = ["#FF0018", "#FFA52C", "#FFFF41", "#008018", "#0000F9", "#86007D"];
  return (
    <div
      className="fixed right-0 pointer-events-none"
      style={{ top: "80px", zIndex: 12, opacity: 0.2 }}
      aria-hidden="true"
    >
      <svg width="200" height="200" viewBox="0 0 200 200">
        {rainbowColors.map((color, i) => (
          <circle
            key={i}
            cx="200"
            cy="0"
            r={60 + i * 12}
            fill="none"
            stroke={color}
            strokeWidth="8"
            opacity="0.5"
          >
            <animate attributeName="opacity" values="0.5;0.3;0.5" dur={`${3 + i * 0.5}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}

/** Comedy/Open Mic spotlight beam SVG */
function SpotlightBeam() {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ top: "80px", zIndex: 12, opacity: 0.12 }}
      aria-hidden="true"
    >
      <svg width="400" height="500" viewBox="0 0 400 500" style={{ animation: "svg-sway 8s ease-in-out infinite" }}>
        <defs>
          <linearGradient id="spot-grad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="rgba(255,215,0,0.3)" />
            <stop offset="100%" stopColor="rgba(255,215,0,0)" />
          </linearGradient>
        </defs>
        <polygon points="180,0 220,0 320,500 80,500" fill="url(#spot-grad)" />
      </svg>
    </div>
  );
}

/** Networking connection nodes with pulsing lines */
function ConnectionNodes() {
  const nodes = [
    { x: 50, y: 30 }, { x: 150, y: 60 }, { x: 90, y: 100 },
    { x: 180, y: 25 }, { x: 130, y: 130 }, { x: 40, y: 80 },
  ];
  const connections = [
    [0, 1], [1, 2], [0, 5], [1, 3], [2, 4], [3, 4], [5, 2],
  ];
  return (
    <div
      className="fixed right-6 pointer-events-none"
      style={{ top: "104px", zIndex: 12, opacity: 0.15 }}
      aria-hidden="true"
    >
      <svg width="200" height="150" viewBox="0 0 200 150">
        {/* Lines */}
        {connections.map(([a, b], i) => (
          <line
            key={`l-${i}`}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke="#3B82F6"
            strokeWidth="0.8"
            opacity="0.5"
          >
            <animate attributeName="opacity" values="0.5;0.2;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </line>
        ))}
        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={`n-${i}`}>
            <circle cx={n.x} cy={n.y} r="3" fill="#3B82F6" opacity="0.6">
              <animate attributeName="r" values="3;4;3" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0.3;0.6" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r="6" fill="#3B82F6" opacity="0.1">
              <animate attributeName="r" values="6;10;6" dur={`${2 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Workshop lightbulb with glow */
function LightbulbGlow() {
  return (
    <div
      className="fixed left-8 pointer-events-none"
      style={{ top: "112px", zIndex: 12, animation: "svg-pulse-glow 4s ease-in-out infinite", ["--svg-glow" as string]: "rgba(255,215,0,0.3)", ["--svg-lo" as string]: "0.2", ["--svg-hi" as string]: "0.35" }}
      aria-hidden="true"
    >
      <svg width="40" height="55" viewBox="0 0 40 55">
        {/* Glow */}
        <circle cx="20" cy="20" r="18" fill="rgba(255,215,0,0.08)">
          <animate attributeName="r" values="18;22;18" dur="3s" repeatCount="indefinite" />
        </circle>
        {/* Bulb */}
        <path d="M 14 25 Q 10 15 14 8 Q 20 0 26 8 Q 30 15 26 25 L 24 30 L 16 30 Z" fill="rgba(255,215,0,0.25)" stroke="rgba(255,215,0,0.4)" strokeWidth="0.8" />
        {/* Base */}
        <rect x="16" y="30" width="8" height="4" rx="1" fill="rgba(200,200,200,0.3)" />
        <rect x="17" y="34" width="6" height="2" rx="1" fill="rgba(200,200,200,0.2)" />
        {/* Rays */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          return (
            <line
              key={angle}
              x1={20 + Math.cos(rad) * 16}
              y1={20 + Math.sin(rad) * 16}
              x2={20 + Math.cos(rad) * 22}
              y2={20 + Math.sin(rad) * 22}
              stroke="rgba(255,215,0,0.2)"
              strokeWidth="0.8"
              strokeLinecap="round"
            >
              <animate attributeName="opacity" values="0.2;0.5;0.2" dur={`${1.5 + angle * 0.005}s`} repeatCount="indefinite" />
            </line>
          );
        })}
      </svg>
    </div>
  );
}

/** Easter decorative eggs cluster */
function EasterEggs() {
  const eggs = [
    { x: 30, y: 20, color: "#FFB3BA", stripe: "#FF8FA3" },
    { x: 55, y: 30, color: "#BAFFC9", stripe: "#7EE8A2" },
    { x: 45, y: 50, color: "#BAE1FF", stripe: "#7EC8FF" },
    { x: 20, y: 45, color: "#FFFFBA", stripe: "#E8E87A" },
  ];
  return (
    <div
      className="fixed bottom-6 right-6 pointer-events-none"
      style={{ zIndex: 12, opacity: 0.25, animation: "svg-float 6s ease-in-out infinite" }}
      aria-hidden="true"
    >
      <svg width="80" height="70" viewBox="0 0 80 70">
        {eggs.map((egg, i) => (
          <g key={i}>
            <ellipse cx={egg.x} cy={egg.y} rx="10" ry="13" fill={egg.color} opacity="0.7" />
            <line x1={egg.x - 6} y1={egg.y - 3} x2={egg.x + 6} y2={egg.y - 3} stroke={egg.stripe} strokeWidth="2" opacity="0.5" />
            <line x1={egg.x - 7} y1={egg.y + 2} x2={egg.x + 7} y2={egg.y + 2} stroke={egg.stripe} strokeWidth="1.5" opacity="0.5" />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Sparkle cluster for glam themes (Drag, Lipstick, Brunch) */
function SparkleCluster({ position = "top-right", color = "#FFD700" }: { position?: "top-right" | "top-left" | "bottom-right"; color?: string }) {
  const posStyles: Record<string, React.CSSProperties> = {
    "top-right": { top: "90px", right: "10px" },
    "top-left": { top: "90px", left: "10px" },
    "bottom-right": { bottom: "10px", right: "10px" },
  };
  return (
    <div
      className="fixed pointer-events-none"
      style={{ ...posStyles[position], zIndex: 12, opacity: 0.3 }}
      aria-hidden="true"
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        {[
          { x: 20, y: 20, s: 8, d: 1.5 },
          { x: 55, y: 15, s: 6, d: 2 },
          { x: 40, y: 45, s: 10, d: 1.8 },
          { x: 15, y: 55, s: 5, d: 2.5 },
          { x: 65, y: 50, s: 7, d: 1.3 },
          { x: 35, y: 25, s: 4, d: 3 },
          { x: 60, y: 35, s: 6, d: 2.2 },
        ].map((star, i) => (
          <g key={i} style={{ animation: `svg-twinkle ${star.d}s ease-in-out infinite`, animationDelay: `${i * 0.3}s`, transformOrigin: `${star.x}px ${star.y}px` }}>
            {/* 4-pointed star */}
            <path
              d={`M ${star.x} ${star.y - star.s} L ${star.x + star.s * 0.3} ${star.y} L ${star.x} ${star.y + star.s} L ${star.x - star.s * 0.3} ${star.y} Z`}
              fill={color}
              opacity="0.8"
            />
            <path
              d={`M ${star.x - star.s} ${star.y} L ${star.x} ${star.y - star.s * 0.3} L ${star.x + star.s} ${star.y} L ${star.x} ${star.y + star.s * 0.3} Z`}
              fill={color}
              opacity="0.8"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Music guitar/speaker for live music */
function MusicSpeaker() {
  return (
    <div
      className="fixed bottom-6 left-6 pointer-events-none"
      style={{ zIndex: 12, opacity: 0.15 }}
      aria-hidden="true"
    >
      <svg width="50" height="60" viewBox="0 0 50 60" style={{ animation: "svg-wave 2s ease-in-out infinite" }}>
        {/* Speaker box */}
        <rect x="8" y="8" width="34" height="44" rx="3" fill="none" stroke="rgba(156,39,176,0.5)" strokeWidth="1.5" />
        {/* Speaker cone */}
        <circle cx="25" cy="35" r="12" fill="none" stroke="rgba(156,39,176,0.4)" strokeWidth="1" />
        <circle cx="25" cy="35" r="8" fill="none" stroke="rgba(156,39,176,0.3)" strokeWidth="1" />
        <circle cx="25" cy="35" r="3" fill="rgba(156,39,176,0.3)" />
        {/* Tweeter */}
        <circle cx="25" cy="18" r="5" fill="none" stroke="rgba(156,39,176,0.4)" strokeWidth="1" />
        <circle cx="25" cy="18" r="2" fill="rgba(156,39,176,0.3)" />
        {/* Sound waves */}
        {[18, 24, 30].map((r, i) => (
          <path
            key={i}
            d={`M ${50 + r * 0.5} ${30 - r * 0.3} Q ${50 + r} 30 ${50 + r * 0.5} ${30 + r * 0.3}`}
            fill="none"
            stroke="rgba(206,147,216,0.3)"
            strokeWidth="0.8"
          >
            <animate attributeName="opacity" values="0.3;0;0.3" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
          </path>
        ))}
      </svg>
    </div>
  );
}

/** Afrobeats drum with pulse rings */
function DrumPulse() {
  return (
    <div
      className="fixed bottom-6 right-6 pointer-events-none"
      style={{ zIndex: 12, opacity: 0.2 }}
      aria-hidden="true"
    >
      <svg width="60" height="50" viewBox="0 0 60 50">
        {/* Drum body */}
        <ellipse cx="30" cy="40" rx="22" ry="6" fill="rgba(255,69,0,0.3)" />
        <rect x="8" y="20" width="44" height="20" fill="rgba(255,69,0,0.2)" />
        <ellipse cx="30" cy="20" rx="22" ry="6" fill="rgba(255,140,0,0.3)" stroke="rgba(255,69,0,0.4)" strokeWidth="1" />
        {/* Pulse rings */}
        {[0, 1, 2].map((i) => (
          <ellipse
            key={i}
            cx="30" cy="20" rx={26 + i * 6} ry={8 + i * 2}
            fill="none" stroke="rgba(255,69,0,0.2)" strokeWidth="0.8"
          >
            <animate attributeName="rx" values={`${26 + i * 6};${32 + i * 6};${26 + i * 6}`} dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;0;0.2" dur={`${1 + i * 0.3}s`} repeatCount="indefinite" />
          </ellipse>
        ))}
      </svg>
    </div>
  );
}

/** Themed party streamers from top */
function PartyStreamers() {
  const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6BFF"];
  return (
    <div className="fixed left-0 w-full pointer-events-none" style={{ top: "80px", zIndex: 12, opacity: 0.2 }} aria-hidden="true">
      <svg viewBox="0 0 1200 80" className="w-full" style={{ height: "60px" }} preserveAspectRatio="none">
        {colors.map((color, i) => {
          const x = 100 + i * 250;
          return (
            <path
              key={i}
              d={`M ${x} 0 Q ${x + 20} 20 ${x - 10} 40 Q ${x + 15} 55 ${x - 5} 75`}
              fill="none"
              stroke={color}
              strokeWidth="2"
              opacity="0.6"
              style={{ animation: `svg-sway ${3 + i * 0.5}s ease-in-out infinite` }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-theme SVG overlay compositions
// ---------------------------------------------------------------------------

interface ThemeSVGOverlaysProps {
  theme: ThemeType;
}

export function ThemeSVGOverlays({ theme }: ThemeSVGOverlaysProps) {
  if (theme === "none") return null;

  switch (theme) {
    case "christmas":
      return <StringLights />;

    case "new_year":
      return (
        <>
          <ChampagneGlass position="right" />
          <SparkleCluster position="top-left" color="#FFD700" />
        </>
      );

    case "halloween":
      return <SpiderWeb />;

    case "valentines":
      return <HeartGarland />;

    case "easter":
      return <EasterEggs />;

    case "bottomless_brunch":
      return (
        <>
          <ChampagneGlass position="right" />
          <SparkleCluster position="top-right" color="#FFD700" />
        </>
      );

    case "lipstick_powder_paint":
      return (
        <>
          <SparkleCluster position="top-right" color="#FF69B4" />
          <SparkleCluster position="bottom-right" color="#FFD700" />
        </>
      );

    case "live_music":
      return (
        <>
          <MusicSpeaker />
          <SpotlightBeam />
        </>
      );

    case "dj_club":
      return <EqualizerBars />;

    case "comedy":
      return <SpotlightBeam />;

    case "drag_shows":
      return (
        <>
          <SparkleCluster position="top-right" color="#FFD700" />
          <SparkleCluster position="top-left" color="#FF69B4" />
        </>
      );

    case "themed_parties":
      return <PartyStreamers />;

    case "food_drink":
      return <SparkleCluster position="top-right" color="#D4A037" />;

    case "street_food":
      return null; // CSS effects are sufficient

    case "pride":
      return <RainbowArc />;

    case "afrobeats":
      return <DrumPulse />;

    case "day_raves":
      return <SparkleCluster position="top-right" color="#FFD700" />;

    case "open_mic":
      return <SpotlightBeam />;

    case "networking":
      return <ConnectionNodes />;

    case "workshops":
      return <LightbulbGlow />;

    case "diwali":
      return <DiyaLamps />;

    case "eid":
      return <CrescentMoonStar />;

    default:
      return null;
  }
}
