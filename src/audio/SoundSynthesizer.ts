// Procedural Web Audio API Synthesizer & Synthwave Music Generator
// Complies with FR-11 and T15 (Zero external audio assets)

export type MusicTheme = 'OFF' | 'STAGE1' | 'STAGE2' | 'BOSS';

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;

  private isMuted: boolean = false;
  private masterVol: number = 0.8;
  private sfxVol: number = 0.85;
  private bgmVol: number = 0.45;

  // Music sequencer state
  private currentTheme: MusicTheme = 'OFF';
  private sequencerTimer: number | null = null;
  private currentStep: number = 0;
  private bpm: number = 124;
  private nextNoteTime: number = 0;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser autoplay policies
  }

  public initAudioContext(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      if (this.ctx.state === 'suspended') {
        const resumeOnEvent = () => {
          this.ctx?.resume();
          window.removeEventListener('keydown', resumeOnEvent);
          window.removeEventListener('pointerdown', resumeOnEvent);
        };
        window.addEventListener('keydown', resumeOnEvent, { once: true });
        window.addEventListener('pointerdown', resumeOnEvent, { once: true });
      }
    } catch (e) {
      console.warn('Web Audio initialization failed:', e);
    }
  }

  // --- Volume & Mute Controls ---
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVol, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMasterVolume(val: number): void {
    this.masterVol = Math.max(0, Math.min(1, val));
    if (!this.isMuted && this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(val: number): void {
    this.sfxVol = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    }
  }

  public setBgmVolume(val: number): void {
    this.bgmVol = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
    }
  }

  public getBgmVolume(): number {
    return this.bgmVol;
  }

  public getSfxVolume(): number {
    return this.sfxVol;
  }

  // --- Sound Effects (Procedural Synthesizer) ---

  /** Primary Laser Shot (Dual Blaster) */
  public playLaser(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  /** Hit Impact */
  public playImpact(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Noise burst for crisp impact
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
  }

  /** Procedural Explosion */
  public playExplosion(magnitude: number = 1.0): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;
    const duration = 0.2 + 0.3 * Math.min(magnitude, 3.0);

    // Noise buffer
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400 * magnitude, now);
    filter.frequency.linearRampToValueAtTime(80, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(Math.min(0.5 * magnitude, 0.7), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    // Sub-bass pitch drop for heavy weight
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(120, now);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + duration * 0.8);

    subGain.gain.setValueAtTime(0.35 * Math.min(magnitude, 2.0), now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);

    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);

    noise.start(now);
    subOsc.start(now);
    subOsc.stop(now + duration);
  }

  /** Megabomb Screen Clearing Super-Blast */
  public playMegabomb(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 1.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(120, now);
    filter.frequency.exponentialRampToValueAtTime(2000, now + 0.4);
    filter.frequency.exponentialRampToValueAtTime(50, now + 1.2);

    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 1.2);

    this.playExplosion(2.5);
  }

  /** Piercing Beam Laser discharge */
  public playBeamLaser(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.linearRampToValueAtTime(880, now + 0.3);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(448, now); // Detuned for thick laser buzz
    osc2.frequency.linearRampToValueAtTime(896, now + 0.3);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  /** Homing Torpedo Launch */
  public playHomingLaunch(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.19);
  }

  /** Powerup Pickup Chime */
  public playPowerup(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    const now = this.ctx.currentTime;

    notes.forEach((freq, index) => {
      const noteTime = now + index * 0.055;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.25, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(noteTime);
      osc.stop(noteTime + 0.13);
    });
  }

  /** Boss Warning Klaxon Alarm */
  public playBossAlarm(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.25;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(i % 2 === 0 ? 370 : 440, t);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.23);
    }
  }

  /** Player Damage Crunch */
  public playDamage(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.21);
  }

  /** UI Beep */
  public playUiBeep(): void {
    if (!this.ctx || !this.sfxGain || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, now);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  // --- Procedural Background Music Generator (Synthwave Arpeggiator) ---

  public setMusicTheme(theme: MusicTheme): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;

    if (theme === 'OFF') {
      this.stopMusic();
    } else {
      if (theme === 'STAGE1') {
        this.bpm = 120;
      } else if (theme === 'STAGE2') {
        this.bpm = 132;
      } else if (theme === 'BOSS') {
        this.bpm = 144;
      }
      this.startMusic();
    }
  }

  public stopMusic(): void {
    if (this.sequencerTimer !== null) {
      clearInterval(this.sequencerTimer);
      this.sequencerTimer = null;
    }
    this.currentTheme = 'OFF';
  }

  private startMusic(): void {
    this.initAudioContext();
    if (!this.ctx) return;

    if (this.sequencerTimer !== null) {
      clearInterval(this.sequencerTimer);
    }

    this.currentStep = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;

    // Run clock check every 25ms
    this.sequencerTimer = window.setInterval(() => {
      this.scheduleMusicStep();
    }, 25);
  }

  private scheduleMusicStep(): void {
    if (!this.ctx || !this.bgmGain || this.isMuted || this.currentTheme === 'OFF') return;

    const stepDuration = 60 / (this.bpm * 4); // 16th notes
    const lookahead = 0.1;

    while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
      this.playSequencerStep(this.currentStep, this.nextNoteTime, stepDuration);
      this.nextNoteTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 32;
    }
  }

  private playSequencerStep(step: number, time: number, duration: number): void {
    if (!this.ctx || !this.bgmGain) return;

    // Melodic notes mapping in Hz
    // Bass notes (A1=55, C2=65.4, D2=73.4, E2=82.4, F2=87.3, G2=98)
    const BASS_A1 = 55.0;
    const BASS_C2 = 65.41;
    const BASS_D2 = 73.42;
    const BASS_F1 = 43.65;
    const BASS_G1 = 49.0;
    const BASS_E1 = 41.2;

    // Arp notes (Octave 3-4)
    const A3 = 220.0;
    const C4 = 261.63;
    const E4 = 329.63;
    const G4 = 392.0;
    const A4 = 440.0;
    const B4 = 493.88;
    const D4 = 293.66;
    const F4 = 349.23;

    if (this.currentTheme === 'STAGE1') {
      // 120 BPM Synthwave: Am -> F -> C -> G
      const bar = Math.floor(step / 8);
      const rootBass = bar === 0 ? BASS_A1 : bar === 1 ? BASS_F1 : bar === 2 ? BASS_C2 : BASS_G1;

      // Bassline on 8th notes
      if (step % 2 === 0) {
        this.synthBassNote(rootBass, time, duration * 1.5);
      }

      // Arpeggio pattern
      const arpNotes = [A3, C4, E4, A4, E4, C4, A3, E4];
      const note = arpNotes[step % 8];
      this.synthArpNote(note, time, duration * 0.9, 'square');

      // Rhythm: Hi-hat on every 8th note, snare on 4 and 12
      if (step % 4 === 2) {
        this.synthHiHat(time);
      }
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this.synthSnare(time);
      }
    } else if (this.currentTheme === 'STAGE2') {
      // 132 BPM Cyber Fortress: Dm -> Bb -> Gm -> A
      const bar = Math.floor(step / 8);
      const rootBass = bar === 0 ? BASS_D2 : bar === 1 ? 58.27 : bar === 2 ? BASS_G1 : BASS_A1;

      // Driving rolling 16th-note bassline
      this.synthBassNote(step % 2 === 0 ? rootBass : rootBass * 2, time, duration * 0.85);

      // Industrial tech arpeggio
      const arpNotes = [D4, F4, A4, D4 * 1.5, A4, F4, D4, F4];
      this.synthArpNote(arpNotes[step % 8], time, duration * 0.7, 'sawtooth');

      // High-energy drums
      if (step % 2 === 0) {
        this.synthHiHat(time);
      }
      if (step % 8 === 4) {
        this.synthSnare(time);
      }
      if (step % 8 === 0) {
        this.synthKick(time);
      }
    } else if (this.currentTheme === 'BOSS') {
      // 144 BPM Climax Boss Rush: E minor intense syncopation
      const rootBass = step % 4 === 0 ? BASS_E1 : BASS_E1 * 1.5;
      this.synthBassNote(rootBass, time, duration * 0.8);

      // Tension intervals
      const bossNotes = [E4, 311.13 /* D#4 */, E4, G4, 370.0 /* F#4 */, 466.16 /* A#4 */, B4, E4];
      this.synthArpNote(bossNotes[step % 8], time, duration * 0.6, 'sawtooth');

      // Relentless drums
      this.synthHiHat(time);
      if (step % 8 === 0 || step % 8 === 6) {
        this.synthKick(time);
      }
      if (step % 8 === 4) {
        this.synthSnare(time);
      }
    }
  }

  private synthBassNote(freq: number, time: number, dur: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, time);
    filter.frequency.exponentialRampToValueAtTime(80, time + dur);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private synthArpNote(freq: number, time: number, dur: number, wave: OscillatorType): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = wave;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private synthKick(time: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(time);
    osc.stop(time + 0.11);
  }

  private synthSnare(time: number): void {
    if (!this.ctx || !this.bgmGain) return;
    // Short noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.08);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(800, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
  }

  private synthHiHat(time: number): void {
    if (!this.ctx || !this.bgmGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.03);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(time);
  }
}

export const soundSynthesizer = new SoundSynthesizer();
