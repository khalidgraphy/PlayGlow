// AudioContext must be created/resumed after a user gesture (iOS rule).
// We lazy-init on first call.

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep({ freq, duration, type = 'sine', gain = 0.25 }) {
  const c = ac();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g); g.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export const Audio = {
  correct() {
    beep({ freq: 660, duration: 0.12 });
    setTimeout(() => beep({ freq: 880, duration: 0.18 }), 110);
  },
  wrong() {
    beep({ freq: 240, duration: 0.25, type: 'square', gain: 0.15 });
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.18 }), i * 130));
  },

  async playWord(url) {
    if (!url) return;
    try {
      const a = new window.Audio(url);
      a.playbackRate = 0.9;
      await a.play();
    } catch (e) {
      console.warn('audio play failed', e);
    }
  }
};
