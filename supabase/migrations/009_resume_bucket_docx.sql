-- Sprint P1 — Allow DOCX uploads in the private "resumes" bucket
--
-- Aligns the Storage-level constraint with src/lib/resume-validation.ts,
-- which accepts .docx uploads (PDF / DOCX / TXT). Without this, every
-- dashboard .docx upload failed with a raw Storage MIME-policy error.
-- Idempotent: safe to re-run.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes',
  'resumes',
  false,
  5242880, -- 5 MB (must match MAX_RESUME_FILE_SIZE_BYTES in src/lib/resume-validation.ts)
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- NOTE: les buckets Supabase Storage vivent dans la table `storage.buckets`
-- (schéma `storage`) ; PostgreSQL n'a pas de syntaxe `COMMENT ON BUCKET` —
-- la documentation est donc portée par ces commentaires SQL.
-- Whitelist alignée avec la validation applicative
-- (src/lib/resume-validation.ts : PDF, DOCX, TXT — 5 Mo max).
