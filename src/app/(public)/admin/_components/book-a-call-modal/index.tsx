"use client";

import React, { useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Loader2, CheckCircle2, Calendar } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";

interface BookACallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookACallModal({ isOpen, onClose }: BookACallModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  /** Element focused before opening — focus returns here on close (no Radix trigger). */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setFormData({ name: "", email: "", phone: "", message: "" });
      onClose();
    }, 2500);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            returnFocusRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocusRef.current?.focus();
            returnFocusRef.current = null;
          }}
          className="fixed left-1/2 top-1/2 z-[101] w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overflow-x-hidden bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5 focus:outline-none">
        {/* Header with accent bar — always dark text on white */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary)]/80 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-xl font-bold text-white">
                  Book a Call
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-sm text-white/90 mt-0.5">
                  We&apos;ll get back to you soon.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close"
                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </DialogClose>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-10 flex flex-col items-center text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Message sent!</h3>
            <p className="text-sm text-gray-500 mt-1">
              We&apos;ll get back to you shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-900 font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-900 font-medium">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-900 font-medium">
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+44 (0) 7700 900000"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                className="bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message" className="text-gray-900 font-medium">
                Message
              </Label>
              <textarea
                id="message"
                rows={3}
                placeholder="Tell us about your event..."
                className="flex w-full rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/30 focus-visible:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="event-primary"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </form>
        )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
