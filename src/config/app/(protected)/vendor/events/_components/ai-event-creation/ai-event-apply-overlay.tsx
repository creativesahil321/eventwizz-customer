"use client";

import type { CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, CheckCircle2 } from "lucide-react";
import { AI_EVENT_APPLY_STEPS } from "../../_lib/apply-ai-generated-event";

const accent = {
  text: { color: "var(--color-primary, #3b82f6)" } as CSSProperties,
  loaderBox: {
    backgroundColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent)",
    borderColor: "color-mix(in srgb, var(--color-primary, #3b82f6) 30%, transparent)",
  } as CSSProperties,
};

interface AIEventApplyOverlayProps {
  applyStep: number;
  applyDone: boolean;
}

export function AIEventApplyOverlay({ applyStep, applyDone }: AIEventApplyOverlayProps) {
  const totalSteps = AI_EVENT_APPLY_STEPS.length;
  const progressPct =
    applyStep < 0 ? 0 : Math.min(Math.round(((applyStep + 1) / totalSteps) * 100), 100);

  return (
    <div className="relative z-10 flex items-center justify-center min-h-screen w-full px-3 py-6 sm:px-4 overflow-y-auto">
      <div className="w-full max-w-sm mx-auto">
        <AnimatePresence mode="wait">
          {applyDone ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="flex flex-col items-center text-center gap-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
              >
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold text-white">Event created</h2>
                <p className="text-sm text-slate-400 mt-2">
                  Redirecting to your event preview…
                </p>
              </div>
              <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-green-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.2, ease: "linear" }}
                />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
            >
              <div className="text-center mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4"
                  style={accent.loaderBox}
                >
                  <Loader2 className="w-7 h-7" style={accent.text} />
                </motion.div>
                <h2 className="text-xl font-bold text-white">Building your event</h2>
                <p className="text-slate-500 text-xs mt-1">
                  Please do not close this page
                </p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-slate-500">Progress</span>
                  <span className="text-xs font-semibold" style={accent.text}>
                    {progressPct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--color-primary, #3b82f6)" }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {AI_EVENT_APPLY_STEPS.map((step, idx) => {
                  const isDone = idx < applyStep;
                  const isActive = idx === applyStep;
                  const isPending = idx > applyStep;
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: isPending ? 0.35 : 1, x: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                        isActive ? "bg-white/[0.06] border border-white/10" : "bg-transparent"
                      }`}
                    >
                      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                        {isDone ? (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "rgba(34,197,94,0.15)" }}
                          >
                            <Check className="w-3 h-3 text-green-400" />
                          </motion.div>
                        ) : isActive ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-4 h-4" style={accent.text} />
                          </motion.div>
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-white/15" />
                        )}
                      </div>
                      <span className="text-sm mr-1">{step.icon}</span>
                      <span
                        className={`text-sm font-medium ${
                          isDone ? "text-slate-400" : isActive ? "text-white" : "text-slate-600"
                        }`}
                      >
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
