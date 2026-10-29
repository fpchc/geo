export const MATERIAL_MAX_BYTES = 20 * 1024 * 1024;
export const MATERIAL_EXTENSIONS = ['txt', 'md', 'pdf', 'docx'] as const;

export type MaterialValidationError = 'format' | 'size';

export type MaterialValidationResult =
  | { ok: true }
  | { ok: false; reason: MaterialValidationError };

export function validateMaterialFile(file: {
  name: string;
  size: number;
}): MaterialValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!MATERIAL_EXTENSIONS.includes(extension as (typeof MATERIAL_EXTENSIONS)[number])) {
    return { ok: false, reason: 'format' };
  }

  if (file.size <= 0 || file.size > MATERIAL_MAX_BYTES) {
    return { ok: false, reason: 'size' };
  }

  return { ok: true };
}
