"use client";

// Efek suara prosedural via Web Audio API — tanpa file asset.
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}

export function isMuted() {
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.15, when = 0) {
  const a = ac();
  if (!a || muted) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(gain, a.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
  o.connect(g).connect(a.destination);
  o.start(a.currentTime + when);
  o.stop(a.currentTime + when + dur + 0.05);
}

function noise(dur: number, gain = 0.1, when = 0) {
  const a = ac();
  if (!a || muted) return;
  const len = a.sampleRate * dur;
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  const g = a.createGain();
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(g).connect(a.destination);
  src.start(a.currentTime + when);
}

export const sfx = {
  dice: () => {
    noise(0.08, 0.12);
    noise(0.08, 0.1, 0.1);
    noise(0.12, 0.08, 0.22);
  },
  step: () => tone(420, 0.07, "triangle", 0.08),
  buy: () => {
    tone(523, 0.12, "triangle", 0.12);
    tone(659, 0.12, "triangle", 0.12, 0.1);
    tone(784, 0.2, "triangle", 0.14, 0.2);
  },
  cash: () => {
    tone(880, 0.06, "square", 0.06);
    tone(1175, 0.08, "square", 0.06, 0.06);
  },
  pay: () => {
    tone(330, 0.15, "sawtooth", 0.07);
    tone(247, 0.2, "sawtooth", 0.07, 0.12);
  },
  card: () => tone(660, 0.1, "sine", 0.1),
  jail: () => {
    tone(196, 0.3, "sawtooth", 0.12);
    tone(185, 0.4, "sawtooth", 0.12, 0.25);
  },
  quiz: () => {
    tone(523, 0.1, "sine", 0.1);
    tone(698, 0.1, "sine", 0.1, 0.12);
  },
  correct: () => {
    tone(659, 0.1, "triangle", 0.12);
    tone(784, 0.1, "triangle", 0.12, 0.1);
    tone(1047, 0.25, "triangle", 0.14, 0.2);
  },
  wrong: () => {
    tone(220, 0.25, "square", 0.08);
    tone(196, 0.35, "square", 0.08, 0.2);
  },
  auction: () => {
    tone(440, 0.08, "square", 0.08);
    tone(554, 0.08, "square", 0.08, 0.09);
  },
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, "triangle", 0.12, i * 0.12));
  },
  event: () => {
    tone(587, 0.12, "sine", 0.1);
    tone(740, 0.12, "sine", 0.1, 0.1);
    tone(880, 0.18, "sine", 0.12, 0.2);
  },
  turn: () => tone(784, 0.12, "sine", 0.12),
};
