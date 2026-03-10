/**
 * Play a short two-tone notification sound using Web Audio API.
 * Call after a user gesture when possible so it can play when tab is in background.
 */
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioContext) return audioContext;
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioContext;
  } catch {
    return null;
  }
}

export function playNotificationSound(): void {
  if (typeof window === "undefined") return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const t = ctx.currentTime;
    playTone(523.25, t, 0.12);
    playTone(659.25, t + 0.14, 0.2);
  } catch {
    // Ignore errors (e.g. suspended context)
  }
}

/**
 * Resume AudioContext if suspended (browsers require user gesture).
 * Call this on first user interaction (e.g. click) so later sounds can play in background.
 */
export function unlockAudio(): void {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}
