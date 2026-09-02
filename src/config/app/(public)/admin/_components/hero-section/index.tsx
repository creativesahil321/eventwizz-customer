"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Star } from "lucide-react";
import BookACallModal from "../book-a-call-modal";
import { isExternalUrl, type AdminHomeContent } from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";

export default function HeroSection({
  content,
}: {
  content: AdminHomeContent["hero"];
}) {
  const [bookCallOpen, setBookCallOpen] = useState(false);

  return (
    <>
      {/*
        Hero always uses a real image background + dark overlay.
        ALL text is forced white — never theme vars — so it works
        regardless of what theme color the tenant has set.
        Theme vars (--color-primary) are only used for small accents.
      */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* ── Full-bleed background image ── */}
        <div className="absolute inset-0 z-0">
          {/* Plain img so tenant-supplied remote URLs work without next/image domain config */}
          <img
            src={content.backgroundImage}
            alt="Hero background"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          {/* Dark gradient overlay so text is always readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          {/* Subtle primary-colour tint on the left for brand personality */}
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--color-primary)]/20 via-transparent to-transparent" />
        </div>

        {/* ── Content ── */}
        <div className="relative z-10 container mx-auto px-4 pt-32 pb-20 md:pt-40 md:pb-28">
          <div className="max-w-3xl">

            {/* Text & CTA — all white, no theme vars for colour */}
            <div className="flex flex-col space-y-6">
              {/* Trust chip — white/translucent so it works on any BG */}
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-white rounded-full px-4 py-1.5 text-sm font-medium w-fit">
                <Star className="h-3.5 w-3.5 fill-current text-yellow-400" />
                {content.eyebrow}
              </div>

              <SiteHeading
                level={1}
                title={content.title}
                variant="onDark"
                className="!text-4xl !font-bold md:!text-5xl lg:!text-6xl"
              />

              <p className="text-lg md:text-xl text-white/80 leading-relaxed max-w-lg">
                {content.subtitle}
              </p>

              {/* Feature checkmarks — white so always visible on dark bg */}
              <div className="flex flex-wrap gap-4 text-sm text-white/90">
                {["Ready in 15 minutes", "No technical skills needed", "Fully branded website"].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[color:var(--color-primary)] shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap gap-3">
                {content.primaryCtaLink ? (
                  <Button
                    asChild
                    variant="event-primary"
                    size="lg"
                    className="rounded-md px-8 shadow-lg text-base"
                  >
                    <a
                      href={content.primaryCtaLink}
                      {...(isExternalUrl(content.primaryCtaLink)
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {content.primaryCta}
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="event-primary"
                    size="lg"
                    className="rounded-md px-8 shadow-lg text-base"
                    onClick={() => setBookCallOpen(true)}
                  >
                    {content.primaryCta}
                  </Button>
                )}
                {content.secondaryCtaLink ? (
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="rounded-md px-8 text-base bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                  >
                    <a
                      href={content.secondaryCtaLink}
                      {...(isExternalUrl(content.secondaryCtaLink)
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {content.secondaryCta}
                    </a>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-md px-8 text-base bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
                    onClick={() => setBookCallOpen(true)}
                  >
                    {content.secondaryCta}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <BookACallModal isOpen={bookCallOpen} onClose={() => setBookCallOpen(false)} />
    </>
  );
}
