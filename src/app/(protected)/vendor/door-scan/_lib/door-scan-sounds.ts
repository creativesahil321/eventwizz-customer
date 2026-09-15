type DoorScanSound = "found" | "success" | "error";

type AudioContextCtor = typeof AudioContext;

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  delaySeconds = 0,
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + delaySeconds;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

/** Call from a click/tap so the browser allows sound later (live camera scans). */
export function unlockDoorScanAudio() {
  getAudioContext();
}

export function playDoorScanSound(kind: DoorScanSound) {
  try {
    if (kind === "error") {
      playTone(240, 0.16, "square", 0.07);
      playTone(175, 0.2, "square", 0.07, 0.11);
      return;
    }
    if (kind === "found") {
      playTone(880, 0.09, "sine", 0.055);
      return;
    }
    playTone(523.25, 0.09, "sine", 0.06);
    playTone(659.25, 0.11, "sine", 0.06, 0.09);
    playTone(783.99, 0.16, "sine", 0.06, 0.18);
  } catch {
    // Autoplay policies or missing AudioContext must not break scan.
  }
}
