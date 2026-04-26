// speechSynthesis is fragile across browsers. Known landmines:
// - cancel() then speak() in same tick = WebKit drops the speak() (Safari/macOS bug)
// - voices load async; getVoices() returns [] before 'voiceschanged' fires
// - iOS needs a user-gesture-initiated speak() to unlock; silent utterance trick
//   works on iOS but is unreliable on macOS Safari (just call directly instead)
// - Chrome desktop kills speech after ~15s; harmless for short words

const LANG_CODE = { en: 'en-US', ar: 'ar-SA', ur: 'ur-PK' };
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

let voicesReady = false;
let voicesPromise = null;

function loadVoices() {
  if (voicesReady) return Promise.resolve(synth.getVoices());
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise(resolve => {
    const tryNow = () => {
      const v = synth.getVoices();
      if (v && v.length) { voicesReady = true; resolve(v); return true; }
      return false;
    };
    if (tryNow()) return;
    const handler = () => { if (tryNow()) synth.removeEventListener?.('voiceschanged', handler); };
    synth.addEventListener?.('voiceschanged', handler);
    setTimeout(() => { tryNow(); resolve(synth.getVoices() || []); }, 1500);
  });
  return voicesPromise;
}

function pickVoice(voices, langCode) {
  if (!voices || !voices.length) return null;
  const exact = voices.find(v => v.lang === langCode);
  if (exact) return exact;
  const prefix = langCode.split('-')[0];
  return voices.find(v => v.lang.toLowerCase().startsWith(prefix)) || null;
}

async function speakNow(text, langCode) {
  if (!synth || !text) return;
  const voices = await loadVoices();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  u.rate = 0.85;
  u.pitch = 1.05;
  u.volume = 1;
  const v = pickVoice(voices, langCode);
  if (v) u.voice = v;
  // Safari/macOS race: must yield a tick after cancel before speak() registers.
  if (synth.speaking || synth.pending) synth.cancel();
  setTimeout(() => synth.speak(u), 60);
}

export const Audio = {
  // MUST be called synchronously inside a user gesture handler (click/tap).
  // iOS Safari only unlocks the speech engine if speak() is called within the
  // gesture's call stack — no setTimeout, no awaited promise.
  arm() {
    if (!synth) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.cancel();
      synth.speak(u);
    } catch {}
  },

  speak(text, lang) {
    if (!synth) return;
    const langCode = LANG_CODE[lang] || 'en-US';
    speakNow(text, langCode);
  },

  speakSequence(items, gapMs = 250) {
    if (!synth || !items?.length) return;
    if (synth.speaking || synth.pending) synth.cancel();
    let delay = 60;
    items.forEach(({ text, lang }, i) => {
      setTimeout(() => {
        loadVoices().then(voices => {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = LANG_CODE[lang] || 'en-US';
          u.rate = 0.85;
          const v = pickVoice(voices, u.lang);
          if (v) u.voice = v;
          synth.speak(u);
        });
      }, delay);
      // estimate ~80ms per char + gap; very rough but stops queue piling
      delay += Math.max(800, text.length * 80) + gapMs;
    });
  },

  // tone feedback (always available after first user gesture)
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

// Kick off voices loading immediately
if (synth) loadVoices();
