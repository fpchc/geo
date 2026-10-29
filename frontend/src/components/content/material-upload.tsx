'use client';

import { Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { type Material, uploadMaterial } from '@/lib/api/content-client';
import { validateMaterialFile } from '@/lib/content/material-validation';

const MATERIAL_INPUT_ID = 'studio-material-upload';

export function MaterialUpload({
  materials,
  onChange,
}: {
  materials: Material[];
  onChange: (next: Material[]) => void;
}) {
  const t = useTranslations('Studio');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) {
      return;
    }

    setError(null);
    const validation = validateMaterialFile(file);

    if (!validation.ok) {
      setError(validation.reason === 'format' ? t('materialFormatError') : t('materialSizeError'));
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const material = await uploadMaterial(file, setProgress);
      onChange([...materials, material]);
      setProgress(100);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t('materialUploadError'));
    } finally {
      setUploading(false);
      setFileName(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={MATERIAL_INPUT_ID}
        type="file"
        accept=".txt,.md,.pdf,.docx"
        aria-label={t('materials')}
        disabled={uploading}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          setFileName(file?.name ?? null);
          void handleFile(file);
        }}
      />
      <label
        htmlFor={MATERIAL_INPUT_ID}
        className="mt-2 grid cursor-pointer place-items-center gap-1 rounded-xl border border-dashed border-foreground/20 px-2.5 py-[18px] text-center text-[11px] text-muted-foreground transition-[border-color,background-color,transform,box-shadow] duration-200 ease-spring hover:-translate-y-0.5 hover:border-primary hover:bg-accent hover:shadow-[0_12px_24px_-16px_rgba(79,70,229,0.55)]"
      >
        <Upload className="size-[18px]" aria-hidden="true" />
        <span>{t('materialChoose')}</span>
        <span className="text-2xs text-muted-foreground">{t('materialHint')}</span>
      </label>
      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
        {fileName ?? t('materialNoFile')}
      </p>
      {uploading ? (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('materialUploading', { progress })}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      ) : null}
      {materials.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {materials.map((material) => (
            <li
              key={material.id}
              className="flex items-center gap-2 rounded-[9px] border border-border bg-card px-2.5 py-2 text-xs"
            >
              <span className="min-w-0 flex-1 truncate">{material.filename}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {t('materialCharCount', { count: material.char_count })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={t('materialRemove', { filename: material.filename })}
                onClick={() => onChange(materials.filter((item) => item.id !== material.id))}
              >
                <X className="size-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">{t('materialEmpty')}</p>
      )}
    </div>
  );
}
