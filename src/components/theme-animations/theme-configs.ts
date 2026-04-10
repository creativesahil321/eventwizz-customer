/**
 * Theme Animation Configurations
 * Central config for all 22 event themes.
 * Each theme defines its particle system, ambient overlay, and premium CSS decorations.
 */

import { ThemeType } from "./theme-detector";

// ---------------------------------------------------------------------------
// Particle shape types the canvas engine can render
// ---------------------------------------------------------------------------
export type ParticleShape =
  | "circle"
  | "heart"
  | "star"
  | "snowflake"
  | "music-note"
  | "confetti"
  | "bubble"
  | "ember"
  | "diamond"
  | "petal"
  | "raindrop"
  | "bat"
  | "firework"
  | "ghost"
  | "flame"
  | "lightning"
  | "crescent"
  | "cross-star";

export type ParticleDirection = "up" | "down" | "mixed";

export interface ParticleConfig {
  shapes: ParticleShape[];
  colors: string[];
  count: number;
  sizeRange: [number, number];
  speedRange: [number, number];
  gravity: number;
  drift: number;
  rotationSpeed: number;
  opacityRange: [number, number];
  direction: ParticleDirection;
  glow: boolean;
  glowRadius?: number;
}

// ---------------------------------------------------------------------------
// Ambient overlay config
// ---------------------------------------------------------------------------
export type AmbientAnimationType =
  | "pulse"
  | "breathe"
  | "sweep"
  | "rainbow-cycle"
  | "flicker"
  | "spotlight"
  | "none";

export interface AmbientConfig {
  colors: string[];
  gradientType: "radial" | "linear" | "conic";
  gradientAngle?: number;
  animation: AmbientAnimationType;
  duration: number;
  opacity: number;
}

// ---------------------------------------------------------------------------
// Premium CSS decoration config (replaces cheap emoji accents)
// ---------------------------------------------------------------------------
export interface CSSDecoration {
  /** Position on screen */
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  /** Gradient colors for the decoration */
  gradientColors: string[];
  /** Shape: orb = circle, ring = hollow circle, diamond, streak = horizontal line */
  shape: "orb" | "ring" | "diamond" | "streak" | "crescent";
  /** Size in px */
  size: number;
  /** Blur amount for glow effect */
  blur: number;
  /** Animation type */
  animation: "float" | "pulse-glow" | "drift" | "spin-slow" | "flicker";
  /** Opacity */
  opacity: number;
  /** Animation delay */
  delay: number;
}

export interface ThemeConfig {
  particles: ParticleConfig;
  ambient: AmbientConfig;
  decorations: CSSDecoration[];
}

// ---------------------------------------------------------------------------
// Theme configurations — one per category
// ---------------------------------------------------------------------------

export const THEME_CONFIGS: Record<Exclude<ThemeType, "none">, ThemeConfig> = {
  // ── Seasonal / Holiday ──────────────────────────────────────────────────

  christmas: {
    particles: {
      shapes: ["snowflake", "cross-star", "circle", "star"],
      colors: ["#ffffff", "#e0f0ff", "#c8e6ff", "#b0d4f1", "#d6eaff"],
      count: 60,
      sizeRange: [3, 8],
      speedRange: [0.4, 1.5],
      gravity: 0.4,
      drift: 1.0,
      rotationSpeed: 0.8,
      opacityRange: [0.4, 0.9],
      direction: "down",
      glow: true,
      glowRadius: 8,
    },
    ambient: {
      colors: ["rgba(100,150,255,0.06)", "rgba(200,230,255,0.08)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 8,
      opacity: 0.7,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#4FC3F7", "#B3E5FC", "#E1F5FE"], shape: "orb", size: 120, blur: 60, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-right", gradientColors: ["#E1F5FE", "#B3E5FC", "#81D4FA"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.25, delay: 1 },
      { position: "top-right", gradientColors: ["#ffffff", "#E3F2FD"], shape: "ring", size: 60, blur: 20, animation: "drift", opacity: 0.2, delay: 2 },
    ],
  },

  new_year: {
    particles: {
      shapes: ["star", "firework", "confetti", "diamond"],
      colors: ["#FFD700", "#FFC107", "#FFEB3B", "#FF9800", "#ffffff", "#E8B200"],
      count: 50,
      sizeRange: [3, 7],
      speedRange: [0.6, 2.5],
      gravity: -0.3,
      drift: 0.8,
      rotationSpeed: 2.5,
      opacityRange: [0.4, 0.95],
      direction: "up",
      glow: true,
      glowRadius: 12,
    },
    ambient: {
      colors: ["rgba(75,0,130,0.06)", "rgba(255,215,0,0.05)", "transparent"],
      gradientType: "radial",
      animation: "pulse",
      duration: 3,
      opacity: 0.7,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FFD700", "#FFA000", "#FF8F00"], shape: "orb", size: 140, blur: 70, animation: "pulse-glow", opacity: 0.35, delay: 0 },
      { position: "bottom-left", gradientColors: ["#7B1FA2", "#9C27B0", "#CE93D8"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.25, delay: 0.8 },
      { position: "top-left", gradientColors: ["#FFD700", "#FFECB3"], shape: "streak", size: 80, blur: 30, animation: "drift", opacity: 0.2, delay: 1.5 },
    ],
  },

  halloween: {
    particles: {
      shapes: ["ghost", "bat", "ember", "circle"],
      colors: ["#00ff41", "#ff6600", "#8B00FF", "#39FF14", "#ff3300"],
      count: 35,
      sizeRange: [3, 7],
      speedRange: [0.3, 1.2],
      gravity: -0.15,
      drift: 1.5,
      rotationSpeed: 1.2,
      opacityRange: [0.3, 0.7],
      direction: "mixed",
      glow: true,
      glowRadius: 14,
    },
    ambient: {
      colors: ["rgba(0,20,0,0.10)", "rgba(50,0,80,0.08)", "rgba(0,255,65,0.03)"],
      gradientType: "radial",
      animation: "flicker",
      duration: 2.5,
      opacity: 0.85,
    },
    decorations: [
      { position: "bottom-left", gradientColors: ["#FF6F00", "#FF8F00", "#FFB300"], shape: "orb", size: 100, blur: 50, animation: "flicker", opacity: 0.3, delay: 0 },
      { position: "top-right", gradientColors: ["#00E676", "#69F0AE", "#B9F6CA"], shape: "orb", size: 80, blur: 60, animation: "pulse-glow", opacity: 0.2, delay: 0.5 },
      { position: "bottom-right", gradientColors: ["#7B1FA2", "#9C27B0"], shape: "orb", size: 60, blur: 40, animation: "float", opacity: 0.15, delay: 1.2 },
    ],
  },

  valentines: {
    particles: {
      shapes: ["heart", "petal", "circle"],
      colors: ["#FF1493", "#FF69B4", "#FFB6C1", "#FF6B9D", "#FF85A2", "#FFC0CB"],
      count: 45,
      sizeRange: [4, 9],
      speedRange: [0.3, 1.2],
      gravity: -0.2,
      drift: 0.6,
      rotationSpeed: 0.8,
      opacityRange: [0.4, 0.8],
      direction: "up",
      glow: true,
      glowRadius: 8,
    },
    ambient: {
      colors: ["rgba(255,20,147,0.06)", "rgba(255,182,193,0.07)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 5,
      opacity: 0.65,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FF1493", "#FF69B4", "#FFB6C1"], shape: "orb", size: 130, blur: 65, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#FF6B9D", "#FF85A2", "#FFC0CB"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.25, delay: 0.7 },
      { position: "bottom-right", gradientColors: ["#FFB6C1", "#FFC0CB"], shape: "ring", size: 50, blur: 15, animation: "drift", opacity: 0.15, delay: 1.3 },
    ],
  },

  easter: {
    particles: {
      shapes: ["petal", "circle", "confetti"],
      colors: ["#FFB3BA", "#BAFFC9", "#BAE1FF", "#FFFFBA", "#E8BAFF", "#FFDAB3"],
      count: 35,
      sizeRange: [3, 7],
      speedRange: [0.3, 1.0],
      gravity: 0.2,
      drift: 0.8,
      rotationSpeed: 1.5,
      opacityRange: [0.35, 0.7],
      direction: "down",
      glow: false,
    },
    ambient: {
      colors: ["rgba(186,255,201,0.06)", "rgba(186,225,255,0.06)", "rgba(255,255,186,0.04)"],
      gradientType: "linear",
      gradientAngle: 135,
      animation: "sweep",
      duration: 10,
      opacity: 0.55,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#BAFFC9", "#B9F6CA", "#E8F5E9"], shape: "orb", size: 110, blur: 55, animation: "pulse-glow", opacity: 0.25, delay: 0 },
      { position: "bottom-left", gradientColors: ["#BAE1FF", "#BBDEFB", "#E3F2FD"], shape: "orb", size: 90, blur: 45, animation: "float", opacity: 0.2, delay: 0.6 },
    ],
  },

  // ── Brunch / Glam ───────────────────────────────────────────────────────

  bottomless_brunch: {
    particles: {
      shapes: ["bubble", "circle", "diamond"],
      colors: ["#FFD700", "#FFC107", "#FFECB3", "#ffffff", "#F5E6CC"],
      count: 40,
      sizeRange: [3, 8],
      speedRange: [0.3, 1.2],
      gravity: -0.3,
      drift: 0.4,
      rotationSpeed: 0.3,
      opacityRange: [0.3, 0.6],
      direction: "up",
      glow: true,
      glowRadius: 6,
    },
    ambient: {
      colors: ["rgba(255,215,0,0.05)", "rgba(255,193,7,0.06)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 6,
      opacity: 0.55,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FFD700", "#FFC107", "#FFECB3"], shape: "orb", size: 120, blur: 60, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#FF8F00", "#FFA000", "#FFB300"], shape: "orb", size: 80, blur: 40, animation: "float", opacity: 0.2, delay: 0.8 },
    ],
  },

  lipstick_powder_paint: {
    particles: {
      shapes: ["diamond", "star", "circle"],
      colors: ["#FF69B4", "#FFB6C1", "#DDA0DD", "#FFD700", "#FF1493", "#E8B4D0"],
      count: 45,
      sizeRange: [2, 6],
      speedRange: [0.3, 1.0],
      gravity: 0.15,
      drift: 0.5,
      rotationSpeed: 2.0,
      opacityRange: [0.35, 0.8],
      direction: "down",
      glow: true,
      glowRadius: 6,
    },
    ambient: {
      colors: ["rgba(255,105,180,0.05)", "rgba(255,182,193,0.06)", "rgba(255,215,0,0.03)"],
      gradientType: "radial",
      animation: "breathe",
      duration: 5,
      opacity: 0.55,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FF69B4", "#EC407A", "#F48FB1"], shape: "orb", size: 130, blur: 65, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#FFD700", "#FFC107", "#FFE082"], shape: "orb", size: 90, blur: 45, animation: "float", opacity: 0.2, delay: 0.7 },
      { position: "bottom-right", gradientColors: ["#CE93D8", "#BA68C8"], shape: "ring", size: 50, blur: 15, animation: "drift", opacity: 0.15, delay: 1.3 },
    ],
  },

  // ── Music / Entertainment ───────────────────────────────────────────────

  live_music: {
    particles: {
      shapes: ["music-note", "circle", "star"],
      colors: ["#9C27B0", "#CE93D8", "#7B1FA2", "#E1BEE7", "#BA68C8", "#ffffff"],
      count: 30,
      sizeRange: [4, 8],
      speedRange: [0.5, 1.5],
      gravity: -0.25,
      drift: 0.6,
      rotationSpeed: 0.5,
      opacityRange: [0.3, 0.7],
      direction: "up",
      glow: true,
      glowRadius: 8,
    },
    ambient: {
      colors: ["rgba(156,39,176,0.06)", "rgba(63,81,181,0.05)", "transparent"],
      gradientType: "radial",
      animation: "pulse",
      duration: 4,
      opacity: 0.6,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#9C27B0", "#7B1FA2", "#4A148C"], shape: "orb", size: 120, blur: 60, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-right", gradientColors: ["#CE93D8", "#E1BEE7", "#F3E5F5"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.2, delay: 0.8 },
    ],
  },

  dj_club: {
    particles: {
      shapes: ["circle", "diamond", "lightning", "star"],
      colors: ["#FF00FF", "#00FFFF", "#FF0066", "#00FF99", "#9D00FF", "#FFE500"],
      count: 55,
      sizeRange: [2, 5],
      speedRange: [0.8, 2.5],
      gravity: 0,
      drift: 1.2,
      rotationSpeed: 4,
      opacityRange: [0.3, 0.85],
      direction: "mixed",
      glow: true,
      glowRadius: 12,
    },
    ambient: {
      colors: ["rgba(255,0,255,0.04)", "rgba(0,255,255,0.04)", "rgba(157,0,255,0.03)"],
      gradientType: "conic",
      animation: "sweep",
      duration: 3,
      opacity: 0.7,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#FF00FF", "#E040FB", "#EA80FC"], shape: "orb", size: 130, blur: 70, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-right", gradientColors: ["#00FFFF", "#18FFFF", "#84FFFF"], shape: "orb", size: 110, blur: 60, animation: "float", opacity: 0.25, delay: 0.5 },
      { position: "top-right", gradientColors: ["#9D00FF", "#B388FF"], shape: "streak", size: 70, blur: 30, animation: "drift", opacity: 0.2, delay: 1.0 },
    ],
  },

  comedy: {
    particles: {
      shapes: ["star", "circle"],
      colors: ["#FFD700", "#FFC107", "#ffffff", "#FFF8DC", "#FFFACD"],
      count: 20,
      sizeRange: [2, 5],
      speedRange: [0.2, 0.8],
      gravity: -0.08,
      drift: 0.3,
      rotationSpeed: 0.5,
      opacityRange: [0.25, 0.6],
      direction: "up",
      glow: true,
      glowRadius: 12,
    },
    ambient: {
      colors: ["rgba(255,215,0,0.06)", "rgba(255,255,255,0.03)", "transparent"],
      gradientType: "radial",
      animation: "spotlight",
      duration: 5,
      opacity: 0.6,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#FFD700", "#FFC107", "#FFECB3"], shape: "orb", size: 150, blur: 80, animation: "pulse-glow", opacity: 0.25, delay: 0 },
      { position: "bottom-right", gradientColors: ["#FFF8E1", "#FFECB3"], shape: "orb", size: 80, blur: 40, animation: "float", opacity: 0.15, delay: 1 },
    ],
  },

  drag_shows: {
    particles: {
      shapes: ["diamond", "star", "confetti"],
      colors: ["#FF0018", "#FFA52C", "#FFFF41", "#008018", "#0000F9", "#86007D", "#FFD700"],
      count: 55,
      sizeRange: [3, 7],
      speedRange: [0.4, 1.5],
      gravity: 0.2,
      drift: 0.8,
      rotationSpeed: 3,
      opacityRange: [0.35, 0.8],
      direction: "down",
      glow: true,
      glowRadius: 6,
    },
    ambient: {
      colors: [
        "rgba(255,0,24,0.03)",
        "rgba(255,165,44,0.03)",
        "rgba(0,128,24,0.03)",
        "rgba(0,0,249,0.03)",
        "rgba(134,0,125,0.03)",
      ],
      gradientType: "linear",
      gradientAngle: 135,
      animation: "rainbow-cycle",
      duration: 6,
      opacity: 0.7,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FF0018", "#FFA52C", "#FFFF41"], shape: "orb", size: 120, blur: 60, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#008018", "#0000F9", "#86007D"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.25, delay: 0.6 },
    ],
  },

  themed_parties: {
    particles: {
      shapes: ["confetti", "star", "circle"],
      colors: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6BFF", "#FF9A3C"],
      count: 50,
      sizeRange: [3, 7],
      speedRange: [0.5, 1.8],
      gravity: 0.25,
      drift: 1.0,
      rotationSpeed: 3.5,
      opacityRange: [0.35, 0.8],
      direction: "down",
      glow: false,
    },
    ambient: {
      colors: ["rgba(255,107,107,0.05)", "rgba(77,150,255,0.04)", "transparent"],
      gradientType: "linear",
      gradientAngle: 45,
      animation: "sweep",
      duration: 5,
      opacity: 0.55,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FF6B6B", "#FF8A80", "#FFCDD2"], shape: "orb", size: 110, blur: 55, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#4D96FF", "#82B1FF", "#BBDEFB"], shape: "orb", size: 90, blur: 45, animation: "float", opacity: 0.2, delay: 0.7 },
    ],
  },

  // ── Food & Drink ────────────────────────────────────────────────────────

  food_drink: {
    particles: {
      shapes: ["bubble", "circle"],
      colors: ["#D4A037", "#C8960C", "#FFD700", "#ffffff", "#F5DEB3"],
      count: 30,
      sizeRange: [3, 7],
      speedRange: [0.3, 1.0],
      gravity: -0.2,
      drift: 0.4,
      rotationSpeed: 0.3,
      opacityRange: [0.2, 0.5],
      direction: "up",
      glow: true,
      glowRadius: 6,
    },
    ambient: {
      colors: ["rgba(212,160,55,0.05)", "rgba(255,215,0,0.04)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 6,
      opacity: 0.5,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FFD700", "#FFC107", "#FFECB3"], shape: "orb", size: 100, blur: 50, animation: "pulse-glow", opacity: 0.25, delay: 0 },
      { position: "bottom-left", gradientColors: ["#FF8F00", "#FFA726"], shape: "orb", size: 70, blur: 35, animation: "float", opacity: 0.15, delay: 0.8 },
    ],
  },

  street_food: {
    particles: {
      shapes: ["ember", "flame", "circle"],
      colors: ["#FF8C00", "#FFD700", "#FFA500", "#FF6347", "#FFE4B5"],
      count: 28,
      sizeRange: [2, 5],
      speedRange: [0.3, 0.9],
      gravity: -0.15,
      drift: 0.5,
      rotationSpeed: 0.5,
      opacityRange: [0.25, 0.6],
      direction: "up",
      glow: true,
      glowRadius: 8,
    },
    ambient: {
      colors: ["rgba(255,140,0,0.05)", "rgba(255,165,0,0.04)", "transparent"],
      gradientType: "radial",
      animation: "flicker",
      duration: 3,
      opacity: 0.5,
    },
    decorations: [
      { position: "bottom-left", gradientColors: ["#FF8C00", "#FFA726", "#FFB74D"], shape: "orb", size: 100, blur: 50, animation: "flicker", opacity: 0.25, delay: 0 },
      { position: "top-right", gradientColors: ["#FFD700", "#FFECB3"], shape: "orb", size: 80, blur: 40, animation: "pulse-glow", opacity: 0.2, delay: 0.6 },
    ],
  },

  // ── Cultural / Identity ─────────────────────────────────────────────────

  pride: {
    particles: {
      shapes: ["heart", "star", "confetti"],
      colors: ["#FF0018", "#FFA52C", "#FFFF41", "#008018", "#0000F9", "#86007D"],
      count: 50,
      sizeRange: [3, 7],
      speedRange: [0.4, 1.3],
      gravity: 0.15,
      drift: 0.6,
      rotationSpeed: 2.5,
      opacityRange: [0.35, 0.75],
      direction: "down",
      glow: true,
      glowRadius: 5,
    },
    ambient: {
      colors: [
        "rgba(255,0,24,0.03)",
        "rgba(255,165,44,0.03)",
        "rgba(255,255,65,0.02)",
        "rgba(0,128,24,0.03)",
        "rgba(0,0,249,0.03)",
        "rgba(134,0,125,0.03)",
      ],
      gradientType: "linear",
      gradientAngle: 180,
      animation: "rainbow-cycle",
      duration: 8,
      opacity: 0.7,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#FF0018", "#FFA52C", "#FFFF41"], shape: "orb", size: 120, blur: 60, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-right", gradientColors: ["#008018", "#0000F9", "#86007D"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.25, delay: 0.6 },
    ],
  },

  afrobeats: {
    particles: {
      shapes: ["ember", "circle", "star"],
      colors: ["#FF4500", "#FF6347", "#FFD700", "#FF8C00", "#DC143C", "#FF7F50"],
      count: 40,
      sizeRange: [2, 6],
      speedRange: [0.5, 1.8],
      gravity: -0.25,
      drift: 0.8,
      rotationSpeed: 1.2,
      opacityRange: [0.3, 0.7],
      direction: "up",
      glow: true,
      glowRadius: 10,
    },
    ambient: {
      colors: ["rgba(255,69,0,0.05)", "rgba(255,140,0,0.04)", "transparent"],
      gradientType: "radial",
      animation: "pulse",
      duration: 2.5,
      opacity: 0.6,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FF4500", "#FF6347", "#FF8C00"], shape: "orb", size: 130, blur: 65, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#FFD700", "#FFC107"], shape: "orb", size: 90, blur: 45, animation: "flicker", opacity: 0.2, delay: 0.5 },
    ],
  },

  day_raves: {
    particles: {
      shapes: ["circle", "star", "diamond"],
      colors: ["#FFD700", "#00FF99", "#FF6BFF", "#00BFFF", "#FFE500", "#FF4444"],
      count: 45,
      sizeRange: [2, 6],
      speedRange: [0.5, 2.0],
      gravity: -0.2,
      drift: 0.9,
      rotationSpeed: 2.5,
      opacityRange: [0.3, 0.7],
      direction: "up",
      glow: true,
      glowRadius: 8,
    },
    ambient: {
      colors: ["rgba(255,215,0,0.06)", "rgba(255,165,0,0.05)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 4,
      opacity: 0.6,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FFD700", "#FFC107", "#FF8F00"], shape: "orb", size: 140, blur: 70, animation: "pulse-glow", opacity: 0.35, delay: 0 },
      { position: "bottom-left", gradientColors: ["#00FF99", "#69F0AE", "#B9F6CA"], shape: "orb", size: 100, blur: 50, animation: "float", opacity: 0.2, delay: 0.7 },
      { position: "bottom-right", gradientColors: ["#FF6BFF", "#EA80FC"], shape: "streak", size: 60, blur: 25, animation: "drift", opacity: 0.15, delay: 1.3 },
    ],
  },

  open_mic: {
    particles: {
      shapes: ["circle", "star"],
      colors: ["#FFD700", "#FFF8DC", "#ffffff", "#FFFACD", "#F5DEB3"],
      count: 18,
      sizeRange: [2, 4],
      speedRange: [0.15, 0.6],
      gravity: -0.08,
      drift: 0.25,
      rotationSpeed: 0.3,
      opacityRange: [0.2, 0.5],
      direction: "up",
      glow: true,
      glowRadius: 14,
    },
    ambient: {
      colors: ["rgba(255,215,0,0.05)", "rgba(255,255,255,0.03)", "transparent"],
      gradientType: "radial",
      animation: "spotlight",
      duration: 6,
      opacity: 0.5,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#FFD700", "#FFC107", "#FFECB3"], shape: "orb", size: 160, blur: 80, animation: "pulse-glow", opacity: 0.2, delay: 0 },
    ],
  },

  // ── Professional ────────────────────────────────────────────────────────

  networking: {
    particles: {
      shapes: ["circle"],
      colors: ["#3B82F6", "#60A5FA", "#93C5FD", "#BFDBFE", "#ffffff"],
      count: 15,
      sizeRange: [1, 3],
      speedRange: [0.1, 0.4],
      gravity: 0,
      drift: 0.25,
      rotationSpeed: 0,
      opacityRange: [0.15, 0.4],
      direction: "mixed",
      glow: true,
      glowRadius: 14,
    },
    ambient: {
      colors: ["rgba(59,130,246,0.04)", "rgba(99,102,241,0.03)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 8,
      opacity: 0.4,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#3B82F6", "#60A5FA", "#93C5FD"], shape: "orb", size: 100, blur: 50, animation: "pulse-glow", opacity: 0.15, delay: 0 },
    ],
  },

  workshops: {
    particles: {
      shapes: ["star", "circle"],
      colors: ["#FFD700", "#4CAF50", "#FF9800", "#ffffff", "#FFF9C4"],
      count: 18,
      sizeRange: [2, 4],
      speedRange: [0.15, 0.5],
      gravity: -0.06,
      drift: 0.3,
      rotationSpeed: 0.5,
      opacityRange: [0.2, 0.5],
      direction: "up",
      glow: true,
      glowRadius: 10,
    },
    ambient: {
      colors: ["rgba(255,215,0,0.04)", "rgba(76,175,80,0.03)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 7,
      opacity: 0.4,
    },
    decorations: [
      { position: "top-left", gradientColors: ["#FFD700", "#FFC107", "#FFECB3"], shape: "orb", size: 100, blur: 50, animation: "pulse-glow", opacity: 0.2, delay: 0 },
      { position: "bottom-right", gradientColors: ["#4CAF50", "#66BB6A", "#A5D6A7"], shape: "orb", size: 70, blur: 35, animation: "float", opacity: 0.15, delay: 0.8 },
    ],
  },

  // ── South-Asian / Religious ─────────────────────────────────────────────

  diwali: {
    particles: {
      shapes: ["ember", "flame", "star", "diamond", "firework"],
      colors: ["#FFD700", "#FF8C00", "#FF6347", "#FFC107", "#FFE082", "#FF9800"],
      count: 55,
      sizeRange: [2, 7],
      speedRange: [0.4, 1.8],
      gravity: -0.25,
      drift: 0.7,
      rotationSpeed: 1.8,
      opacityRange: [0.35, 0.9],
      direction: "up",
      glow: true,
      glowRadius: 14,
    },
    ambient: {
      colors: ["rgba(255,215,0,0.07)", "rgba(255,140,0,0.06)", "transparent"],
      gradientType: "radial",
      animation: "flicker",
      duration: 2.5,
      opacity: 0.7,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#FFD700", "#FFC107", "#FF8F00"], shape: "orb", size: 140, blur: 70, animation: "pulse-glow", opacity: 0.35, delay: 0 },
      { position: "bottom-left", gradientColors: ["#FF6347", "#FF8C00", "#FFB300"], shape: "orb", size: 110, blur: 55, animation: "flicker", opacity: 0.3, delay: 0.5 },
      { position: "bottom-right", gradientColors: ["#FFE082", "#FFF8E1"], shape: "orb", size: 70, blur: 35, animation: "float", opacity: 0.2, delay: 1.0 },
    ],
  },

  eid: {
    particles: {
      shapes: ["star", "crescent", "circle", "diamond"],
      colors: ["#C0C0C0", "#FFD700", "#E8E8E8", "#DAA520", "#ffffff", "#4169E1"],
      count: 35,
      sizeRange: [2, 5],
      speedRange: [0.15, 0.7],
      gravity: -0.08,
      drift: 0.35,
      rotationSpeed: 0.5,
      opacityRange: [0.25, 0.65],
      direction: "up",
      glow: true,
      glowRadius: 10,
    },
    ambient: {
      colors: ["rgba(25,25,112,0.06)", "rgba(192,192,192,0.04)", "transparent"],
      gradientType: "radial",
      animation: "breathe",
      duration: 7,
      opacity: 0.55,
    },
    decorations: [
      { position: "top-right", gradientColors: ["#C0C0C0", "#E0E0E0", "#F5F5F5"], shape: "crescent", size: 100, blur: 30, animation: "pulse-glow", opacity: 0.3, delay: 0 },
      { position: "bottom-left", gradientColors: ["#4169E1", "#5C6BC0", "#7986CB"], shape: "orb", size: 90, blur: 45, animation: "float", opacity: 0.2, delay: 0.7 },
      { position: "top-left", gradientColors: ["#FFD700", "#FFC107"], shape: "orb", size: 60, blur: 30, animation: "drift", opacity: 0.15, delay: 1.2 },
    ],
  },
};
