"use client";

import React, { useEffect, useRef } from "react";

interface ChristmasAnimationsProps {
  enabled: boolean;
  intensity?: "low" | "medium" | "high";
}

export function SnowfallAnimation({
  enabled,
  intensity = "medium",
}: ChristmasAnimationsProps) {
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

    // Snowflake properties
    const snowflakes: Array<{
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
    }> = [];

    const snowflakeCount =
      intensity === "high" ? 100 : intensity === "medium" ? 50 : 25;

    // Create snowflakes
    for (let i = 0; i < snowflakeCount; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.8 + 0.2,
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakes.forEach((snowflake) => {
        // Update position
        snowflake.y += snowflake.speed;
        snowflake.x += Math.sin(snowflake.y * 0.01) * 0.5;

        // Reset if off screen
        if (snowflake.y > canvas.height) {
          snowflake.y = -10;
          snowflake.x = Math.random() * canvas.width;
        }

        // Draw snowflake
        ctx.save();
        ctx.globalAlpha = snowflake.opacity;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(snowflake.x, snowflake.y, snowflake.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [enabled, intensity]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ background: "transparent" }}
    />
  );
}

export function TwinklingLights({ enabled }: ChristmasAnimationsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const lights: HTMLDivElement[] = [];

    // Create twinkling lights
    for (let i = 0; i < 20; i++) {
      const light = document.createElement("div");
      light.className = "absolute w-2 h-2 rounded-full";
      light.style.left = Math.random() * 100 + "%";
      light.style.top = Math.random() * 100 + "%";
      light.style.background = `hsl(${Math.random() * 60 + 300}, 100%, 50%)`;
      light.style.boxShadow = "0 0 10px currentColor";
      light.style.animation = `twinkle ${
        Math.random() * 3 + 1
      }s infinite alternate`;
      container.appendChild(light);
      lights.push(light);
    }

    return () => {
      lights.forEach((light) => light.remove());
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-5"
      style={{ background: "transparent" }}
    />
  );
}

export function SantaClausAnimation({ enabled }: ChristmasAnimationsProps) {
  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 z-20 pointer-events-none">
      <div className="animate-bounce">
        <div className="text-4xl">🎅</div>
      </div>
    </div>
  );
}

export function ChristmasDecorations({ enabled }: ChristmasAnimationsProps) {
  if (!enabled) return null;

  return (
    <>
      {/* Christmas Tree */}
      <div className="fixed bottom-4 left-4 z-20 pointer-events-none">
        <div className="text-3xl animate-pulse">🎄</div>
      </div>

      {/* Gift Box */}
      <div className="fixed bottom-4 right-4 z-20 pointer-events-none">
        <div
          className="text-2xl animate-bounce"
          style={{ animationDelay: "0.5s" }}
        >
          🎁
        </div>
      </div>

      {/* Reindeer */}
      <div className="fixed top-1/2 left-4 z-20 pointer-events-none">
        <div
          className="text-2xl animate-pulse"
          style={{ animationDelay: "1s" }}
        >
          🦌
        </div>
      </div>
    </>
  );
}

// CSS for twinkling animation
const twinkleCSS = `
@keyframes twinkle {
  0% { opacity: 0.3; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1.2); }
}
`;

// Inject CSS
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = twinkleCSS;
  document.head.appendChild(style);
}
