/**
 * Client-side one-shot hand-off for the dashboard « flash upload » flow.
 *
 * A `File` cannot travel through a URL or RSC payload, and sessionStorage is
 * synchronous + base64-hostile for 5 MB documents. Since dashboard → CVs
 * navigation is a client-side transition (same JS runtime), the picked file
 * is parked in this module-scoped slot; the upload dropzone of the CV library
 * (/dashboard/cvs) consumes it once on mount and runs the standard flash
 * upload server action.
 *
 * Security note: the file only ever lives in the memory of the already
 * authenticated tab and is uploaded exclusively through the standard
 * validated server action.
 */

let pendingFile: File | null = null;

/** Parks the file picked from the dashboard (replaces any previous one). */
export function setPendingCvUploadFile(file: File | null): void {
  pendingFile = file;
}

/** Consumes the parked file (single read — the slot is cleared). */
export function consumePendingCvUploadFile(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
