let audioCtx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let musicPlaying = false;
let musicNodes = [];
let musicMuted = false;
let sfxMuted = false;

function ensureCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.5;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function noteToFreq(note) {
  const notes = { 'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.00, 'A': 440.00, 'B': 493.88 };
  const match = note.match(/^([A-G])(#?)(\d)$/);
  if (!match) return 261.63;
  let freq = notes[match[1]];
  if (match[2] === '#') freq *= 1.05946;
  freq *= Math.pow(2, (parseInt(match[3]) - 4));
  return freq;
}

function playNote(freq, duration, type = 'square', gainNode = musicGain, startTime = 0, volume = 0.15) {
  ensureCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration - 0.02);
  osc.connect(gain);
  gain.connect(gainNode);
  osc.start(audioCtx.currentTime + startTime);
  osc.stop(audioCtx.currentTime + startTime + duration);
  musicNodes.push(osc);
  return osc;
}

function playNoise(duration, gainNode = musicGain, startTime = 0, volume = 0.08) {
  ensureCtx();
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + duration - 0.01);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(gainNode);
  source.start(audioCtx.currentTime + startTime);
  musicNodes.push(source);
  return source;
}

const NOTES = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25
};

function buildMusicLoop() {
  ensureCtx();
  const bpm = 120;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const loopLen = bar * 4;

  function scheduleLoop(offset) {
    musicNodes = musicNodes.filter(n => {
      try { return n.playbackState !== 'finished'; } catch(e) { return false; }
    });
    const bassLine = [
      NOTES.C3, NOTES.C3, NOTES.E3, NOTES.G3,
      NOTES.A3, NOTES.A3, NOTES.G3, NOTES.F3,
      NOTES.F3, NOTES.F3, NOTES.E3, NOTES.D3,
      NOTES.E3, NOTES.E3, NOTES.G3, NOTES.C4
    ];
    const melody = [
      NOTES.C5, 0, NOTES.E5, 0, NOTES.D5, 0, NOTES.C5, 0,
      NOTES.A4, 0, NOTES.C5, 0, NOTES.B4, 0, NOTES.A4, 0,
      NOTES.G4, 0, NOTES.B4, 0, NOTES.A4, 0, NOTES.G4, 0,
      NOTES.E4, 0, NOTES.G4, 0, NOTES.C5, 0, NOTES.E5, 0
    ];
    const pad = [
      [NOTES.C4, NOTES.E4, NOTES.G4],
      [NOTES.A3, NOTES.C4, NOTES.E4],
      [NOTES.F3, NOTES.A3, NOTES.C4],
      [NOTES.G3, NOTES.B3, NOTES.D4]
    ];

    for (let i = 0; i < bassLine.length; i++) {
      playNote(bassLine[i], beat * 0.8, 'triangle', musicGain, offset + i * beat, 0.12);
    }

    for (let i = 0; i < melody.length; i++) {
      if (melody[i] > 0) {
        playNote(melody[i], beat * 0.6, 'square', musicGain, offset + i * (beat / 2), 0.06);
      }
    }

    for (let barIdx = 0; barIdx < 4; barIdx++) {
      const chord = pad[barIdx];
      for (const freq of chord) {
        playNote(freq, bar - 0.05, 'sawtooth', musicGain, offset + barIdx * bar, 0.025);
      }
    }

    for (let i = 0; i < 32; i++) {
      if (i % 4 === 0) playNoise(0.08, musicGain, offset + i * (beat / 2), 0.07);
      if (i % 4 === 2) playNoise(0.05, musicGain, offset + i * (beat / 2), 0.04);
      if (i % 8 === 6) {
        playNote(NOTES.C5 * 2, 0.04, 'sine', musicGain, offset + i * (beat / 2), 0.05);
      }
    }
  }

  return { loopLen, scheduleLoop };
}

let loopInterval = null;

export function startMusic() {
  if (musicPlaying || musicMuted) return;
  ensureCtx();
  musicPlaying = true;
  const { loopLen, scheduleLoop } = buildMusicLoop();
  scheduleLoop(0);
  loopInterval = setInterval(() => {
    if (!musicMuted) scheduleLoop(0);
  }, loopLen * 1000);
}

export function stopMusic() {
  musicPlaying = false;
  if (loopInterval) clearInterval(loopInterval);
  loopInterval = null;
  musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
  musicNodes = [];
}

export function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicMuted) {
    stopMusic();
  } else {
    startMusic();
  }
  return !musicMuted;
}

export function isMusicMuted() { return musicMuted; }

export function toggleSfx() {
  sfxMuted = !sfxMuted;
  return !sfxMuted;
}

export function isSfxMuted() { return sfxMuted; }

function sfxTone(freq, duration, type = 'sine', vol = 0.15) {
  if (sfxMuted) return;
  ensureCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(sfxGain);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function sfxCardScore() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(880, 0.08, 'sine', 0.12);
  sfxTone(1320, 0.06, 'sine', 0.06);
}

export function sfxJokerProc() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(1200, 0.12, 'sine', 0.1);
  setTimeout(() => sfxTone(1500, 0.1, 'sine', 0.07), 40);
  setTimeout(() => sfxTone(1800, 0.08, 'triangle', 0.05), 80);
}

export function sfxClick() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(1000, 0.03, 'sine', 0.08);
}

export function sfxBuy() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(1200, 0.06, 'sine', 0.1);
  setTimeout(() => sfxTone(1600, 0.08, 'sine', 0.08), 50);
}

export function sfxWin() {
  if (sfxMuted) return;
  ensureCtx();
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => sfxTone(f, 0.2, 'sine', 0.1), i * 120);
  });
}

export function sfxLose() {
  if (sfxMuted) return;
  ensureCtx();
  [400, 350, 300, 250].forEach((f, i) => {
    setTimeout(() => sfxTone(f, 0.25, 'sawtooth', 0.06), i * 150);
  });
}

export function sfxDeal() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(600, 0.04, 'triangle', 0.06);
}

export function sfxDiscard() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(300, 0.08, 'sawtooth', 0.06);
  sfxTone(200, 0.06, 'triangle', 0.04);
}

export function sfxSintonia(repIndex) {
  if (sfxMuted) return;
  ensureCtx();
  const baseFreq = 880;
  const semitoneMultiplier = Math.pow(2, 1 / 12);
  const freq = baseFreq * Math.pow(semitoneMultiplier, repIndex * 2);
  sfxTone(freq, 0.15, 'sine', 0.12);
  setTimeout(() => sfxTone(freq * 1.5, 0.1, 'triangle', 0.06), 50);
}

export function sfxExplosion() {
  if (sfxMuted) return;
  ensureCtx();
  const bufferSize = audioCtx.sampleRate * 0.3;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3000, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  noise.start();
  sfxTone(80, 0.25, 'sine', 0.15);
  sfxTone(60, 0.2, 'triangle', 0.12);
}

export function sfxWhoosh() {
  if (sfxMuted) return;
  ensureCtx();
  const bufferSize = audioCtx.sampleRate * 0.15;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + 0.15);
  filter.Q.value = 2;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxGain);
  noise.start();
}

export function sfxApply() {
  if (sfxMuted) return;
  ensureCtx();
  sfxTone(880, 0.12, 'sine', 0.1);
  setTimeout(() => sfxTone(1100, 0.1, 'sine', 0.08), 60);
  setTimeout(() => sfxTone(1320, 0.08, 'triangle', 0.06), 120);
}
