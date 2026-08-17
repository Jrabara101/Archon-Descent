// ============================================================================
// --- SYNTHESIZED WEB AUDIO & MUSIC ENGINE ---
// ============================================================================

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 1;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    }

    playTone(freq, type, duration, volume, sweepFreq = null) {
        if (this.muted || this.volume <= 0) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (sweepFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(1, sweepFreq), this.ctx.currentTime + duration);
        }
        gainNode.gain.setValueAtTime(volume * this.volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, volume, sweep = false) {
        if (this.muted || this.volume <= 0) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(sweep ? 1000 : 400, this.ctx.currentTime);
        if (sweep) {
            filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);
        }
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(volume * this.volume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        noiseNode.start();
        noiseNode.stop(this.ctx.currentTime + duration);
    }

    playStep() { this.playNoise(0.06, 0.03); }
    playHit() { this.playTone(300, 'triangle', 0.12, 0.15, 80); this.playNoise(0.1, 0.08); }
    playHurt() { this.playTone(180, 'sawtooth', 0.25, 0.25, 40); this.playNoise(0.2, 0.15, true); }
    playLoot() { this.playTone(400, 'sine', 0.1, 0.1, 800); }
    playLevelUp() {
        [261.63, 329.63, 392.00, 523.25].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.15, 0.1), i * 60);
        });
    }
    playDefeat() {
        [293.66, 277.18, 261.63, 220.00].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sawtooth', 0.3, 0.2), i * 180);
        });
    }
    playVictory() {
        [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'sine', 0.2, 0.1), i * 100);
        });
    }
    playMagic() { this.playTone(600, 'sine', 0.3, 0.1, 1200); }
}

const sfx = new SoundEngine();

// Adaptive procedural ambient pad + rhythmic combat layer
class MusicEngine {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.padGain = null;
        this.pulseGain = null;
        this.padNodes = [];
        this.pulseTimer = null;
        this.step = 0;
        this.lastNote = 0;
        this.volume = 0.4;
        this.intensity = 0;
        this.target = 0;
        this.biome = null;
        this.running = false;
        this.ducked = false;
        this.configs = {
            catacombs: { pad: [55, 110, 164.81], padType: 'sine', padLevel: 0.30, filter: 320, bpm: 72, notes: [110, 130.81, 164.81, 98], pulseType: 'triangle' },
            forges:    { pad: [49, 98, 146.83], padType: 'sawtooth', padLevel: 0.10, filter: 480, bpm: 96, notes: [98, 116.54, 146.83, 87.31], pulseType: 'square' },
            void:      { pad: [58.27, 82.41, 116.54], padType: 'triangle', padLevel: 0.26, filter: 300, bpm: 58, notes: [82.41, 116.54, 61.74, 123.47], pulseType: 'sine' }
        };
    }

    init() {
        if (this.ctx) return;
        sfx.init();
        this.ctx = sfx.ctx;
        if (!this.ctx) return;
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);
        this.padGain = this.ctx.createGain();
        this.padGain.gain.value = 0.5;
        this.padGain.connect(this.master);
        this.pulseGain = this.ctx.createGain();
        this.pulseGain.gain.value = 0;
        this.pulseGain.connect(this.master);
    }

    start() {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.running = true;
        if (this.biome) this.buildPad(this.biome);
        if (!this.pulseTimer) this.pulseTimer = setInterval(() => this.tickPulse(), 90);
    }

    stop() {
        this.running = false;
        this.teardownPad();
        if (this.pulseTimer) {
            clearInterval(this.pulseTimer);
            this.pulseTimer = null;
        }
        this.intensity = 0;
        this.target = 0;
        if (this.pulseGain) this.pulseGain.gain.value = 0;
    }

    setBiome(b) {
        if (this.biome === b) return;
        this.biome = b;
        if (this.running) this.buildPad(b);
    }

    setVolume(v) { this.volume = v; }
    setTarget(t) { this.target = t; }
    duck(d) { this.ducked = d; }

    buildPad(biome) {
        this.teardownPad();
        const cfg = this.configs[biome];
        if (!cfg || !this.ctx) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = cfg.filter;
        filter.connect(this.padGain);

        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.08;
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 0.12;
        lfo.connect(lfoGain);
        lfoGain.connect(this.padGain.gain);
        lfo.start();
        this.padNodes.push(lfo, lfoGain, filter);

        cfg.pad.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            osc.type = cfg.padType;
            osc.frequency.value = freq;
            osc.detune.value = (i - 1) * 4;
            const g = this.ctx.createGain();
            g.gain.value = cfg.padLevel;
            osc.connect(g);
            g.connect(filter);
            osc.start();
            this.padNodes.push(osc, g);
        });
    }

    teardownPad() {
        this.padNodes.forEach(n => {
            try {
                if (n.stop) n.stop();
                n.disconnect();
            } catch (e) {}
        });
        this.padNodes = [];
    }

    tickPulse() {
        if (!this.ctx || !this.running || this.intensity < 0.05 || document.hidden) return;
        const cfg = this.configs[this.biome];
        if (!cfg) return;
        const now = performance.now();
        const stepMs = 30000 / cfg.bpm;
        if (now - this.lastNote < stepMs) return;
        this.lastNote = now;
        this.step++;
        const pattern = [0, null, 1, null, 0, 2, null, 3];
        const noteIdx = pattern[this.step % pattern.length];
        if (noteIdx === null) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = cfg.pulseType;
        osc.frequency.value = cfg.notes[noteIdx];
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.connect(g);
        g.connect(this.pulseGain);
        osc.start(t);
        osc.stop(t + 0.3);
    }

    update(dt) {
        if (!this.ctx || !this.running) return;
        this.intensity += (this.target - this.intensity) * Math.min(1, dt / 1200);
        if (this.pulseGain) this.pulseGain.gain.value = this.intensity * 0.8;
        const vol = this.volume * (this.ducked ? 0.25 : 1);
        if (this.master && Math.abs(this.master.gain.value - vol) > 0.001) {
            this.master.gain.value += (vol - this.master.gain.value) * 0.1;
        }
    }
}

const music = new MusicEngine();
