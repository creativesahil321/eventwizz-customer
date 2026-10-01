"use client";

import { sanitizeHtml } from "@/lib/security/sanitize-html";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, PlayCircle } from "lucide-react";
import BookACallModal from "../book-a-call-modal";
import {
  isExternalUrl,
  resolveVideoEmbed,
  type AdminHomeContent,
} from "@/lib/admin-cms-content";
import { SiteHeading } from "@/components/public/site-heading";

const CONTROL_ITEMS = [
  "How guests book tickets or tables",
  "What they pay and how they pay",
  "Which menus and add-ons they choose",
  "How your venue website looks and feels",
];

export default function RevolutioniseSection({
  content,
}: {
  content: AdminHomeContent["showcase"];
}) {
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const hasVideo = Boolean(content.videoUrl);
  const videoEmbed = hasVideo ? resolveVideoEmbed(content.videoUrl) : null;

  return (
    <>
      <section className="py-20 bg-[color:var(--color-background)]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Image mockup with play button */}
            <div className="relative">
              {/* Decorative circle behind image */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[420px] h-[420px] rounded-full bg-[color:var(--color-primary)]/10 blur-2xl" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
                {/* Plain img so tenant-supplied remote URLs work without next/image config */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={content.image}
                  alt="Platform showcase"
                  className="w-full h-auto object-cover"
                />
                {hasVideo ? (
                  <>
                    {/* Dark overlay for contrast with play button */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                    {/* Play button — opens the demo video */}
                    <button
                      type="button"
                      onClick={() => setVideoOpen(true)}
                      aria-label="Watch demo video"
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="flex flex-col items-center gap-2">
                        <PlayCircle className="h-16 w-16 text-white drop-shadow-2xl group-hover:scale-110 transition-transform duration-300" />
                        <span className="text-white text-sm font-medium opacity-90">
                          Watch Demo
                        </span>
                      </span>
                    </button>
                  </>
                ) : null}
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-5 -right-4 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-white/30">
                <p className="text-xs text-gray-500 font-medium mb-0.5">Average setup time</p>
                <p className="text-2xl font-extrabold text-gray-900">15 mins</p>
                <p className="text-xs text-[color:var(--color-primary)] font-medium">Ready to go live ✓</p>
              </div>
            </div>

            {/* Right: Content */}
            <div>
              <SiteHeading
                level={2}
                title={content.title}
                variant="onSurface"
                className="mb-6"
              />
              <div
                className="space-y-4 text-[color:var(--color-text-dimmed)] leading-relaxed mb-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.body) }}
              />

              <h3
                className="text-lg font-semibold text-[color:var(--color-text)] mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {content.checklistTitle}
              </h3>
              <ul className="space-y-3 mb-8">
                {CONTROL_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[color:var(--color-primary)]/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3 text-[color:var(--color-primary)]" />
                    </div>
                    <span className="text-[color:var(--color-text-dimmed)]">{item}</span>
                  </li>
                ))}
              </ul>
              {content.ctaLink ? (
                <Button
                  asChild
                  variant="event-primary"
                  size="lg"
                  className="rounded-md px-8"
                >
                  <a
                    href={content.ctaLink}
                    {...(isExternalUrl(content.ctaLink)
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {content.cta}
                  </a>
                </Button>
              ) : (
                <Button
                  variant="event-primary"
                  size="lg"
                  className="rounded-md px-8"
                  onClick={() => setBookCallOpen(true)}
                >
                  {content.cta}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <BookACallModal isOpen={bookCallOpen} onClose={() => setBookCallOpen(false)} />

      {videoEmbed ? (
        <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
          <DialogContent className="max-w-3xl overflow-hidden border-0 bg-black p-0">

            <DialogTitle className="sr-only">Demo video</DialogTitle>
            <div className="aspect-video w-full">
              {videoEmbed.type === "iframe" ? (
                <iframe
                  src={videoEmbed.src}
                  title="Demo video"
                  className="h-full w-full"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                />
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={videoEmbed.src}
                  controls
                  autoPlay
                  className="h-full w-full bg-black"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
