// R2 wiring deferred to next phase. For now we serve emoji from D1
// and the frontend renders them; once R2 is bound + a custom domain
// is set, swap getImageUrl/getAudioUrl to point at the CDN.

const CDN_BASE = ''; // e.g. 'https://cdn.wordglow.app'

export function getImageUrl(filename) {
  if (!filename || !CDN_BASE) return null;
  return `${CDN_BASE}/images/${filename}`;
}

export function getAudioUrl(language, word) {
  if (!CDN_BASE) return null;
  return `${CDN_BASE}/audio/${language}/${word}.mp3`;
}

// Temporary fallback: Google Translate TTS. Replace with R2 audio once recorded.
// Note: this is a public unauthenticated endpoint; fine for dev, swap for prod.
export function getFallbackTTS(language, word) {
  const tl = language === 'ar' ? 'ar' : language === 'ur' ? 'ur' : 'en';
  const q = encodeURIComponent(word);
  return `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${q}`;
}
