"use client";

import React, { useEffect, useRef, useCallback } from "react";
import type { ParticleConfig, ParticleShape } from "./theme-configs";

interface ParticleEngineProps {
  config: ParticleConfig;
  intensity: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// Internal particle type
// ---------------------------------------------------------------------------
interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  rotation: number;
  color: string;
  shape: ParticleShape;
  driftOffset: number;
  driftSpeed: number;
  fadeDirection: 1 | -1;
  life: number;
}

// ---------------------------------------------------------------------------
// Shape drawing functions
// ---------------------------------------------------------------------------

function drawCircle(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.beginPath();
  ctx.arc(0, 0, p.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawHeart(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size * 1.2;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.3);
  ctx.bezierCurveTo(-s, -s * 0.3, -s * 0.5, -s, 0, -s * 0.5);
  ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.3, 0, s * 0.3);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, p: Particle) {
  const spikes = 5;
  const outerR = p.size;
  const innerR = p.size * 0.4;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawSnowflake(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.lineWidth = Math.max(0.5, s * 0.15);
  ctx.strokeStyle = ctx.fillStyle as string;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * s, Math.sin(angle) * s);
    ctx.stroke();
    // Branch tips
    const bx = Math.cos(angle) * s * 0.6;
    const by = Math.sin(angle) * s * 0.6;
    const branchAngle1 = angle + 0.5;
    const branchAngle2 = angle - 0.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(
      bx + Math.cos(branchAngle1) * s * 0.3,
      by + Math.sin(branchAngle1) * s * 0.3
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(
      bx + Math.cos(branchAngle2) * s * 0.3,
      by + Math.sin(branchAngle2) * s * 0.3
    );
    ctx.stroke();
  }
}

function drawMusicNote(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  // Note head
  ctx.beginPath();
  ctx.ellipse(0, s * 0.3, s * 0.4, s * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // Stem
  ctx.fillRect(s * 0.3, -s * 0.8, s * 0.1, s * 1.1);
  // Flag
  ctx.beginPath();
  ctx.moveTo(s * 0.4, -s * 0.8);
  ctx.quadraticCurveTo(s * 0.9, -s * 0.4, s * 0.4, -s * 0.1);
  ctx.lineWidth = s * 0.1;
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.stroke();
}

function drawConfetti(ctx: CanvasRenderingContext2D, p: Particle) {
  ctx.fillRect(-p.size * 0.3, -p.size, p.size * 0.6, p.size * 2);
}

function drawBubble(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.lineWidth = s * 0.15;
  ctx.stroke();
  // Highlight
  ctx.beginPath();
  ctx.arc(-s * 0.3, -s * 0.3, s * 0.2, 0, Math.PI * 2);
  ctx.globalAlpha *= 0.6;
  ctx.fill();
  ctx.globalAlpha /= 0.6;
}

function drawEmber(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamond(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.6, 0);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.6, 0);
  ctx.closePath();
  ctx.fill();
}

function drawPetal(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s * 0.8, -s * 0.5, s * 0.8, s * 0.5, 0, s);
  ctx.bezierCurveTo(-s * 0.8, s * 0.5, -s * 0.8, -s * 0.5, 0, -s);
  ctx.fill();
}

function drawRaindrop(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.5, s * 0.3, 0, s);
  ctx.bezierCurveTo(-s * 0.5, s * 0.3, -s * 0.5, -s * 0.3, 0, -s);
  ctx.fill();
}

function drawBat(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  // Body
  ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Left wing
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, 0);
  ctx.bezierCurveTo(-s, -s * 0.8, -s * 1.2, s * 0.2, -s * 0.4, s * 0.3);
  ctx.fill();
  // Right wing
  ctx.beginPath();
  ctx.moveTo(s * 0.2, 0);
  ctx.bezierCurveTo(s, -s * 0.8, s * 1.2, s * 0.2, s * 0.4, s * 0.3);
  ctx.fill();
}

function drawFirework(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  const rays = 8;
  ctx.lineWidth = Math.max(0.5, s * 0.12);
  ctx.strokeStyle = ctx.fillStyle as string;
  for (let i = 0; i < rays; i++) {
    const angle = (Math.PI * 2 * i) / rays;
    const innerR = s * 0.2;
    const outerR = s;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
    ctx.stroke();
    // Tip dot
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * outerR, Math.sin(angle) * outerR, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // Center glow
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawGhost(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  // Head (rounded top)
  ctx.arc(0, -s * 0.2, s * 0.6, Math.PI, 0);
  // Body sides
  ctx.lineTo(s * 0.6, s * 0.5);
  // Wavy bottom
  ctx.quadraticCurveTo(s * 0.3, s * 0.3, 0, s * 0.5);
  ctx.quadraticCurveTo(-s * 0.3, s * 0.3, -s * 0.6, s * 0.5);
  ctx.closePath();
  ctx.fill();
  // Eyes
  ctx.globalAlpha *= 0.5;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.arc(-s * 0.2, -s * 0.15, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(s * 0.2, -s * 0.15, s * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha /= 0.5;
}

function drawFlame(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  // Outer flame
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.4, s * 0.3, 0, s * 0.6);
  ctx.bezierCurveTo(-s * 0.4, s * 0.3, -s * 0.5, -s * 0.3, 0, -s);
  ctx.fill();
  // Inner flame (brighter)
  ctx.globalAlpha *= 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.6);
  ctx.bezierCurveTo(s * 0.25, -s * 0.1, s * 0.2, s * 0.2, 0, s * 0.4);
  ctx.bezierCurveTo(-s * 0.2, s * 0.2, -s * 0.25, -s * 0.1, 0, -s * 0.6);
  ctx.fill();
  ctx.globalAlpha /= 1.2;
}

function drawLightning(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.lineWidth = Math.max(0.5, s * 0.2);
  ctx.strokeStyle = ctx.fillStyle as string;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.3, -s * 0.3);
  ctx.lineTo(-s * 0.1, -s * 0.2);
  ctx.lineTo(s * 0.2, s * 0.5);
  ctx.lineTo(-s * 0.05, 0);
  ctx.lineTo(s * 0.15, s);
  ctx.stroke();
}

function drawCrescent(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, Math.PI * 2);
  ctx.fill();
  // Cut out inner circle to create crescent
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(s * 0.35, -s * 0.1, s * 0.75, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
}

function drawCrossStar(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  // Vertical beam
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.15, -s * 0.15);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.15, s * 0.15);
  ctx.closePath();
  ctx.fill();
  // Horizontal beam
  ctx.beginPath();
  ctx.moveTo(-s, 0);
  ctx.lineTo(-s * 0.15, -s * 0.15);
  ctx.lineTo(s, 0);
  ctx.lineTo(s * 0.15, s * 0.15);
  ctx.closePath();
  ctx.fill();
  // Center glow
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

const SHAPE_RENDERERS: Record<
  ParticleShape,
  (ctx: CanvasRenderingContext2D, p: Particle) => void
> = {
  circle: drawCircle,
  heart: drawHeart,
  star: drawStar,
  snowflake: drawSnowflake,
  "music-note": drawMusicNote,
  confetti: drawConfetti,
  bubble: drawBubble,
  ember: drawEmber,
  diamond: drawDiamond,
  petal: drawPetal,
  raindrop: drawRaindrop,
  bat: drawBat,
  firework: drawFirework,
  ghost: drawGhost,
  flame: drawFlame,
  lightning: drawLightning,
  crescent: drawCrescent,
  "cross-star": drawCrossStar,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ParticleEngine({ config, intensity }: ParticleEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef<number>(0);

  const intensityMultiplier =
    intensity === "high" ? 2 : intensity === "low" ? 0.5 : 1;

  const createParticle = useCallback(
    (canvas: HTMLCanvasElement, initialY?: number): Particle => {
      const { shapes, colors, sizeRange, speedRange, opacityRange, drift } =
        config;
      return {
        x: Math.random() * canvas.width,
        y:
          initialY !== undefined
            ? initialY
            : config.direction === "up"
            ? canvas.height + 20
            : config.direction === "down"
            ? -20
            : Math.random() * canvas.height,
        size:
          sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        speed:
          speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]),
        opacity:
          opacityRange[0] +
          Math.random() * (opacityRange[1] - opacityRange[0]),
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        driftOffset: Math.random() * Math.PI * 2,
        driftSpeed: 0.5 + Math.random() * 1.5,
        fadeDirection: 1,
        life: Math.random(),
      };
    },
    [config]
  );

  useEffect(() => {
    // Respect prefers-reduced-motion
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Create initial particles (scattered across screen)
    const count = Math.round(config.count * intensityMultiplier);
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(canvas, Math.random() * canvas.height)
    );

    // Animation loop — throttle to ~30fps on low intensity
    const targetFPS = intensity === "low" ? 30 : 60;
    const frameInterval = 1000 / targetFPS;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - lastFrameRef.current;
      if (elapsed < frameInterval) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameRef.current = timestamp - (elapsed % frameInterval);

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      for (const p of particlesRef.current) {
        // Physics update
        const driftX =
          Math.sin(p.life * p.driftSpeed + p.driftOffset) * config.drift;
        p.x += driftX;
        p.y +=
          config.direction === "up"
            ? -p.speed
            : config.direction === "down"
            ? p.speed
            : p.speed * (Math.random() > 0.5 ? 1 : -1) * 0.3;
        p.y += config.gravity;
        p.rotation += config.rotationSpeed;
        p.life += 0.008;

        // Recycle particles that leave bounds
        if (
          (config.direction === "up" && p.y < -30) ||
          (config.direction === "down" && p.y > h + 30) ||
          p.x < -30 ||
          p.x > w + 30
        ) {
          Object.assign(p, createParticle(canvas));
        }
        if (config.direction === "mixed" && (p.y < -30 || p.y > h + 30)) {
          Object.assign(p, createParticle(canvas));
        }

        // Draw
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;

        // Glow effect
        if (config.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = config.glowRadius || 6;
        }

        const renderer = SHAPE_RENDERERS[p.shape];
        if (renderer) renderer(ctx, p);

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [config, intensity, intensityMultiplier, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 10, background: "transparent" }}
      aria-hidden="true"
    />
  );
}
