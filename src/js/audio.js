// iOS Safari speechSynthesis quirks:
// - first call must follow a user gesture
// - voices may load async; we re-fetch on each speak
// - cancel() before speak() prevents queue pile-up

const LANG_CODE = { en: 'en-US', ar: 'ar-SA', ur: 'ur-PK' };

let armed = false;
function arm() {
  if (armed || !('speechSynthesis' in window)) return;
  // Tiny silent utterance to unlock the engine on first user gesture.
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
  armed = true;
}

function pickVoice(langCode) {
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  return voices.find(v => v.lang === langCode)
      || voices.find(v => v.lang.startsWith(langCode.split('-')[0]))
      || null;
}

export const Audio = {
  speak(text, lang) {
    if (!('speechSynthesis' in window)) return;
    arm();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANG_CODE[lang] || 'en-US';
    u.rate = 0.85;
    u.pitch = 1.05;
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  },

  speakSequence(items, gapMs = 350) {
    if (!('speechSynthesis' in window)) return;
    arm();
    speechSynthesis.cancel();
    items.forEach(({ text, lang }, i) => {
      setTimeout(() => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = LANG_CODE[lang] || 'en-US';
        u.rate = 0.85;
        const v = pickVoice(u.lang);
        if (v) u.voice = v;
        speechSynthesis.speak(u);
      }, i * (1000 + gapMs));
    });
  },

  // tone feedback (works without user interaction once armed by any prior speak/click)
  beep({ freq, duration = 0.15, type = 'sine', gain = 0.25 }) {
    try {
      const ctx = beep._ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(gain, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  },

  correct() {
    this.beep({ freq: 660, duration: 0.12 });
    setTimeout(() => this.beep({ freq: 880, duration: 0.18 }), 110);
  },
  wrong() {
    this.beep({ freq: 240, duration: 0.25, type: 'square', gain: 0.18 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this.beep({ freq: f, duration: 0.16 }), i * 130));
  }
};

// Pre-load voices list (some browsers populate async)
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.addEventListener?.('voiceschanged', () => speechSynthesis.getVoices());
}
