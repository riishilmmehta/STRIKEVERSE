import {
  BIOME_MUSIC_BY_TRACK_ID,
  isArenaBiomeMusicTrack,
  type ArenaBiomeMusicId,
} from './arenaBiomeAudio';
import type { SelectedVoiceLine } from './characterVoices';
import { DOJO_AUDIO_SPECS } from './dojoAudio';
import type { ArenaBiomeId, DojoAudioTrackId } from './types';

export type MusicTrackMode = 'default' | DojoAudioTrackId | ArenaBiomeMusicId;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private combatIntensity = 0;
  private musicTrack: MusicTrackMode = 'default';

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.stopMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setCombatIntensity(intensity: number): void {
    this.combatIntensity = Math.max(0, Math.min(1, intensity));
  }

  public getMusicTrack(): MusicTrackMode {
    return this.musicTrack;
  }

  public setMusicTrack(track: MusicTrackMode): void {
    if (this.musicTrack === track) return;
    this.musicTrack = track;
    this.musicStep = 0;
    if (this.musicTimer !== null) {
      this.stopMusic();
      if (!this.muted && track !== 'silent') {
        this.startMusic();
      }
    } else if (!this.muted && track !== 'silent' && this.ctx && this.ctx.state === 'running') {
      this.startMusic();
    }
  }

  public unlock(): void {
    if (this.muted) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private getCurrentStepMs(): number {
    if (this.musicTrack === 'default') return 340;
    if (isArenaBiomeMusicTrack(this.musicTrack)) {
      return BIOME_MUSIC_BY_TRACK_ID[this.musicTrack].stepMs;
    }
    return DOJO_AUDIO_SPECS[this.musicTrack].stepMs;
  }

  public startMusic(): void {
    if (this.muted || this.musicTrack === 'silent' || this.musicTimer !== null) return;
    this.unlock();
    const intervalMs = this.getCurrentStepMs();
    this.musicTimer = window.setInterval(() => {
      if (this.muted || this.musicTrack === 'silent' || !this.ctx || this.ctx.state !== 'running') {
        return;
      }
      this.playBeatStep(this.musicStep++);
    }, intervalMs);
  }

  public stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public playTrackPreviewChime(track: DojoAudioTrackId): void {
    if (this.muted || track === 'silent') return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const chords: Record<Exclude<DojoAudioTrackId, 'silent'>, number[]> = {
      zen_garden: [293.66, 440.0, 587.33],
      heavy_beat: [146.83, 220.0, 261.63],
      stormy_dojo: [130.81, 196.0, 311.13],
      cyber_pulse: [220.0, 329.63, 440.0],
    };
    const notes = chords[track];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = track === 'cyber_pulse' ? 'sawtooth' : track === 'heavy_beat' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.055);
      g.gain.setValueAtTime(0.0001, now + idx * 0.055);
      g.gain.exponentialRampToValueAtTime(0.05 / (idx * 0.35 + 1), now + idx * 0.055 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.055 + 0.42);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + idx * 0.055);
      osc.stop(now + idx * 0.055 + 0.45);
    });
  }

  public playBiomeThemeStinger(biomeId: ArenaBiomeId): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const motifs: Record<ArenaBiomeId, { freqs: number[]; type: OscillatorType }> = {
      salt_flats: { freqs: [880, 1174.66, 1567.98], type: 'sine' },
      karst_cenotes: { freqs: [523.25, 392.0, 293.66], type: 'sine' },
      wildfire_ashlands: { freqs: [146.83, 174.61, 220.0], type: 'sawtooth' },
      geothermal_springs: { freqs: [392.0, 523.25, 659.25], type: 'triangle' },
      kelp_brine: { freqs: [220.0, 329.63, 493.88], type: 'sine' },
    };
    const m = motifs[biomeId] ?? motifs.salt_flats;
    m.freqs.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = m.type;
      osc.frequency.setValueAtTime(freq, now + i * 0.075);
      g.gain.setValueAtTime(0.0001, now + i * 0.075);
      g.gain.exponentialRampToValueAtTime(0.036 / (i * 0.35 + 1), now + i * 0.075 + 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.075 + 0.55);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now + i * 0.075);
      osc.stop(now + i * 0.075 + 0.58);
    });
  }

  private playNoiseBurst(dur: number, filterFreq: number, q: number, peakGain: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.max(64, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(peakGain, now + Math.min(0.04, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter).connect(g).connect(this.ctx.destination);
    src.start(now);
  }

  private playBeatStep(step: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.musicTrack === 'zen_garden') {
      // Serene D-minor pentatonic koto plucks & warm breathy courtyard drone
      const pentatonic = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
      if (step % 8 === 0) {
        const drone = this.ctx.createOscillator();
        const dg = this.ctx.createGain();
        drone.type = 'sine';
        drone.frequency.setValueAtTime(step % 16 === 0 ? 146.83 : 110.0, now);
        dg.gain.setValueAtTime(0.0001, now);
        dg.gain.exponentialRampToValueAtTime(0.026, now + 0.35);
        dg.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
        drone.connect(dg).connect(this.ctx.destination);
        drone.start(now);
        drone.stop(now + 1.85);
      }
      if (step % 3 === 0 || step % 8 === 5) {
        const freq = pentatonic[(step * 2 + Math.floor(step / 8)) % pentatonic.length];
        const koto = this.ctx.createOscillator();
        const kg = this.ctx.createGain();
        koto.type = 'triangle';
        koto.frequency.setValueAtTime(freq, now);
        kg.gain.setValueAtTime(0.028, now);
        kg.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
        koto.connect(kg).connect(this.ctx.destination);
        koto.start(now);
        koto.stop(now + 0.65);
      }
      if (step % 12 === 7) {
        const chime = this.ctx.createOscillator();
        const cg = this.ctx.createGain();
        chime.type = 'sine';
        chime.frequency.setValueAtTime(1174.66, now);
        cg.gain.setValueAtTime(0.012, now);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        chime.connect(cg).connect(this.ctx.destination);
        chime.start(now);
        chime.stop(now + 0.92);
      }
      return;
    }

    if (this.musicTrack === 'heavy_beat') {
      // Dusty lo-fi hip-hop boom-bap groove + warm minor 7th chord stabs
      const barStep = step % 8;
      if (barStep === 0 || barStep === 3 || barStep === 6) {
        const kick = this.ctx.createOscillator();
        const kg = this.ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(132, now);
        kick.frequency.exponentialRampToValueAtTime(38, now + 0.14);
        kg.gain.setValueAtTime(0.065, now);
        kg.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
        kick.connect(kg).connect(this.ctx.destination);
        kick.start(now);
        kick.stop(now + 0.18);
      }
      if (barStep === 2 || barStep === 6) {
        this.playNoiseBurst(0.11, 1450, 1.3, 0.036);
      }
      if (barStep % 2 === 1) {
        this.playNoiseBurst(0.045, 5200, 2.2, 0.014);
      }
      if (barStep === 0 || barStep === 4) {
        const chords = [
          [174.61, 220.0, 261.63],
          [146.83, 174.61, 220.0],
          [164.81, 196.0, 246.94],
          [130.81, 164.81, 196.0],
        ];
        const chord = chords[Math.floor(step / 8) % chords.length];
        chord.forEach((f) => {
          if (!this.ctx) return;
          const rhodes = this.ctx.createOscillator();
          const rg = this.ctx.createGain();
          rhodes.type = 'triangle';
          rhodes.frequency.setValueAtTime(f, now);
          rg.gain.setValueAtTime(0.0001, now);
          rg.gain.exponentialRampToValueAtTime(0.018, now + 0.04);
          rg.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
          rhodes.connect(rg).connect(this.ctx.destination);
          rhodes.start(now);
          rhodes.stop(now + 0.55);
        });
      }
      return;
    }

    if (this.musicTrack === 'stormy_dojo') {
      // Rolling taiko drums + filtered rain wash + tense Japanese Hirajoshi flute motif
      const barStep = step % 8;
      if (barStep === 0 || barStep === 3 || barStep === 4) {
        const taiko = this.ctx.createOscillator();
        const tg = this.ctx.createGain();
        taiko.type = 'sine';
        const hitFreq = barStep === 0 ? 115 : 92;
        taiko.frequency.setValueAtTime(hitFreq, now);
        taiko.frequency.exponentialRampToValueAtTime(42, now + 0.22);
        tg.gain.setValueAtTime(barStep === 0 ? 0.075 : 0.048, now);
        tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        taiko.connect(tg).connect(this.ctx.destination);
        taiko.start(now);
        taiko.stop(now + 0.28);
      }
      // Ambient rain wash on every half-bar
      if (barStep === 0 || barStep === 4) {
        this.playNoiseBurst(0.65, 1100, 0.7, 0.014);
      }
      // Tense shakuhachi flute accent
      if (step % 6 === 2) {
        const notes = [293.66, 311.13, 440.0, 466.16, 587.33];
        const f = notes[Math.floor(step / 6) % notes.length];
        const flute = this.ctx.createOscillator();
        const fg = this.ctx.createGain();
        flute.type = 'sine';
        flute.frequency.setValueAtTime(f, now);
        flute.frequency.linearRampToValueAtTime(f * 1.015, now + 0.32);
        fg.gain.setValueAtTime(0.0001, now);
        fg.gain.exponentialRampToValueAtTime(0.024, now + 0.12);
        fg.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);
        flute.connect(fg).connect(this.ctx.destination);
        flute.start(now);
        flute.stop(now + 0.58);
      }
      return;
    }

    if (this.musicTrack === 'cyber_pulse') {
      // Electric neon synthwave arpeggio + tight bass pulse
      const arp = [220.0, 261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 261.63];
      const bass = [110.0, 110.0, 98.0, 87.31];
      const lead = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, now);
      lead.type = 'sawtooth';
      lead.frequency.setValueAtTime(arp[step % arp.length], now);
      lg.gain.setValueAtTime(0.018, now);
      lg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      lead.connect(filter).connect(lg).connect(this.ctx.destination);
      lead.start(now);
      lead.stop(now + 0.22);

      if (step % 2 === 0) {
        const sub = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(bass[Math.floor(step / 8) % bass.length], now);
        sg.gain.setValueAtTime(0.036, now);
        sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        sub.connect(sg).connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.24);
      }
      return;
    }

    // ------------------------------------------------------------------
    // Dynamic 1v1 Arena Biome Soundtracks
    // ------------------------------------------------------------------
    if (this.musicTrack === 'biome_salt_flats') {
      // Salt Flats & Mirrors: haunting crystalline wind chimes + open desert shimmer breeze
      const chimeScale = [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
      if (step % 6 === 0 || step % 10 === 3) {
        const base = chimeScale[(step * 5 + Math.floor(step / 6)) % chimeScale.length];
        [1, 2.01].forEach((ratio, idx) => {
          if (!this.ctx) return;
          const chime = this.ctx.createOscillator();
          const cg = this.ctx.createGain();
          chime.type = 'sine';
          chime.frequency.setValueAtTime(base * ratio, now + idx * 0.015);
          cg.gain.setValueAtTime(0.0001, now + idx * 0.015);
          cg.gain.exponentialRampToValueAtTime(idx === 0 ? 0.024 : 0.009, now + idx * 0.015 + 0.02);
          cg.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);
          chime.connect(cg).connect(this.ctx.destination);
          chime.start(now + idx * 0.015);
          chime.stop(now + 1.4);
        });
      }
      if (step % 8 === 0) {
        // Airy mirror-horizon glass pad + salt wind sweep
        const pad = this.ctx.createOscillator();
        const pg = this.ctx.createGain();
        pad.type = 'triangle';
        pad.frequency.setValueAtTime(step % 16 === 0 ? 196.0 : 164.81, now);
        pg.gain.setValueAtTime(0.0001, now);
        pg.gain.exponentialRampToValueAtTime(0.018, now + 0.45);
        pg.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
        pad.connect(pg).connect(this.ctx.destination);
        pad.start(now);
        pad.stop(now + 2.25);
        this.playNoiseBurst(0.95, 2200, 1.9, 0.009);
      }
      return;
    }

    if (this.musicTrack === 'biome_karst_cenotes') {
      // Karst Towers & Cenotes: echoing cave water drips + hollow subterranean limestone drone
      if (step % 3 === 0 || step % 7 === 4) {
        const dripBase = [740, 880, 1046.5, 659.25, 932.33][step % 5];
        // Primary droplet + 2 decaying cave echoes
        [0, 0.22, 0.46].forEach((delay, echoIdx) => {
          if (!this.ctx) return;
          const drip = this.ctx.createOscillator();
          const dg = this.ctx.createGain();
          drip.type = 'sine';
          drip.frequency.setValueAtTime(dripBase * 0.85, now + delay);
          drip.frequency.exponentialRampToValueAtTime(dripBase * 1.48, now + delay + 0.075);
          const peak = 0.032 * Math.pow(0.45, echoIdx);
          dg.gain.setValueAtTime(0.0001, now + delay);
          dg.gain.exponentialRampToValueAtTime(peak, now + delay + 0.01);
          dg.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);
          drip.connect(dg).connect(this.ctx.destination);
          drip.start(now + delay);
          drip.stop(now + delay + 0.2);
        });
      }
      if (step % 8 === 0) {
        const cavern = this.ctx.createOscillator();
        const cg = this.ctx.createGain();
        cavern.type = 'sine';
        cavern.frequency.setValueAtTime(step % 16 === 0 ? 73.42 : 82.41, now);
        cg.gain.setValueAtTime(0.0001, now);
        cg.gain.exponentialRampToValueAtTime(0.038, now + 0.4);
        cg.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
        cavern.connect(cg).connect(this.ctx.destination);
        cavern.start(now);
        cavern.stop(now + 2.45);
      }
      return;
    }

    if (this.musicTrack === 'biome_wildfire_ashlands') {
      // Post-Wildfire Ashlands: crackling ember bursts + brooding dark minor synth pads + slow pulse
      const barStep = step % 8;
      // Organic crackling fire pops
      if (barStep % 2 === 1 || step % 5 === 0) {
        this.playNoiseBurst(0.032, 3400 + (step % 4) * 750, 3.2, 0.022);
      }
      if (barStep === 0 || barStep === 4) {
        // Low smoldering ember hiss
        this.playNoiseBurst(0.45, 720, 0.9, 0.014);
      }
      if (barStep === 0) {
        // Brooding minor synth pad (D minor / Bb / G minor / A7sus)
        const pads = [
          [146.83, 174.61, 220.0],
          [116.54, 146.83, 174.61],
          [98.0, 116.54, 146.83],
          [110.0, 146.83, 164.81],
        ];
        const chord = pads[Math.floor(step / 8) % pads.length];
        chord.forEach((f) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(520, now);
          filter.frequency.linearRampToValueAtTime(860, now + 0.8);
          filter.frequency.linearRampToValueAtTime(380, now + 1.9);
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.016, now + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.95);
          osc.connect(filter).connect(g).connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 2.0);
        });
      }
      if (barStep === 0 || barStep === 3) {
        const sub = this.ctx.createOscillator();
        const sg = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(98, now);
        sub.frequency.exponentialRampToValueAtTime(40, now + 0.16);
        sg.gain.setValueAtTime(0.055, now);
        sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        sub.connect(sg).connect(this.ctx.destination);
        sub.start(now);
        sub.stop(now + 0.22);
      }
      return;
    }

    if (this.musicTrack === 'biome_geothermal_springs') {
      // Geothermal Rainbow Springs: rhythmic steam vent bursts + vibrant mineral marimba notes
      const scale = [293.66, 369.99, 440.0, 554.37, 587.33, 739.99];
      if (step % 2 === 0) {
        const freq = scale[(step * 3 + Math.floor(step / 4)) % scale.length];
        const marimba = this.ctx.createOscillator();
        const mg = this.ctx.createGain();
        marimba.type = 'triangle';
        marimba.frequency.setValueAtTime(freq, now);
        mg.gain.setValueAtTime(0.028, now);
        mg.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
        marimba.connect(mg).connect(this.ctx.destination);
        marimba.start(now);
        marimba.stop(now + 0.28);
      }
      if (step % 6 === 2) {
        // Boiling geyser steam vent hiss
        this.playNoiseBurst(0.36, 1850, 1.2, 0.018);
      }
      if (step % 8 === 0) {
        const bass = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(step % 16 === 0 ? 110.0 : 146.83, now);
        bg.gain.setValueAtTime(0.036, now);
        bg.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        bass.connect(bg).connect(this.ctx.destination);
        bass.start(now);
        bass.stop(now + 0.68);
      }
      return;
    }

    if (this.musicTrack === 'biome_kelp_brine') {
      // Kelp Forests & Brine Pools: deep underwater sonar pings + filtered oceanic synth swell
      if (step % 6 === 0) {
        const sonarFreq = step % 12 === 0 ? 587.33 : 493.88;
        [0, 0.34].forEach((delay, idx) => {
          if (!this.ctx) return;
          const ping = this.ctx.createOscillator();
          const pg = this.ctx.createGain();
          ping.type = 'sine';
          ping.frequency.setValueAtTime(sonarFreq, now + delay);
          pg.gain.setValueAtTime(0.0001, now + delay);
          pg.gain.exponentialRampToValueAtTime(idx === 0 ? 0.028 : 0.011, now + delay + 0.02);
          pg.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.72);
          ping.connect(pg).connect(this.ctx.destination);
          ping.start(now + delay);
          ping.stop(now + delay + 0.76);
        });
      }
      if (step % 8 === 0) {
        const swell = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const sg = this.ctx.createGain();
        swell.type = 'sawtooth';
        swell.frequency.setValueAtTime(step % 16 === 0 ? 82.41 : 98.0, now);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, now);
        filter.frequency.linearRampToValueAtTime(420, now + 1.1);
        filter.frequency.linearRampToValueAtTime(180, now + 2.5);
        sg.gain.setValueAtTime(0.0001, now);
        sg.gain.exponentialRampToValueAtTime(0.032, now + 0.65);
        sg.gain.exponentialRampToValueAtTime(0.0001, now + 2.6);
        swell.connect(filter).connect(sg).connect(this.ctx.destination);
        swell.start(now);
        swell.stop(now + 2.65);
      }
      return;
    }

    // Default Nexus City & Arena soundtrack
    const scale = [220, 261.63, 293.66, 329.63, 392.0, 440.0];
    const chordIdx = Math.floor(step / 8) % 4;
    const roots = [110, 130.81, 146.83, 164.81];

    // Chill Nexus City warm synth pad on beat 0
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(roots[chordIdx], now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.025 + this.combatIntensity * 0.015, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.58);
    }

    // Dynamic combat pulse when in combat arenas
    if (this.combatIntensity > 0.25 && step % 2 === 0) {
      const kick = this.ctx.createOscillator();
      const kg = this.ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(125, now);
      kick.frequency.exponentialRampToValueAtTime(42, now + 0.11);
      kg.gain.setValueAtTime(0.045 * this.combatIntensity, now);
      kg.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
      kick.connect(kg).connect(this.ctx.destination);
      kick.start(now);
      kick.stop(now + 0.14);
    }

    if (step % 2 === 1 && (this.combatIntensity > 0.4 || step % 8 === 5)) {
      const note = scale[(step * 3 + chordIdx) % scale.length];
      const pluck = this.ctx.createOscillator();
      const pg = this.ctx.createGain();
      pluck.type = 'sine';
      pluck.frequency.setValueAtTime(note * (this.combatIntensity > 0.5 ? 1 : 0.5), now);
      pg.gain.setValueAtTime(0.015, now);
      pg.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
      pluck.connect(pg).connect(this.ctx.destination);
      pluck.start(now);
      pluck.stop(now + 0.22);
    }
  }

  private randPitch(base: number): number {
    return base * (0.93 + Math.random() * 0.14);
  }

  public playSwing(heavy = false): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = heavy ? 0.19 : 0.11;

    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(this.randPitch(heavy ? 480 : 920), now);
    filter.frequency.exponentialRampToValueAtTime(heavy ? 180 : 360, now + dur);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(heavy ? 0.18 : 0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter).connect(gain).connect(this.ctx.destination);
    noise.start(now);
  }

  public playHit(heavy = false): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(this.randPitch(heavy ? 185 : 260), now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 36 : 58, now + (heavy ? 0.2 : 0.11));

    gain.gain.setValueAtTime(heavy ? 0.26 : 0.17, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.22 : 0.12));

    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.23 : 0.13));

    // Crisp transient snap
    const snap = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    snap.type = 'square';
    snap.frequency.setValueAtTime(this.randPitch(heavy ? 740 : 1080), now);
    snap.frequency.exponentialRampToValueAtTime(140, now + 0.045);
    sg.gain.setValueAtTime(heavy ? 0.12 : 0.07, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    snap.connect(sg).connect(this.ctx.destination);
    snap.start(now);
    snap.stop(now + 0.055);
  }

  public playParry(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Bright resonant gold chime
    [880, 1318.5, 1760].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.03, now + 0.34);
      gain.gain.setValueAtTime(0.14 / (idx + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    });
  }

  public playBlock(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.09);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playDash(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playSkill(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.14);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.32);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  public playUltimate(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [110, 220, 440, 659.25].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i % 2 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq * 0.75, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.45);
      gain.gain.setValueAtTime(0.1 / (i * 0.4 + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.78);
    });
  }

  public playTelegraph(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.18);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playBounce(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.2);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  public playCrateBreak(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playVictory(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(0.12, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.42);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.45);
    });
  }

  public playDefeat(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [329.63, 277.18, 220.0].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + i * 0.13);
      gain.gain.setValueAtTime(0.09, now + i * 0.13);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.13 + 0.35);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(now + i * 0.13);
      osc.stop(now + i * 0.13 + 0.38);
    });
  }

  /**
   * Triggers character-specific Victory or Defeat voice line when MatchEndModal appears.
   * Combines a class-tuned formant vocal resonance cadence with browser Web Speech synthesis.
   */
  public playCharacterVoiceLine(voice: {
    line: string;
    outcome: 'victory' | 'defeat';
    pitch: number;
    rate: number;
    formant1Hz: number;
    formant2Hz: number;
    baseFreqHz: number;
  }): void {
    if (this.muted) return;
    this.unlock();

    // 1. Class-specific formant vocal resonance cue (works everywhere including headless/offline)
    if (this.ctx) {
      const now = this.ctx.currentTime;
      const contour =
        voice.outcome === 'victory'
          ? [1.0, 1.18, 1.32]
          : [1.0, 0.89, 0.78];

      contour.forEach((mult, idx) => {
        if (!this.ctx) return;
        const start = now + idx * 0.14;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(voice.baseFreqHz * mult, start);
        osc.frequency.exponentialRampToValueAtTime(
          voice.baseFreqHz * mult * (voice.outcome === 'victory' ? 1.05 : 0.94),
          start + 0.18
        );

        const f1 = this.ctx.createBiquadFilter();
        f1.type = 'bandpass';
        f1.frequency.setValueAtTime(voice.formant1Hz, start);
        f1.Q.value = 4.2;

        const f2 = this.ctx.createBiquadFilter();
        f2.type = 'bandpass';
        f2.frequency.setValueAtTime(voice.formant2Hz, start);
        f2.Q.value = 5.0;

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.085, start + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.24);

        osc.connect(f1).connect(g);
        osc.connect(f2).connect(g);
        g.connect(this.ctx.destination);
        osc.start(start);
        osc.stop(start + 0.26);
      });
    }

    // 2. Real spoken Web Speech synthesis line tailored to Hero Class pitch & cadence
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(voice.line);
        utter.pitch = Math.max(0.5, Math.min(2.0, voice.pitch));
        utter.rate = Math.max(0.7, Math.min(1.4, voice.rate));
        utter.volume = 0.9;
        const voices = window.speechSynthesis.getVoices();
        const eng = voices.find((v) => /^en/i.test(v.lang));
        if (eng) utter.voice = eng;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Gracefully ignore speech synthesis errors in restricted contexts
    }
  }

  /** Part A (4.0s): Deep slow sub-bass whoosh synced to left-to-right flame-sheet wipe */
  public playStudioFlameWhoosh(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Deep sub-bass pitch drop stretched for slow sweeping fire sheet
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(92, now);
    sub.frequency.exponentialRampToValueAtTime(30, now + 1.8);
    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(0.26, now + 0.32);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
    sub.connect(subGain).connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 2.05);

    // Sweeping fire-sheet air roar
    const dur = 1.9;
    const bufferSize = Math.max(64, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(220, now);
    filter.frequency.exponentialRampToValueAtTime(1380, now + 0.85);
    filter.frequency.exponentialRampToValueAtTime(320, now + dur);
    filter.Q.value = 1.3;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.0001, now);
    ng.gain.exponentialRampToValueAtTime(0.22, now + 0.42);
    ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(filter).connect(ng).connect(this.ctx.destination);
    noise.start(now);
  }

  /** Part A (8.0s): Sharp ember-crackle layered across the 4-second logo particle formation */
  public playStudioEmberCrackle(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const offsets = [0, 0.25, 0.55, 0.85, 1.2, 1.55, 1.95, 2.35, 2.75, 3.15, 3.55];
    offsets.forEach((delay, idx) => {
      window.setTimeout(() => {
        if (this.muted || !this.ctx) return;
        this.playNoiseBurst(0.032 + (idx % 3) * 0.014, 3100 + (idx % 4) * 850, 3.5, 0.06);
      }, Math.round(delay * 1000));
    });
    // Subtle warm coal hiss underneath
    this.playNoiseBurst(2.4, 880, 0.9, 0.024);
  }

  /** Part A (15.0s): Single deep orchestral/braam stamp timed to full Red Flame Games lock-up */
  public playStudioBraamStamp(): void {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const voices = [
      { freq: 36.71, type: 'sine' as OscillatorType, gain: 0.28 },
      { freq: 73.42, type: 'sawtooth' as OscillatorType, gain: 0.16 },
      { freq: 110.0, type: 'sawtooth' as OscillatorType, gain: 0.11 },
      { freq: 146.83, type: 'sawtooth' as OscillatorType, gain: 0.09 },
      { freq: 220.0, type: 'triangle' as OscillatorType, gain: 0.06 },
    ];

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1650, now);
    filter.frequency.exponentialRampToValueAtTime(190, now + 1.75);
    filter.Q.value = 1.6;
    filter.connect(this.ctx.destination);

    voices.forEach((v) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = v.type;
      osc.frequency.setValueAtTime(v.freq * 1.015, now);
      osc.frequency.exponentialRampToValueAtTime(v.freq, now + 0.16);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(v.gain, now + 0.03);
      g.gain.exponentialRampToValueAtTime(v.gain * 0.65, now + 0.65);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);
      osc.connect(g).connect(filter);
      osc.start(now);
      osc.stop(now + 1.9);
    });

    this.playNoiseBurst(0.18, 1800, 1.8, 0.12);
  }
}
