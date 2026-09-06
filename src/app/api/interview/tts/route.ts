import { NextResponse } from 'next/server';
import { cleanSpokenText } from '@/hooks/useSpeechSynthesis';
import type { InterviewLanguage, InterviewerId } from '@/types/interview';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Simple in-memory cache to avoid re-generating audio for identical prompts (like greetings)
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_ITEMS = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      speakerId?: InterviewerId;
      language?: InterviewLanguage;
    };

    if (!body || typeof body.text !== 'string' || !body.text.trim()) {
      return NextResponse.json({ error: 'Texte requis pour la synthèse vocale.' }, { status: 400 });
    }

    const cleanedText = cleanSpokenText(body.text);
    if (!cleanedText) {
      return NextResponse.json({ error: 'Texte vide après nettoyage.' }, { status: 400 });
    }

    const language = body.language === 'en' ? 'en' : 'fr';
    const speakerId = body.speakerId === 'marc' ? 'marc' : 'alisor';

    // Select neural voice
    const voice =
      language === 'en'
        ? speakerId === 'marc'
          ? 'en-US-GuyNeural'
          : 'en-US-JennyNeural'
        : speakerId === 'marc'
        ? 'fr-FR-HenriNeural'
        : 'fr-FR-DeniseNeural';

    const cacheKey = `${voice}:${cleanedText}`;
    if (audioCache.has(cacheKey)) {
      const cached = audioCache.get(cacheKey)!;
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': cached.length.toString(),
          'Cache-Control': 'public, max-age=86400, immutable',
        },
      });
    }

    // Dynamic import to keep edge-tts isolated to node runtime
    let buffer: Buffer;
    try {
      const { Communicate } = await import('edge-tts-universal');
      const communicate = new Communicate(cleanedText, { voice });

      const chunks: Buffer[] = [];

      // Race with a 15s timeout so we don't hang the serverless function
      const streamPromise = (async () => {
        for await (const chunk of communicate.stream()) {
          if (chunk.type === 'audio' && chunk.data) {
            chunks.push(chunk.data);
          }
        }
      })();

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TTS stream timeout (15s)')), 15_000)
      );

      await Promise.race([streamPromise, timeoutPromise]);

      if (chunks.length === 0) {
        console.warn('[api/interview/tts] No audio chunks received from edge-tts');
        return NextResponse.json(
          { error: 'Synthèse vocale indisponible. Utilisation du fallback navigateur.' },
          { status: 503 }
        );
      }

      buffer = Buffer.concat(chunks);
    } catch (ttsErr) {
      console.warn(
        '[api/interview/tts] Edge-TTS generation failed, client should fall back to browser TTS:',
        ttsErr instanceof Error ? ttsErr.message : ttsErr
      );
      return NextResponse.json(
        { error: 'Synthèse vocale temporairement indisponible.' },
        { status: 503 }
      );
    }

    // Save to memory cache
    if (audioCache.size >= MAX_CACHE_ITEMS) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(cacheKey, buffer);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err) {
    console.error('[api/interview/tts] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne de synthèse vocale.' },
      { status: 500 }
    );
  }
}

