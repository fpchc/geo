import { describe, expect, it } from 'vitest';
import { MATERIAL_MAX_BYTES, validateMaterialFile } from './material-validation';

describe('validateMaterialFile', () => {
  it.each(['notes.txt', 'notes.md', 'notes.pdf', 'notes.docx'])('accepts %s', (name) => {
    expect(validateMaterialFile({ name, size: 10 })).toEqual({ ok: true });
  });

  it('rejects unsupported extensions', () => {
    expect(validateMaterialFile({ name: 'notes.exe', size: 10 })).toEqual({
      ok: false,
      reason: 'format',
    });
  });

  it('rejects empty and oversized files', () => {
    expect(validateMaterialFile({ name: 'notes.txt', size: 0 })).toEqual({
      ok: false,
      reason: 'size',
    });
    expect(validateMaterialFile({ name: 'notes.txt', size: MATERIAL_MAX_BYTES + 1 })).toEqual({
      ok: false,
      reason: 'size',
    });
  });

  it('accepts a file exactly at the limit', () => {
    expect(validateMaterialFile({ name: 'notes.txt', size: MATERIAL_MAX_BYTES })).toEqual({
      ok: true,
    });
  });
});
