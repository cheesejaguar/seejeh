/**
 * Sound system for Seejeh game using Web Audio API
 * Generates pleasant procedural sounds for game events
 */

export type SoundType = 
  | 'place' 
  | 'capture' 
  | 'select' 
  | 'move' 
  | 'invalid' 
  | 'win' 
  | 'newGame'
  | 'chainCapture';

class SoundSystem {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.3;

  constructor() {
    // Initialize audio context on user interaction
    this.initializeAudioContext();
  }

  private initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  private async ensureAudioContext() {
    if (!this.audioContext) {
      this.initializeAudioContext();
    }

    if (this.audioContext?.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }

    return this.audioContext;
  }

  /**
   * Create an oscillator with specific frequency and type
   */
  private createOscillator(frequency: number, type: OscillatorType = 'sine'): OscillatorNode | null {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    return oscillator;
  }

  /**
   * Create a gain node for volume control
   */
  private createGain(): GainNode | null {
    if (!this.audioContext) return null;

    const gainNode = this.audioContext.createGain();
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    return gainNode;
  }

  /**
   * Play a stone placement sound - warm, satisfying click
   */
  private async playPlaceSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    // Main tone - warm wooden sound
    const osc1 = this.createOscillator(800, 'triangle');
    const osc2 = this.createOscillator(1200, 'sine');
    const gain = this.createGain();

    if (!osc1 || !osc2 || !gain) return;

    // Connect nodes
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(context.destination);

    // Envelope - quick attack, short decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Frequency sweep for wooden character
    osc1.frequency.exponentialRampToValueAtTime(600, now + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(900, now + 0.1);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  /**
   * Play a capture sound - dramatic, satisfying
   */
  private async playCaptureSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    // Dramatic swoosh with harmonic content
    const osc1 = this.createOscillator(400, 'sawtooth');
    const osc2 = this.createOscillator(600, 'triangle');
    const osc3 = this.createOscillator(150, 'sine');
    const gain = this.createGain();

    if (!osc1 || !osc2 || !osc3 || !gain) return;

    // Connect with different volumes
    const gain1 = this.createGain();
    const gain2 = this.createGain();
    const gain3 = this.createGain();

    if (!gain1 || !gain2 || !gain3) return;

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);
    gain1.connect(gain);
    gain2.connect(gain);
    gain3.connect(gain);
    gain.connect(context.destination);

    // Volume envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.6, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    // Individual gains
    gain1.gain.setValueAtTime(0.5, now);
    gain2.gain.setValueAtTime(0.3, now);
    gain3.gain.setValueAtTime(0.2, now);

    // Frequency sweeps for dramatic effect
    osc1.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    osc2.frequency.exponentialRampToValueAtTime(300, now + 0.3);
    osc3.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
    osc3.stop(now + 0.4);
  }

  /**
   * Play a chain capture sound - building excitement
   */
  private async playChainCaptureSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    // Rising sequence for building excitement
    const osc1 = this.createOscillator(500, 'triangle');
    const osc2 = this.createOscillator(750, 'sine');
    const gain = this.createGain();

    if (!osc1 || !osc2 || !gain) return;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(context.destination);

    // Quick, bright sound
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // Rising pitch
    osc1.frequency.exponentialRampToValueAtTime(800, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);
  }

  /**
   * Play a selection sound - gentle feedback
   */
  private async playSelectSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    const osc = this.createOscillator(1000, 'sine');
    const gain = this.createGain();

    if (!osc || !gain) return;

    osc.connect(gain);
    gain.connect(context.destination);

    // Gentle, brief tone
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Play a move sound - smooth transition
   */
  private async playMoveSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    const osc = this.createOscillator(600, 'triangle');
    const gain = this.createGain();

    if (!osc || !gain) return;

    osc.connect(gain);
    gain.connect(context.destination);

    // Smooth sliding sound
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // Gentle frequency slide
    osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Play an invalid move sound - gentle negative feedback
   */
  private async playInvalidSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    const osc = this.createOscillator(300, 'triangle');
    const gain = this.createGain();

    if (!osc || !gain) return;

    osc.connect(gain);
    gain.connect(context.destination);

    // Low, brief negative feedback
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Slight downward pitch for negative feel
    osc.frequency.exponentialRampToValueAtTime(250, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  /**
   * Play a win sound - triumphant
   */
  private async playWinSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    // Triumphant chord progression
    const frequencies = [523, 659, 784, 1047]; // C major chord
    const oscillators: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    for (let i = 0; i < frequencies.length; i++) {
      const osc = this.createOscillator(frequencies[i], 'triangle');
      const gain = this.createGain();
      
      if (!osc || !gain) continue;

      oscillators.push(osc);
      gains.push(gain);

      osc.connect(gain);
      gain.connect(context.destination);

      // Staggered attack for fuller sound
      const attackTime = now + (i * 0.05);
      gain.gain.setValueAtTime(0, attackTime);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, attackTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, attackTime + 1.0);

      osc.start(attackTime);
      osc.stop(attackTime + 1.0);
    }
  }

  /**
   * Play a new game sound - fresh start
   */
  private async playNewGameSound() {
    const context = await this.ensureAudioContext();
    if (!context || !this.enabled) return;

    const now = context.currentTime;
    
    // Bright, optimistic ascending tone
    const osc = this.createOscillator(440, 'sine');
    const gain = this.createGain();

    if (!osc || !gain) return;

    osc.connect(gain);
    gain.connect(context.destination);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    // Rising pitch for optimism
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  /**
   * Play a sound based on the sound type
   */
  async play(soundType: SoundType) {
    try {
      switch (soundType) {
        case 'place':
          await this.playPlaceSound();
          break;
        case 'capture':
          await this.playCaptureSound();
          break;
        case 'chainCapture':
          await this.playChainCaptureSound();
          break;
        case 'select':
          await this.playSelectSound();
          break;
        case 'move':
          await this.playMoveSound();
          break;
        case 'invalid':
          await this.playInvalidSound();
          break;
        case 'win':
          await this.playWinSound();
          break;
        case 'newGame':
          await this.playNewGameSound();
          break;
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Enable or disable sound effects
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }
}

// Create singleton instance
export const soundSystem = new SoundSystem();