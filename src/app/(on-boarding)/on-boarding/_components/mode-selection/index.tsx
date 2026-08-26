"use client";

import React, { useContext, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import {
  PenTool,
  Clock,
  Zap,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ServerContext } from "@/lib/server-context";

interface ModeSelectionProps {
  onSelectMode: (mode: "ai" | "manual") => void;
}

const accent = {
  badge: {
    background: `linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
  } as React.CSSProperties,
  badgeBg: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)`,
  } as React.CSSProperties,
  cardBorder: {
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)`,
  } as React.CSSProperties,
  iconBox: {
    backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)`,
    borderColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 20%, transparent)`,
  } as React.CSSProperties,
  text: { color: `var(--color-primary, #3b82f6)` } as React.CSSProperties,
  gradient: {
    background: `linear-gradient(to right, var(--color-primary, #3b82f6), var(--color-secondary, #8b5cf6))`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  } as React.CSSProperties,
};

export default function ModeSelection({ onSelectMode }: ModeSelectionProps) {
  const { theme } = useContext(ServerContext);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const logoPath =
    theme?.logo?.startsWith("/") ||
    theme?.logo?.startsWith("data:") ||
    theme?.logo?.startsWith("http") ||
    theme?.logo?.startsWith("https") ||
    theme?.logo?.startsWith("blob")
      ? theme.logo
      : "/assets/images/logos/eventwizz-logo.png";
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background effects - uses theme colors */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl animate-pulse"
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-primary, #3b82f6) 10%, transparent)`,
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl animate-pulse delay-1000"
          style={{
            backgroundColor: `color-mix(in srgb, var(--color-secondary, #8b5cf6) 10%, transparent)`,
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-5xl px-6">
        {/* Header with Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* EventWizz Logo — use logoPath as-is to avoid hydration mismatch (addCacheBusting uses Date.now()) */}
          <div className="flex justify-center mb-6">
            <img
              src={logoPath}
              alt="EventWizz"
              className="h-10 w-auto object-contain [filter:drop-shadow(0_0_1px_white)_drop-shadow(0_0_6px_rgba(255,255,255,0.65))_drop-shadow(0_0_14px_rgba(255,255,255,0.35))]"
            />
          </div>

          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm border mb-6"
            style={accent.badgeBg}
          >
            <Sparkles className="w-3.5 h-3.5" style={accent.text} />
            <span
              className="text-xs font-medium tracking-wide uppercase"
              style={accent.text}
            >
              Welcome to EventWizz
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            How would you like to{" "}
            <span style={accent.gradient}>build your site?</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            AI writes a first draft in about 5 minutes. You then review every
            section before publishing. You can always switch to full manual
            control.
          </p>

          <div className="mt-8 mx-auto grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { n: "1", label: "Choose setup" },
              { n: "2", label: "Tell us about your venue" },
              { n: "3", label: "Review the draft" },
            ].map((step, index) => {
              const isCurrent = index === 0;
              return (
                <div
                  key={step.n}
                  className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
                    isCurrent
                      ? "border-white/20 bg-white/[0.07] text-white"
                      : "border-white/10 bg-white/[0.03] text-slate-500"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                      isCurrent ? "text-white" : "border border-white/15 text-slate-500"
                    }`}
                    style={isCurrent ? accent.badge : undefined}
                  >
                    {step.n}
                  </span>
                  {step.label}
                </div>
              );
            })}
          </div>

          {/* How it works — expandable extra detail */}
          <div className="mt-5 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              <Info className="w-4 h-4" style={accent.text} />
              How each option works — what AI creates vs Manual
              {showHowItWorks ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
            <AnimatePresence>
              {showHowItWorks && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-5 rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-sm space-y-5 text-left">
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                        <Sparkles className="w-4 h-4" style={accent.text} />
                        AI-Powered Setup
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        You tell us your venue (search on Google and select from
                        suggestions), venue type, contact details, and optional
                        description. Our AI then generates your full site:
                        landing page text, event name and schedule, packages,
                        dates, catering menu, other packages, brochure content,
                        FAQs, and placeholder images. You review and edit
                        anything you like, then set your domain and connect
                        payment (Stripe/PayPal etc.). Best if you want a
                        professional site in about 5 minutes. You’ll then review
                        every section before publishing.
                      </p>
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
                        <PenTool className="w-4 h-4 text-slate-400" />
                        Manual Setup
                      </h3>
                      <p className="text-slate-400 text-sm leading-relaxed">
                        You go through all 11 steps yourself: venue details
                        (select from Google), site branding (logo, banner image,
                        colours), event details, packages, dates, catering,
                        other packages, brochure &amp; PDFs, FAQs, domain, and
                        payment. You type or upload everything. Best if you want
                        full control and already have all content and assets
                        ready (~30 minutes).
                      </p>
                    </div>
                    <p className="text-slate-500 text-xs border-t border-white/5 pt-3">
                      Both options produce a fully functional event website. You
                      can edit everything anytime from your dashboard.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* AI Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <button
              onClick={() => onSelectMode("ai")}
              className="group relative w-full text-left rounded-2xl border bg-gradient-to-br from-white/[0.06] via-slate-900/80 to-white/[0.04] backdrop-blur-xl p-8 transition-all duration-500 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-white/20"
              style={accent.cardBorder}
            >
              <div className="absolute -top-3 left-6">
                <span
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-semibold shadow-lg"
                  style={accent.badge}
                >
                  <Zap className="w-3 h-3" />
                  RECOMMENDED
                </span>
              </div>

              <div
                className="w-14 h-14 rounded-xl border flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                style={accent.iconBox}
              >
                <Sparkles className="w-7 h-7" style={accent.text} />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                AI-Powered Setup
              </h2>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                AI writes a first draft in about 5 minutes. Professional copy,
                smart defaults, and placeholder images — then you review every
                section before publishing.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "AI-generated content & descriptions",
                  "Smart placeholder images included",
                  "Professional copy for all sections",
                  "Fully editable after generation",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={accent.text}
                    />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">~5 minutes</span>
                </div>
                <div
                  className="flex items-center gap-1.5 font-medium text-sm group-hover:gap-3 transition-all duration-300"
                  style={accent.text}
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </motion.div>

          {/* Manual Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button
              onClick={() => onSelectMode("manual")}
              className="group relative w-full text-left rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-8 transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_40px_-15px_rgba(148,163,184,0.15)] hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-500/50"
            >
              <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 mt-3">
                <PenTool className="w-7 h-7 text-slate-400" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Manual Setup
              </h2>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                Build your site step by step with complete control over every
                detail. Perfect for venues with specific branding requirements.
              </p>

              <div className="space-y-3 mb-8">
                {[
                  "Full control over every detail",
                  "Step-by-step guided wizard",
                  "Upload your own images & assets",
                  "11-step comprehensive setup",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="text-sm text-slate-300">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">~30 minutes</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-400 font-medium text-sm group-hover:gap-3 transition-all duration-300">
                  Start Building
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-slate-600 text-xs mt-8"
        >
          Both options create a fully functional event website. You can edit
          everything anytime from your dashboard.
        </motion.p>
      </div>
    </div>
  );
}
