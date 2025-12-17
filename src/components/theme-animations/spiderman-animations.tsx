"use client";

import React, { useEffect, useRef } from "react";

interface SpiderManAnimationsProps {
  enabled: boolean;
  intensity?: "low" | "medium" | "high";
}

export function WebSwingAnimation({
  enabled,
  intensity = "medium",
}: SpiderManAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const webs: HTMLDivElement[] = [];

    // Create web lines
    for (
      let i = 0;
      i < (intensity === "high" ? 8 : intensity === "medium" ? 5 : 3);
      i++
    ) {
      const web = document.createElement("div");
      web.className = "absolute bg-white opacity-20";
      web.style.left = Math.random() * 100 + "%";
      web.style.top = "0";
      web.style.width = "2px";
      web.style.height = "100vh";
      web.style.background =
        "linear-gradient(to bottom, transparent, white, transparent)";
      web.style.animation = `webSwing ${
        Math.random() * 4 + 3
      }s infinite ease-in-out`;
      web.style.animationDelay = Math.random() * 2 + "s";
      container.appendChild(web);
      webs.push(web);
    }

    return () => {
      webs.forEach((web) => web.remove());
    };
  }, [enabled, intensity]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: "transparent" }}
    />
  );
}

export function SpiderSenseEffect({ enabled }: SpiderManAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const effects: HTMLDivElement[] = [];

    // Create spider-sense warning effects
    for (let i = 0; i < 3; i++) {
      const effect = document.createElement("div");
      effect.className = "absolute inset-0 border-4 border-red-500 opacity-0";
      effect.style.animation = `spiderSense ${2 + i * 0.5}s infinite`;
      effect.style.animationDelay = i * 0.3 + "s";
      container.appendChild(effect);
      effects.push(effect);
    }

    return () => {
      effects.forEach((effect) => effect.remove());
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-15"
      style={{ background: "transparent" }}
    />
  );
}

export function CityLightsEffect({ enabled }: SpiderManAnimationsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // City lights
    const lights: Array<{
      x: number;
      y: number;
      brightness: number;
      color: string;
    }> = [];

    // Create city lights
    for (let i = 0; i < 50; i++) {
      lights.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.3 + canvas.height * 0.7, // Bottom 30% of screen
        brightness: Math.random() * 0.8 + 0.2,
        color: Math.random() > 0.5 ? "#ffff00" : "#ffffff",
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      lights.forEach((light) => {
        // Flicker effect
        light.brightness += (Math.random() - 0.5) * 0.1;
        light.brightness = Math.max(0.1, Math.min(1, light.brightness));

        // Draw light
        ctx.save();
        ctx.globalAlpha = light.brightness;
        ctx.fillStyle = light.color;
        ctx.beginPath();
        ctx.arc(light.x, light.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Add glow effect
        ctx.shadowColor = light.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(light.x, light.y, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-5"
      style={{ background: "transparent" }}
    />
  );
}

export function SpiderManDecorations({ enabled }: SpiderManAnimationsProps) {
  if (!enabled) return null;

  return (
    <>
      {/* Spider Logo */}
      <div className="fixed top-4 left-4 z-20 pointer-events-none">
        <div className="text-3xl animate-pulse">🕷️</div>
      </div>

      {/* Web Pattern */}
      <div className="fixed top-1/2 right-4 z-20 pointer-events-none">
        <div
          className="text-2xl animate-spin"
          style={{ animationDuration: "10s" }}
        >
          🕸️
        </div>
      </div>

      {/* City Skyline */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div
          className="text-2xl animate-pulse"
          style={{ animationDelay: "1s" }}
        >
          🏙️
        </div>
      </div>
    </>
  );
}

// CSS for animations
const spiderManCSS = `
@keyframes webSwing {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  75% { transform: rotate(-2deg); }
}

@keyframes spiderSense {
  0% { opacity: 0; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.05); }
  100% { opacity: 0; transform: scale(1.1); }
}
`;

// Inject CSS
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = spiderManCSS;
  document.head.appendChild(style);
}
