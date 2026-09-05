import { inferDocumentKind } from '@/lib/analysis/pipeline';
import { DocxExtractionError, extractDocxText } from '@/lib/quick-test/docx-extract';
import { callGeminiJson, isLlmConfigured } from '@/lib/quick-test/llm';
import { PdfExtractionError, extractPdfText } from '@/lib/quick-test/pdf-extract';
import { MAX_RESUME_TEXT_CHARS } from '@/lib/resume-validation';
import type {
  ImportedCertification,
  ImportedEducation,
  ImportedExperience,
  ImportedSkill,
  ProfileImportExtraction,
} from '@/types/profile-import';
import type { SkillLevel } from '@/types/profile';

export type ProfileImportErrorCode =
  | 'invalid_document'
  | 'unreadable_document'
  | 'llm_unavailable'
  | 'llm_failed';

export interface ProfileImportError {
  code: ProfileImportErrorCode;
  message: string;
}

export type ProfileImportExtractionResult =
  | { ok: true; extraction: ProfileImportExtraction }
  | { ok: false; error: ProfileImportError };

const ALLOWED_SKILL_LEVELS: readonly SkillLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

/** Hard caps per section — a malicious/broken LLM payload cannot flood the DB. */
const MAX_EXPERIENCES = 8;
const MAX_SKILLS = 16;
const MAX_EDUCATIONS = 5;
const MAX_CERTIFICATIONS = 5;

function kindError(kind: string | null, fileName: string): ProfileImportError {
  return {
    code: 'invalid_document',
    message: `Type de fichier non supporté « ${kind ?? fileName} ». Formats acceptés : PDF (.pdf), Word (.docx) et texte (.txt).`,
  };
}
/** Extracts plain text from a supported document buffer (PDF/DOCX/TXT). */
export async function extractDocumentText(
  buffer: Buffer,
  fileName: string
): Promise<
  | { ok: true; text: string }
  | { ok: false; error: ProfileImportError }
> {
  const kind = inferDocumentKind(fileName);

  if (kind === 'pdf') {
    try {
      const { text } = extractPdfText(buffer);
      return { ok: true, text: text.slice(0, MAX_RESUME_TEXT_CHARS) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'unreadable_document',
          message:
            error instanceof PdfExtractionError
              ? error.message
              : 'Impossible de lire ce PDF (document scanné ou corrompu ?).',
        },
      };
    }
  }

  if (kind === 'docx') {
    try {
      const { text } = await extractDocxText(buffer);
      return { ok: true, text: text.slice(0, MAX_RESUME_TEXT_CHARS) };
    } catch (error) {
      return {
        ok: false,
        error: {
          code: 'unreadable_document',
          message:
            error instanceof DocxExtractionError
              ? error.message
              : 'Impossible de lire ce document Word. Il est peut-être corrompu.',
        },
      };
    }
  }

  if (kind === 'txt') {
    return { ok: true, text: buffer.toString('utf8').slice(0, MAX_RESUME_TEXT_CHARS) };
  }

  return { ok: false, error: kindError(kind, fileName) };
}

/**
 * French profile-extraction prompt. The document text is embedded (never the
 * raw file): the LLM is asked to return a single JSON object that
 * structurally mirrors `ProfileImportExtraction`.
 */
export function buildProfileExtractionPrompt(documentText: string): string {
  return `Tu es un assistant RH expert. Le texte ci-dessous est extrait d'un CV ou d'un profil LinkedIn exporté en PDF. Extrais-en UNIQUEMENT les informations professionnelles fiables et renvoie UNIQUEMENT un JSON valide (sans texte autour) avec cette structure exacte :
{
  "full_name": "<nom complet de la personne, ou null>",
  "headline": "<titre professionnel / headline, ou null>",
  "bio": "<résumé professionnel de 2-3 phrases (compétences clés, spécialisation), ou null>",
  "location": "<ville / localisation, ou null>",
  "experiences": [
    {
      "company": "<entreprise, obligatoire>",
      "role": "<poste, obligatoire>",
      "description": "<résumé court ou null>",
      "start_date": "<AAAA-MM-AA ou AAAA-MM si la date complète est inconnue, ou null>",
      "end_date": "<idem, ou null si poste actuel>",
      "is_current": <true si le poste est en cours>,
      "technologies": ["<technologies/mots-clés techniques>"],
      "key_missions": ["<réalisations clés, 1-3 par expérience>"]
    }
  ],
  "skills": [{"skill_name": "<compétence, obligatoire>", "level": "<beginner | intermediate | advanced | expert>", "category": "<catégorie: technique, management, langues… ou null>"}],
  "educations": [{"institution": "<établissement, obligatoire>", "degree": "<diplôme ou null>", "field_of_study": "<domaine d'étude ou null>", "start_date": "<AAAA-MM-AA ou null>", "end_date": "<idem>", "is_current": <true si en cours>}],
  "certifications": [{"name": "<nom, obligatoire>", "issuer": "<organisme ou null>", "issue_date": "<AAAA-MM-AA ou null>"}]
}

Règles strictes :
- N'invente JAMAIS une entreprise, un poste, une date ou une compétence absente du texte.
- "experiences" : maximum 8 entrées, ordonnées de la plus récente à la plus ancienne.
- "skills" : maximum 16 entrées, déduites du texte (stack technique, méthodologies, langues).
- "educations" : maximum 5 entrées.
- "certifications" : maximum 5 entrées.
- La date "end_date" est null quand le poste est marqué actuel.
- Toute valeur inconnue vaut null ; les tableaux restent vides si rien n'est détecté.

TEXTE DU DOCUMENT :
${documentText}`;
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNullableString(value: unknown): string | null | undefined {
  const str = asString(value);
  // `undefined` keeps the caller's default; null explicitly clears the field.
  return str === null ? null : str;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asStringArray(value: unknown, cap: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, cap);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
function coerceExperience(raw: unknown): ImportedExperience | null {
  const record = asRecord(raw);
  if (!record) return null;
  const company = asString(record.company);
  const role = asString(record.role);
  if (!company || !role) return null;
  return {
    company,
    role,
    description: asNullableString(record.description),
    start_date: asNullableString(record.start_date),
    end_date: asNullableString(record.end_date),
    is_current: asBoolean(record.is_current),
    technologies: asStringArray(record.technologies, 12),
    key_missions: asStringArray(record.key_missions, 4),
  };
}

function coerceEducation(raw: unknown): ImportedEducation | null {
  const record = asRecord(raw);
  if (!record) return null;
  const institution = asString(record.institution);
  if (!institution) return null;
  return {
    institution,
    degree: asNullableString(record.degree),
    field_of_study: asNullableString(record.field_of_study),
    start_date: asNullableString(record.start_date),
    end_date: asNullableString(record.end_date),
    is_current: asBoolean(record.is_current),
  };
}

function coerceSkill(raw: unknown): ImportedSkill | null {
  const record = asRecord(raw);
  if (!record) return null;
  const skillName = asString(record.skill_name);
  if (!skillName) return null;
  const rawLevel = asString(record.level) ?? 'intermediate';
  const level: SkillLevel = ALLOWED_SKILL_LEVELS.includes(rawLevel as SkillLevel)
    ? (rawLevel as SkillLevel)
    : 'intermediate';
  return { skill_name: skillName, level, category: asNullableString(record.category) };
}

function coerceCertification(raw: unknown): ImportedCertification | null {
  const record = asRecord(raw);
  if (!record) return null;
  const name = asString(record.name);
  if (!name) return null;
  return {
    name,
    issuer: asNullableString(record.issuer),
    issue_date: asNullableString(record.issue_date),
  };
}

/**
 * Defensively coerces the raw LLM payload into the `ProfileImportExtraction`
 * shape. Invalid section entries are dropped; a payload that is not an object
 * at all yields null (degraded → `llm_failed` in the caller).
 */
export function coerceProfileImportExtraction(
  raw: unknown
): ProfileImportExtraction | null {
  const record = asRecord(raw);
  if (!record) return null;
  return {
    full_name: asString(record.full_name) ?? null,
    headline: asString(record.headline) ?? null,
    bio: asString(record.bio) ?? null,
    location: asString(record.location) ?? null,
    experiences: (Array.isArray(record.experiences) ? record.experiences : [])
      .map(coerceExperience)
      .filter((item): item is ImportedExperience => item !== null)
      .slice(0, MAX_EXPERIENCES),
    skills: (Array.isArray(record.skills) ? record.skills : [])
      .map(coerceSkill)
      .filter((item): item is ImportedSkill => item !== null)
      .slice(0, MAX_SKILLS),
    educations: (Array.isArray(record.educations) ? record.educations : [])
      .map(coerceEducation)
      .filter((item): item is ImportedEducation => item !== null)
      .slice(0, MAX_EDUCATIONS),
    certifications: (Array.isArray(record.certifications) ? record.certifications : [])
      .map(coerceCertification)
      .filter((item): item is ImportedCertification => item !== null)
      .slice(0, MAX_CERTIFICATIONS),
  };
}

/**
 * Runs the smart profile-import extraction: reads the document text, sends it
 * to Gemini with the strict profile schema and coerces the result. Fails
 * explicitly (no silent fallback) — mirroring the deep-analysis pipeline
 * contract used elsewhere in the app.
 */
export async function extractProfileFromDocument(
  buffer: Buffer,
  fileName: string
): Promise<ProfileImportExtractionResult> {
  const textResult = await extractDocumentText(buffer, fileName);
  if (!textResult.ok) return { ok: false, error: textResult.error };

  if (!isLlmConfigured()) {
    return {
      ok: false,
      error: {
        code: 'llm_unavailable',
        message:
          "Configuration serveur incomplète : la clé d'API IA (GEMINI_API_KEY) n'est pas définie sur le serveur.",
      },
    };
  }

  const raw = await callGeminiJson<unknown>(
    buildProfileExtractionPrompt(textResult.text),
    { timeoutMs: 20_000, temperature: 0.1 }
  );

  if (!raw) {
    return {
      ok: false,
      error: {
        code: 'llm_failed',
        message:
          "L'extraction IA n'a pas abouti après plusieurs tentatives (service momentanément saturé ou indisponible). Veuillez réessayer.",
      },
    };
  }

  const extraction = coerceProfileImportExtraction(raw);
  if (!extraction) {
    return {
      ok: false,
      error: {
        code: 'llm_failed',
        message: "L'extraction IA a renvoyé une réponse inexploitable. Veuillez réessayer.",
      },
    };
  }

  return { ok: true, extraction };
}