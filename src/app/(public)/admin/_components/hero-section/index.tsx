"use client";

import Link from "next/link";
import { useContext } from "react";
import { Button } from "@/components/ui/button";
import { ServerContext } from "@/lib/server-context";

export default function HeroSection() {
  const { theme } = useContext(ServerContext);

  return (
    <section className="relative py-24 md:py-32 bg-[color:var(--color-background)] overflow-hidden">
      {/* Particle/Light Effects Background */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-20 left-1/4 w-2 h-2 rounded-full bg-[color:var(--color-primary)] animate-pulse"></div>
        <div className="absolute top-40 left-3/4 w-3 h-3 rounded-full bg-[color:var(--color-primary)] animate-pulse"></div>
        <div className="absolute top-80 left-1/2 w-2 h-2 rounded-full bg-[color:var(--color-accent)] animate-pulse"></div>
        <div className="absolute bottom-20 left-1/3 w-2 h-2 rounded-full bg-[color:var(--color-info)] animate-pulse"></div>
        <div className="absolute bottom-40 left-1/4 w-3 h-3 rounded-full bg-[color:var(--color-primary)] animate-pulse"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <div className="flex flex-col space-y-6 text-[color:var(--color-text)]">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {theme?.seo?.title || "Event Management Software"}
            </h1>
            <p className="text-xl text-[color:var(--color-text-dimmed)] leading-relaxed">
              {theme?.seo?.description ||
                "An event tech platform for face-to-face, online, and hybrid experiences"}
            </p>
            <p className="text-[color:var(--color-text-dimmed)]">
              Maecenas non mauris arcu. Donec risus felis, laoreet quis ante
              quis, feugiat mollis orci. Integer sit amet interdum dolor. Aenean
              sagittis libero nisi, in tristique metus faucibus nec. Donec
              convallis congue lectus eu pretium.
            </p>
            <div className="pt-6">
              <Link href="/auth/register">
                <Button
                  variant="event-primary"
                  size="lg"
                  className="rounded-md px-8 shadow-lg"
                >
                  Try {theme?.name || "EventWizz"} Management For Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column - CSS-based Laptop Mockup */}
          <div className="relative hidden md:block">
            {/* CSS Laptop Mockup */}
            <div className="laptop-mockup">
              <div className="laptop-screen">
                {/* Event Content Preview */}
                <div className="screen-content">
                  <div className="event-header">
                    <div className="event-title">Christmas Party</div>
                    <div className="event-price">PRICES FROM £79</div>
                  </div>
                  <div className="event-image"></div>
                  <div className="event-details">
                    <div className="event-venue">Stock Brook&apos;s Spectacular</div>
                    <div className="event-description">Christmas Party</div>
                  </div>
                </div>
              </div>
              <div className="laptop-base"></div>
            </div>

            {/* Light glow effects */}
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[color:var(--color-primary)]/20 rounded-full blur-xl z-0"></div>
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[color:var(--color-secondary)]/20 rounded-full blur-xl z-0"></div>
          </div>
        </div>
      </div>

      {/* CSS for the laptop mockup */}
      <style jsx>{`
        .laptop-mockup {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }

        .laptop-screen {
          position: relative;
          background: #252525;
          border: 16px solid #252525;
          border-radius: 15px 15px 0 0;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          width: 100%;
          height: 0;
          padding-bottom: 60%;
          overflow: hidden;
        }

        .laptop-base {
          background: #1e1e1e;
          height: 20px;
          margin: 0 -20px;
          border-radius: 0 0 10px 10px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        .screen-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: white;
          display: flex;
          flex-direction: column;
        }

        .event-header {
          padding: 15px;
          display: flex;
          justify-content: space-between;
          background: var(--color-primary);
          color: white;
          font-weight: bold;
        }

        .event-image {
          height: 60%;
          background: linear-gradient(
            45deg,
            var(--color-primary),
            var(--color-secondary)
          );
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .event-image::after {
          content: "JOIN US FOR OUR CHRISTMAS";
          position: absolute;
          font-size: 24px;
          font-weight: bold;
          color: white;
          text-align: center;
        }

        .event-details {
          padding: 15px;
          background: white;
          color: var(--color-text);
          text-align: center;
        }

        .event-venue {
          font-size: 16px;
          font-weight: bold;
        }

        .event-description {
          font-size: 14px;
        }
      `}</style>
    </section>
  );
}
