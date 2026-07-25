// FILE: src/lib/sound.ts
//
// Small synthesised sound set. No audio assets, no network, and the
// AudioContext is created lazily on the first real gesture so browsers never
// log an autoplay warning.
//
// The palette is percussive and dry — stone on packed earth, not UI chimes.

export type SoundName =
  | 'place'
  | 'move'
  | 'capture'
  | 'chain'
  | 'select'
  | 'invalid'
  | 'win'
  | 'lose'
  | 'start';

interface Voice {
  /** Base frequency in Hz. */
  freq: number;
  /** Frequency at the end of the sweep; equal to `freq` for no sweep. */
  endFreq: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  /** Amount of filtered noise mixed in, 0–1: the "grit" of stone on soil. */
  noise: number;
}

const VOICES: Record<SoundName, Voice> = {
  place: { freq: 210, endFreq: 120, duration: 0.13, type: 'triangle', gain: 0.5, noise: 0.5 },
  move: { freq: 320, endFreq: 250, duration: 0.09, type: 'sine', gain: 0.32, noise: 0.28 },
  capture: { freq: 170, endFreq: 62, duration: 0.3, type: 'sawtooth', gain: 0.42, noise: 0.65 },
  chain: { freq: 420, endFreq: 660, duration: 0.19, type: 'triangle', gain: 0.4, noise: 0.2 },
  select: { freq: 540, endFreq: 540, duration: 0.05, type: 'sine', gain: 0.2, noise: 0.1 },
  invalid: { freq: 150, endFreq: 96, duration: 0.16, type: 'square', gain: 0.24, noise: 0.15 },
  win: { freq: 392, endFreq: 784, duration: 0.55, type: 'triangle', gain: 0.4, noise: 0.06 },
  lose: { freq: 300, endFreq: 110, duration: 0.6, type: 'triangle', gain: 0.36, noise: 0.12 },
  start: { freq: 260, endFreq: 392, duration: 0.28, type: 'sine', gain: 0.32, noise: 0.1 },
};

class SoundSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private enabled = true;
  private volume = 0.5;
  private failed = false;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.min(1, Math.max(0, volume));
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  private ensure(): AudioContext | null {
    if (this.failed || !this.enabled) return null;
    if (this.ctx) {
      // Browsers suspend the context until a gesture; resume opportunistically.
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    }

    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        this.failed = true;
        return null;
      }
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.master.connect(this.ctx.destination);

      // One second of white noise, reused for every grainy sound.
      const frames = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

      return this.ctx;
    } catch {
      this.failed = true;
      return null;
    }
  }

  play(name: SoundName): void {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;

    const voice = VOICES[name];
    if (!voice) return;

    try {
      const now = ctx.currentTime;
      const end = now + voice.duration;

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(voice.gain, now + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, end);
      envelope.connect(this.master);

      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.freq, now);
      if (voice.endFreq !== voice.freq) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, voice.endFreq), end);
      }
      osc.connect(envelope);
      osc.start(now);
      osc.stop(end);

      if (voice.noise > 0 && this.noiseBuffer) {
        const source = ctx.createBufferSource();
        source.buffer = this.noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(voice.freq * 3, now);
        filter.Q.setValueAtTime(0.8, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, now);
        noiseGain.gain.linearRampToValueAtTime(voice.gain * voice.noise, now + 0.006);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, end);

        source.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.master);
        source.start(now);
        source.stop(end);
      }
    } catch {
      /* a failed sound must never interrupt play */
    }
  }
}

export const sound = new SoundSystem();
