import mammoth from 'mammoth';

export interface DocxExtractionResult {
  text: string;
  messages: string[];
}

export class DocxExtractionError extends Error {}

export function isDocxBuffer(data: Buffer): boolean {
  const magic = data.subarray(0, 4);
  return magic[0] === 0x50 && magic[1] === 0x4b && magic[2] === 0x03 && magic[3] === 0x04;
}

export async function extractDocxText(data: Buffer): Promise<DocxExtractionResult> {
  if (!isDocxBuffer(data)) {
    throw new DocxExtractionError('Not a valid DOCX document (missing ZIP signature).');
  }

  try {
    const result = await mammoth.extractRawText({ buffer: data });
    return {
      text: result.value,
      messages: result.messages.map((m) => m.message),
    };
  } catch (error) {
    if (error instanceof DocxExtractionError) {
      throw error;
    }
    throw new DocxExtractionError(
      error instanceof Error ? error.message : 'Failed to extract text from DOCX.'
    );
  }
}
