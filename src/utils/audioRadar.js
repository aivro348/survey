/**
 * Audio Radar Proximity Pulse Synthesizer
 * Generates Geiger-counter style audio beeps that increase in frequency
 * as the user approaches the target survey corner peg.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a single short beep
 * @param {number} frequency - Hz (higher = closer)
 * @param {number} duration - seconds
 * @param {number} volume - 0 to 1
 */
export function playBeep(frequency = 880, duration = 0.08, volume = 0.3) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Silently fail if audio context is not available
  }
}

/**
 * Play a success chime (two-note ascending)
 */
export function playSuccessChime() {
  playBeep(660, 0.15, 0.4);
  setTimeout(() => playBeep(880, 0.2, 0.5), 170);
  setTimeout(() => playBeep(1100, 0.3, 0.4), 380);
}

/**
 * Calculate beep interval based on distance to target (in meters)
 * Closer = faster beeps
 * Returns interval in milliseconds, or null if too far to beep
 */
export function getBeepInterval(distanceMeters) {
  if (distanceMeters > 100) return null;       // Too far, no beeping
  if (distanceMeters > 50) return 2000;        // Far: slow beep
  if (distanceMeters > 20) return 1200;        // Approaching: moderate
  if (distanceMeters > 10) return 700;         // Close: fast
  if (distanceMeters > 5) return 400;          // Very close: rapid
  if (distanceMeters > 2) return 200;          // Almost there: very rapid
  return 100;                                  // Sub 2m: continuous rapid
}

/**
 * Get beep frequency based on distance (closer = higher pitch)
 */
export function getBeepFrequency(distanceMeters) {
  if (distanceMeters > 50) return 440;
  if (distanceMeters > 20) return 660;
  if (distanceMeters > 10) return 880;
  if (distanceMeters > 5) return 1100;
  if (distanceMeters > 2) return 1320;
  return 1500;
}

/**
 * Trigger vibration if supported (for mobile devices)
 */
export function vibrateDevice(pattern = [100]) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

/**
 * Resume audio context (must be called after user gesture)
 */
export function resumeAudioContext() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* ignore */ }
}
