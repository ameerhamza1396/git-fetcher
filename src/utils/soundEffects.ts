/**
 * Plays answer feedback sounds using pre-recorded MP3 files.
 */

let correctAudio: HTMLAudioElement | null = null;
let incorrectAudio: HTMLAudioElement | null = null;

export const playCorrectSound = () => {
  try {
    if (!correctAudio) {
      correctAudio = new Audio('/soundeffects/correct.mp3');
    }
    correctAudio.currentTime = 0;
    correctAudio.play().catch(() => {});
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
};

export const playIncorrectSound = () => {
  try {
    if (!incorrectAudio) {
      incorrectAudio = new Audio('/soundeffects/incorrect.mp3');
    }
    incorrectAudio.currentTime = 0;
    incorrectAudio.play().catch(() => {});
  } catch (e) {
    console.warn('Sound playback failed:', e);
  }
};
