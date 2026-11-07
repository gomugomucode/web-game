import { GameSettings, DEFAULT_SETTINGS } from '../saveSystem';

/**
 * Procedural Web Audio API Sound System (Milestone 12)
 * Zero external audio files or dependencies.
 * All sound effects and water ambience are synthesized mathematically.
 * Concurrency-capped and allocation-free in useFrame loops.
 */
class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;

  // Water Ambience Loop Nodes
  private waterNoiseSource: AudioBufferSourceNode | null = null;
  private waterFilter: BiquadFilterNode | null = null;
  private waterGain: GainNode | null = null;
  private isAmbienceRunning = false;

  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private activeVoicesCount = 0;
  private readonly MAX_CONCURRENT_VOICES = 10;

  constructor() {
    // Initialized lazily on first user gesture
  }

  /**
   * Initializes or resumes the AudioContext upon user gesture
   */
  public init(settings?: GameSettings): void {
    if (settings) {
      this.settings = { ...settings };
    }

    if (typeof window === 'undefined') return;

    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.ctx = new AudioCtxClass();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      // Music bus (placeholder hook for future music)
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.masterGain);

      // Ambience bus
      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.connect(this.masterGain);

      this.applyGains();
      this.startWaterAmbienceLoop();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSettings(settings: GameSettings): void {
    this.settings = { ...settings };
    this.applyGains();
  }

  private applyGains(): void {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.musicGain || !this.ambienceGain) {
      return;
    }
    const t = this.ctx.currentTime;
    const masterVal = this.settings.muted ? 0 : this.settings.masterVolume;
    this.masterGain.gain.setTargetAtTime(masterVal, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.settings.sfxVolume, t, 0.05);
    this.musicGain.gain.setTargetAtTime(this.settings.musicVolume, t, 0.05);
    this.ambienceGain.gain.setTargetAtTime(this.settings.sfxVolume * 0.65, t, 0.05);
  }

  /**
   * Creates a looping procedural filtered noise generator for water ambience.
   * Modulated in real-time by otter swimming speed and current state.
   */
  private startWaterAmbienceLoop(): void {
    if (!this.ctx || !this.ambienceGain || this.isAmbienceRunning) return;

    try {
      const sampleRate = this.ctx.sampleRate;
      const bufferLength = sampleRate * 2; // 2-second looping noise buffer
      const buffer = this.ctx.createBuffer(1, bufferLength, sampleRate);
      const data = buffer.getChannelData(0);

      // Pink/Brownian-ish filtered noise texture
      let lastOut = 0.0;
      for (let i = 0; i < bufferLength; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        data[i] = lastOut * 3.5;
      }

      this.waterNoiseSource = this.ctx.createBufferSource();
      this.waterNoiseSource.buffer = buffer;
      this.waterNoiseSource.loop = true;

      this.waterFilter = this.ctx.createBiquadFilter();
      this.waterFilter.type = 'lowpass';
      this.waterFilter.frequency.value = 260; // Base calm water frequency

      this.waterGain = this.ctx.createGain();
      this.waterGain.gain.value = 0.08; // Quiet idle water

      this.waterNoiseSource.connect(this.waterFilter);
      this.waterFilter.connect(this.waterGain);
      this.waterGain.connect(this.ambienceGain);

      this.waterNoiseSource.start(0);
      this.isAmbienceRunning = true;
    } catch {
      // Audio context might be restricted
    }
  }

  /**
   * Zero-allocation hot path update for water ambience speed/current modulation.
   */
  public updateWaterAmbience(speed: number, inCurrent: boolean, isPaused: boolean): void {
    if (!this.ctx || !this.waterFilter || !this.waterGain || !this.isAmbienceRunning) return;
    const t = this.ctx.currentTime;

    if (isPaused) {
      this.waterGain.gain.setTargetAtTime(0, t, 0.1);
      return;
    }

    // Frequency ranges from 240Hz at standstill to ~1200Hz at full cruise/dash
    const normalizedSpeed = Math.min(1.5, Math.max(0, speed / 12.0));
    const targetFreq = 240 + normalizedSpeed * 750 + (inCurrent ? 250 : 0);
    const targetGain = 0.06 + normalizedSpeed * 0.18 + (inCurrent ? 0.06 : 0);

    this.waterFilter.frequency.setTargetAtTime(targetFreq, t, 0.08);
    this.waterGain.gain.setTargetAtTime(targetGain, t, 0.08);
  }

  private canPlayVoice(): boolean {
    if (!this.ctx) return false;
    if (this.settings.muted || this.settings.masterVolume <= 0 || this.settings.sfxVolume <= 0) {
      return false;
    }
    return this.activeVoicesCount < this.MAX_CONCURRENT_VOICES;
  }

  private registerVoice(durationSeconds: number): void {
    this.activeVoicesCount++;
    setTimeout(() => {
      this.activeVoicesCount = Math.max(0, this.activeVoicesCount - 1);
    }, durationSeconds * 1000 + 50);
  }

  // --- Procedural Sound Effects ---

  /** 1. Countdown Beeps (count 3, 2, 1) and GO! */
  public playCountdownBeep(count: number | 'GO'): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;

    if (count === 'GO') {
      // Bright tri-tone harmonic chord (880Hz, 1100Hz, 1320Hz)
      const freqs = [880, 1100, 1320];
      freqs.forEach((freq) => {
        if (!this.ctx || !this.sfxGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(t);
        osc.stop(t + 0.45);
      });
      this.registerVoice(0.45);
    } else {
      // 3, 2, 1 short focused sine tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(count === 1 ? 740 : 620, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.15);
      this.registerVoice(0.15);
    }
  }

  public playCountdownGo(): void {
    this.playCountdownBeep('GO');
  }

  /** 2. Checkpoint Gate Ring Chime */
  public playCheckpointChime(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(784, t); // G5
    osc1.frequency.exponentialRampToValueAtTime(1046.5, t + 0.12); // C6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, t + 0.05); // D6
    osc2.frequency.exponentialRampToValueAtTime(1567.98, t + 0.25); // G6

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t + 0.05);
    osc1.stop(t + 0.4);
    osc2.stop(t + 0.4);

    this.registerVoice(0.4);
  }

  /** 3. Dash Impulse Whoosh */
  public playDashWhoosh(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;

    // Filtered noise sweep
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 3.0;
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(1800, t + 0.2);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.38);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.4);

    this.registerVoice(0.4);
  }

  /** 4. Hazard Rock Contact Thud */
  public playRockThud(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.16);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.2);

    this.registerVoice(0.2);
  }

  /** 5. Current Entry Shimmer */
  public playCurrentShimmer(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;
    const notes = [1046.5, 1318.5, 1567.98]; // C6, E6, G6
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startT = t + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startT);

      gain.gain.setValueAtTime(0.12, startT);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(startT);
      osc.stop(startT + 0.24);
    });

    this.registerVoice(0.35);
  }

  /** 6. Finish Line Fanfare */
  public playFinishFanfare(rank: number = 1): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;
    const chord = rank === 1 ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25]; // C major vs A major
    chord.forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteT = t + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteT);

      gain.gain.setValueAtTime(0.25, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.85);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(noteT);
      osc.stop(noteT + 0.9);
    });

    this.registerVoice(1.0);
  }

  /** 7. UI Click Pop */
  public playUiClick(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.025);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.035);

    this.registerVoice(0.035);
  }

  /** 8. Soft Dialogue Syllable Blip */
  public playDialogueBlip(): void {
    this.init();
    if (!this.ctx || !this.sfxGain || !this.canPlayVoice()) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Friendly animal chirp
    const startFreq = 480 + Math.random() * 80;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.25, t + 0.04);

    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.05);

    this.registerVoice(0.05);
  }

  /**
   * Clean hook for future background music
   */
  public playMusic(_trackName?: string): void {
    void _trackName;
    // Clean hook for music later per Requirement 3; no music added now
  }

  public stopMusic(): void {
    // Clean hook for music stop
  }
}

export const soundManager = new SoundManager();
