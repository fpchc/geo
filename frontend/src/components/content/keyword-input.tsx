'use client';

import { X } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function KeywordInput({
  value,
  onChange,
  onBlur,
  placeholder,
  addLabel,
  removeLabel,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  placeholder: string;
  addLabel: string;
  removeLabel: (keyword: string) => string;
}) {
  const [draft, setDraft] = useState('');

  function commit() {
    const keyword = draft.trim();

    if (!keyword) {
      return;
    }

    if (!value.includes(keyword)) {
      onChange([...value, keyword]);
    }

    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
      return;
    }

    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Input
          aria-label={placeholder}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            commit();
            onBlur?.();
          }}
        />
        <Button type="button" variant="outline" onClick={commit}>
          {addLabel}
        </Button>
      </div>
      {value.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((keyword) => (
            <span
              key={keyword}
              className="inline-flex animate-[popIn_0.2s_var(--ease-spring)] items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-[3px] text-[11px] text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary-strong"
            >
              {keyword}
              <button
                type="button"
                aria-label={removeLabel(keyword)}
                className="text-[13px] leading-none text-muted-foreground transition-[transform,color] duration-150 hover:rotate-90 hover:text-destructive"
                onClick={() => onChange(value.filter((item) => item !== keyword))}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
