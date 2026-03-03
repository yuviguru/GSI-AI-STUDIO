/**
 * Web Audio API synthesized sound effects.
 * Zero asset files — all sounds generated programmatically.
 */

export type SoundName =
  | 'pointsEarned'
  | 'badgeUnlocked'
  | 'creationComplete'
  | 'buttonTap'
  | 'celebrate';

const MUTE_KEY = 'gsi-sound-muted';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }

  // Resume if suspended (Safari requires user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  return ctx;
}

export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === 'true';
}

export function setMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MUTE_KEY, String(muted));
}

// ── Sound synthesizers ──────────────────────────────────────────

function playPointsEarned(ac: AudioContext) {
  const now = ac.currentTime;

  // Note 1: C5 (523 Hz)
  const osc1 = ac.createOscillator();
  const gain1 = ac.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = 523;
  osc1.connect(gain1);
  gain1.connect(ac.destination);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.3, now + 0.01);
  gain1.gain.linearRampToValueAtTime(0, now + 0.1);
  osc1.start(now);
  osc1.stop(now + 0.12);

  // Note 2: E5 (659 Hz)
  const osc2 = ac.createOscillator();
  const gain2 = ac.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = 659;
  osc2.connect(gain2);
  gain2.connect(ac.destination);
  gain2.gain.setValueAtTime(0, now + 0.07);
  gain2.gain.linearRampToValueAtTime(0.3, now + 0.08);
  gain2.gain.linearRampToValueAtTime(0, now + 0.2);
  osc2.start(now + 0.07);
  osc2.stop(now + 0.22);
}

function playBadgeUnlocked(ac: AudioContext) {
  const now = ac.currentTime;
  const notes = [523, 659, 784]; // C5, E5, G5

  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ac.destination);

    const start = now + i * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.01);
    gain.gain.linearRampToValueAtTime(i === 2 ? 0.2 : 0, start + (i === 2 ? 0.15 : 0.12));

    if (i === 2) {
      // Sustain final note
      gain.gain.linearRampToValueAtTime(0, start + 0.35);
    }

    osc.start(start);
    osc.stop(start + 0.4);
  });
}

function playCreationComplete(ac: AudioContext) {
  const now = ac.currentTime;

  // Sine sweep 800 → 1200 Hz
  const osc1 = ac.createOscillator();
  const gain1 = ac.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(800, now);
  osc1.frequency.linearRampToValueAtTime(1200, now + 0.3);
  osc1.connect(gain1);
  gain1.connect(ac.destination);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.25, now + 0.02);
  gain1.gain.linearRampToValueAtTime(0, now + 0.4);
  osc1.start(now);
  osc1.stop(now + 0.42);

  // Triangle harmonic at half amplitude
  const osc2 = ac.createOscillator();
  const gain2 = ac.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(800, now);
  osc2.frequency.linearRampToValueAtTime(1200, now + 0.3);
  osc2.connect(gain2);
  gain2.connect(ac.destination);
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.12, now + 0.02);
  gain2.gain.linearRampToValueAtTime(0, now + 0.4);
  osc2.start(now);
  osc2.stop(now + 0.42);
}

function playButtonTap(ac: AudioContext) {
  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880; // A5
  osc.connect(gain);
  gain.connect(ac.destination);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.005);
  gain.gain.linearRampToValueAtTime(0, now + 0.04);
  osc.start(now);
  osc.stop(now + 0.05);
}

function playCelebrate(ac: AudioContext) {
  const now = ac.currentTime;

  // C major chord (C5, E5, G5) sustained
  const chordFreqs = [523, 659, 784];
  chordFreqs.forEach((freq) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ac.destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.linearRampToValueAtTime(0, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.55);

    // Triangle layer
    const osc2 = ac.createOscillator();
    const gain2 = ac.createGain();
    osc2.type = 'triangle';
    osc2.frequency.value = freq;
    osc2.connect(gain2);
    gain2.connect(ac.destination);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.02);
    gain2.gain.linearRampToValueAtTime(0, now + 0.5);
    osc2.start(now);
    osc2.stop(now + 0.55);
  });

  // Ascending scale: C5 D5 E5 F5 G5
  const scaleFreqs = [523, 587, 659, 698, 784];
  scaleFreqs.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ac.destination);
    const t = now + i * 0.06;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
    gain.gain.linearRampToValueAtTime(0, t + 0.08);
    osc.start(t);
    osc.stop(t + 0.1);
  });
}

const SOUND_MAP: Record<SoundName, (ac: AudioContext) => void> = {
  pointsEarned: playPointsEarned,
  badgeUnlocked: playBadgeUnlocked,
  creationComplete: playCreationComplete,
  buttonTap: playButtonTap,
  celebrate: playCelebrate,
};

export function playSound(name: SoundName): void {
  if (isMuted()) return;

  const ac = getContext();
  if (!ac) return;

  try {
    SOUND_MAP[name](ac);
  } catch {
    // Silently fail — sounds are non-critical
  }
}
