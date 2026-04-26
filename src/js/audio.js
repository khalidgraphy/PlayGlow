// speechSynthesis cross-browser landmines:
// - iOS Safari: needs synth.speak() called inside a user-gesture call stack
//   to unlock the engine. Audio.arm() handles this.
// - macOS Safari/Chrome: speak() can fire without a gesture, BUT
//   `cancel(); speak();` in the same tick silently drops the speak (WebKit race).
//   AND wrapping speak() in setTimeout breaks user-gesture context, which some
//   builds of macOS Chrome treat as if no gesture happened.
// - Strategy: if nothing is currently speaking, fire SYNCHRONOUSLY (preserves
//   gesture). Only use setTimeout(60) when we actually need to cancel something.
// - Don't wait on a voices-loaded promise: getVoices() returns the system's
//   sync list on macOS; iOS works with no voice (browser picks default per lang).

const LANG_CODE = { en: 'en-US', ar: 'ar-SA', ur: 'ur-PK' };
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

function pickVoice(langCode) {
  const voices = synth?.getVoices?.() || [];
  if (!voices.length) return null;
  return voices.find(v => v.lang === langCode)
      || voices.find(v => v.lang.toLowerCase().startsWith(langCode.split('-')[0]))
      || null;
}

function buildUtterance(text, langCode) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = langCode;
  u.rate = 0.85;
  u.pitch = 1.05;
  u.volume = 1;
  const v = pickVoice(langCode);
  if (v) u.voice = v;
  return u;
}

function speakNow(text, langCode) {
  if (!synth || !text) return;

  // Currently speaking: must cancel + wait one tick (WebKit race).
  // This path is rare in practice; user usually taps with gaps.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => synth.speak(buildUtterance(text, langCode)), 60);
    return;
  }

  // Common path: speak synchronously inside the user gesture's call stack.
  // This is what makes macOS Chrome / Safari actually produce sound.
  synth.speak(buildUtterance(text, langCode));
}

export const Audio = {
  // MUST be called synchronously inside a user gesture handler.
  // Unlocks iOS speech engine. Harmless on macOS (volume 0, brief silent utterance).
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
    speakNow(text, LANG_CODE[lang] || 'en-US');
  },

  speakSequence(items, gapMs = 250) {
    if (!synth || !items?.length) return;
    if (synth.speaking || synth.pending) synth.cancel();
    let delay = 60;
    items.forEach(({ text, lang }) => {
      setTimeout(() => synth.speak(buildUtterance(text, LANG_CODE[lang] || 'en-US')), delay);
      delay += Math.max(800, text.length * 80) + gapMs;
    });
  },

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

// Some browsers populate voices async — touching getVoices() early helps,
// but we never block on it.
if (synth) {
  synth.getVoices();
  synth.addEventListener?.('voiceschanged', () => synth.getVoices());
}
