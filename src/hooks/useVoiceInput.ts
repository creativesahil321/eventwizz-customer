"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionInstance;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}
interface SpeechResultEvent {
  readonly results: {
    readonly length: number;
    readonly isFinal: boolean;
    readonly [index: number]: { readonly transcript: string };
  }[];
}
type ExtendedWindow = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

export type VoiceState = "idle" | "listening" | "unsupported" | "error";

/**
 * Hook for browser speech-to-text (Web Speech API).
 * Use for description/textarea fields in onboarding and AI event creation.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const isSupported =
    typeof window !== "undefined" &&
    !!(
      (window as ExtendedWindow).SpeechRecognition ||
      (window as ExtendedWindow).webkitSpeechRecognition
    );

  const start = useCallback(() => {
    if (!isSupported) {
      setVoiceState("unsupported");
      return;
    }

    const Ctor =
      (window as ExtendedWindow).SpeechRecognition ||
      (window as ExtendedWindow).webkitSpeechRecognition;
    if (!Ctor) return;

    recognitionRef.current?.abort();

    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-GB";

    rec.onstart = () => {
      setVoiceState("listening");
      setInterimText("");
    };

    rec.onresult = (event: SpeechResultEvent) => {
      let finalText = "";
      let liveText = "";
      for (let i = 0; i < event.results.length; i++) {
        const segment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += (finalText ? " " : "") + segment.trim();
        } else {
          liveText += segment;
        }
      }
      setInterimText(liveText);
      const display = liveText
        ? finalText + (finalText ? " " : "") + liveText
        : finalText;
      onTranscriptRef.current(display);
    };

    rec.onerror = (event: { error: string }) => {
      if (event.error !== "aborted") setVoiceState("error");
    };

    rec.onend = () => {
      setInterimText("");
      setVoiceState("idle");
    };

    recognitionRef.current = rec;
    rec.start();
  }, [isSupported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (voiceState === "listening") stop();
    else start();
  }, [voiceState, start, stop]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    []
  );

  return { voiceState, interimText, toggle, isSupported };
}
