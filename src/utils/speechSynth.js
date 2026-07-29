/**
 * Speech Synthesis Utility for Hands-Free Voice Navigation
 * Uses the Web Speech API (window.speechSynthesis) to speak
 * turn-by-turn directional prompts while walking in the field.
 */

let speechEnabled = true;
let lastSpokenText = '';
let lastSpokenTime = 0;
const MIN_SPEAK_INTERVAL = 3000; // Minimum 3 seconds between voice prompts

/**
 * Speak a text string using the browser's speech synthesis
 * Prevents duplicate rapid calls
 */
export function speak(text) {
  if (!speechEnabled) return;
  if (!window.speechSynthesis) return;

  const now = Date.now();
  if (text === lastSpokenText && now - lastSpokenTime < MIN_SPEAK_INTERVAL) return;

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  utterance.lang = 'en-US';

  // Try to use a clear voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Samantha'));
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
  lastSpokenText = text;
  lastSpokenTime = now;
}

/**
 * Speak navigation guidance based on distance and direction
 */
export function speakNavigation(distanceMeters, directionLabel) {
  if (distanceMeters < 1.0) {
    speak('You have reached the target corner peg!');
  } else if (distanceMeters < 3) {
    speak(`Almost there. ${distanceMeters.toFixed(1)} meters remaining.`);
  } else if (distanceMeters < 10) {
    const clean = directionLabel.replace(/[⬆️⬇️↗️↖️➡️⬅️]/g, '').trim();
    speak(clean);
  } else {
    const clean = directionLabel.replace(/[⬆️⬇️↗️↖️➡️⬅️]/g, '').trim();
    speak(clean);
  }
}

/**
 * Announce point selection
 */
export function speakPointSelected(pointIndex) {
  speak(`Navigating to corner point ${pointIndex}`);
}

/**
 * Announce ground verification success
 */
export function speakVerified(pointIndex) {
  speak(`Point ${pointIndex} verified on ground. Well done!`);
}

/** Toggle voice guidance on/off */
export function toggleSpeech() {
  speechEnabled = !speechEnabled;
  if (!speechEnabled) window.speechSynthesis?.cancel();
  return speechEnabled;
}

/** Get current speech enabled state */
export function isSpeechEnabled() {
  return speechEnabled;
}
