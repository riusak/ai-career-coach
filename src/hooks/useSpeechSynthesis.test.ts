import { describe, expect, it } from 'vitest';
import { cleanSpokenText } from '@/hooks/useSpeechSynthesis';

describe('cleanSpokenText', () => {
  it('strips bracketed emotion tags so TTS speaks clean human sentences', () => {
    const raw = '[rit légèrement] Bonjour et bienvenue ! [hausse un sourcil] Présentez-vous.';
    const cleaned = cleanSpokenText(raw);
    expect(cleaned).toBe('Bonjour et bienvenue ! Présentez-vous.');
  });

  it('strips markdown asterisks actions', () => {
    const raw = '*soupir bienveillant* D’accord, mais concrètement qu’avez-vous fait ?';
    const cleaned = cleanSpokenText(raw);
    expect(cleaned).toBe('D’accord, mais concrètement qu’avez-vous fait ?');
  });

  it('handles multiple consecutive spaces and trims output', () => {
    const raw = '   [curieux]   Très bien...   *sourire*   Passons à la suite.   ';
    const cleaned = cleanSpokenText(raw);
    expect(cleaned).toBe('Très bien... Passons à la suite.');
  });

  it('returns empty string if only tags are present', () => {
    expect(cleanSpokenText('[rit] *sourire*')).toBe('');
  });
});
