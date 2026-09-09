/**
 * lib/sound.ts — Minimal auditory feedback using the Web Audio API.
 * No external dependencies. Works in all modern browsers.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, volume = 0.15, type: OscillatorType = 'sine') {
  const ctx = getAudioContext();
  if (!ctx) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.frequency.value = frequency;
  oscillator.type = type;
  gainNode.gain.value = volume;
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + duration);
}

/** Short click / beep — played when a chip or button is tapped. */
export function playBeep() {
  playTone(880, 0.08, 0.1, 'sine');
}

/** Start recording sound — two-tone ascending cue. */
export function playRecordStart() {
  playTone(660, 0.12, 0.1);
  setTimeout(() => playTone(880, 0.12, 0.1), 100);
}

/** Stop recording sound — descending cue. */
export function playRecordStop() {
  playTone(880, 0.1, 0.1);
  setTimeout(() => playTone(660, 0.1, 0.1), 80);
}

/** Success chime — played on section completion or interview completion. */
export function playSuccess() {
  playTone(523, 0.15, 0.12); // C5
  setTimeout(() => playTone(659, 0.15, 0.12), 120); // E5
  setTimeout(() => playTone(784, 0.3, 0.12), 240); // G5
}

/** Alert sound — played when a red flag is detected. */
export function playAlert() {
  playTone(440, 0.1, 0.15, 'square');
  setTimeout(() => playTone(440, 0.1, 0.15, 'square'), 200);
}
