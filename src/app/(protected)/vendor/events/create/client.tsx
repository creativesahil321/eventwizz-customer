"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { openEventPreviewTab } from "../_lib/open-event-preview-tab";
import { writeVendorEventIsRoomsFlag } from "../_lib/vendor-event-is-rooms";
import { FormProvider } from "../_components/events-form-provider";
import TabEventForm from "../_components/tab-event-form";
import AIEventCreationFlow from "../_components/ai-event-creation";
import { resolveAiDraftEventId } from "../_lib/ai-event-draft-storage";
import { motion } from "framer-motion";
import { Sparkles, PenTool, ArrowRight, Clock, Zap, CheckCircle2 } from "lucide-react";
import { useLocationStore } from "@/store/location.store";
import { resolveVenueLocationAddress, resolveVenueLocationCoords } from "@/lib/venue-location-address";

type CreateMode = "selecting" | "ai" | "manual";

const accent = {
  text: { color: "var(--color-primary, #3b82f6)" } as React.CSSProperties,
  gradient: {
    background: "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
  badgeBg: {
    backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)",
  } as React.CSSProperties,
  iconBox: {
    backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)",
  } as React.CSSProperties,
};

export default function CreateEventClientWrapper() {
  const [mode, setMode] = useState<CreateMode>("selecting");
  const router = useRouter();
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const venueCoords = resolveVenueLocationCoords(
    selectedLocation as
      | (NonNullable<typeof selectedLocation> & Record<string, unknown>)
      | null,
  );
  const venueInfo = selectedLocation
    ? {
        name: selectedLocation.name,
        city: selectedLocation.city,
        address: resolveVenueLocationAddress(selectedLocation) || undefined,
        latitude: venueCoords?.latitude ?? selectedLocation.latitude,
        longitude: venueCoords?.longitude ?? selectedLocation.longitude,
      }
    : undefined;

  const handleAIComplete = (eventId: number, isRooms: boolean) => {
    writeVendorEventIsRoomsFlag(eventId, isRooms);
    if (!openEventPreviewTab(eventId, isRooms)) {
      router.push(`/vendor/events/${eventId}`);
    }
  };

  const handleSwitchToManual = (draftEventId?: number) => {
    const resolvedId = resolveAiDraftEventId(draftEventId);
    if (resolvedId && resolvedId > 0) {
      router.push(`/vendor/events/${resolvedId}`);
      return;
    }
    setMode("manual");
  };

  if (mode === "manual") {
    return (
      <FormProvider serverData={null}>
        <TabEventForm />
      </FormProvider>
    );
  }

  // Cancel PageWrapper padding (px-3 pt-4 pb-32 / sm:pt-5 / md:pb-6) so the
  // dark canvas fills the screen — otherwise mobile shows a large white gap
  // under the chooser (pb-32 is reserved for floating chat widgets).
  const fullBleedClass =
    "-mx-3 -mt-4 -mb-32 sm:-mt-5 md:-mb-6 min-h-[calc(100dvh-3.5rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-y-auto";

  if (mode === "ai") {
    return (
      <div className={fullBleedClass}>
        <AIEventCreationFlow
          onComplete={handleAIComplete}
          onSwitchToManual={handleSwitchToManual}
          venueInfo={venueInfo}
        />
      </div>
    );
  }

  return (
    <div
      className={`${fullBleedClass} flex items-start justify-center sm:items-center`}
    >
      <ModeSelection onSelect={setMode} />
    </div>
  );
}

function ModeSelection({ onSelect }: { onSelect: (mode: CreateMode) => void }) {
  return (
    <div className="relative w-full max-w-3xl mx-auto px-3 py-6 sm:px-6 sm:py-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm border mb-4 sm:mb-6" style={accent.badgeBg}>
            <Sparkles className="w-3.5 h-3.5" style={accent.text} />
            <span className="text-xs font-medium tracking-wide uppercase" style={accent.text}>New Event</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 tracking-tight px-1">
            How would you like to <span style={accent.gradient}>create your event?</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto px-1">
            Choose AI to auto-generate all content in seconds, or manual for full control.
          </p>
        </motion.div>

        {/* Cards — extra bottom space so FABs don't cover CTAs on mobile */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:mb-0 sm:gap-4 md:grid-cols-2">
          {/* AI Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => onSelect("ai")}
            className="relative group text-left p-4 sm:p-6 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.03] border-white/10 hover:border-white/20 min-h-[44px] touch-manipulation"
          >
            <div className="absolute top-3 right-3">
              <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: "linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))" }}>
                Recommended
              </span>
            </div>

            <div className="w-10 h-10 rounded-xl border flex items-center justify-center mb-4" style={accent.iconBox}>
              <Sparkles className="w-5 h-5" style={accent.text} />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">AI-Powered</h3>
            <p className="text-slate-400 text-sm mb-4">
              Enter basic info and AI generates all content — descriptions, packages, menus, FAQs.
            </p>

            <div className="space-y-2 mb-4">
              {["Auto-generated descriptions", "Smart packages & pricing", "Professional FAQs", "Fully editable after"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400/70" />
                  {f}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Zap className="w-3 h-3" /> ~2 minutes
              </span>
              <span className="flex items-center gap-1 text-xs font-medium group-hover:translate-x-0.5 transition-transform" style={accent.text}>
                Get Started <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </motion.button>

          {/* Manual Card */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => onSelect("manual")}
            className="relative group text-left p-4 sm:p-6 rounded-2xl border transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] bg-white/[0.03] border-white/10 hover:border-white/20 min-h-[44px] touch-manipulation"
          >
            <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center mb-4">
              <PenTool className="w-5 h-5 text-slate-400" />
            </div>

            <h3 className="text-lg font-bold text-white mb-1">Manual Setup</h3>
            <p className="text-slate-400 text-sm mb-4">
              Build your event step by step with full control over every detail.
            </p>

            <div className="space-y-2 mb-4">
              {["Full control over content", "Upload your own images", "8-step guided wizard", "Custom pricing & dates"].map((f) => (
                <div key={f} className="flex items-center gap-2 text-xs text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  {f}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Clock className="w-3 h-3" /> ~15 minutes
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium group-hover:translate-x-0.5 transition-transform">
                Start Building <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </motion.button>
        </div>
    </div>
  );
}
