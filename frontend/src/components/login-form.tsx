'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

type LoginValues = z.infer<typeof loginSchema>;

interface ErrorBody {
  code?: number;
  message?: string;
}

export function LoginForm({ nextPath }: { nextPath: string }) {
  const t = useTranslations('Login');
  const router = useRouter();
  const usernameId = useId();
  const passwordId = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setServerError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ErrorBody | null;

        if (body?.code === 20002) {
          setServerError(t('accountDisabled'));
        } else if (body?.code === 20001 || body?.code === 20003 || body?.code === 20004) {
          setServerError(t('invalidCredentials'));
        } else {
          setServerError(body?.message ?? t('error'));
        }
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } catch {
      setServerError(t('error'));
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1">
        <Label htmlFor={usernameId} className="text-2xs font-normal text-muted-foreground">
          {t('username')}
        </Label>
        <Input
          id={usernameId}
          autoComplete="username"
          className="h-[38px]"
          aria-invalid={Boolean(errors.username)}
          {...register('username')}
        />
        {errors.username ? (
          <p className="text-sm text-destructive">{t('usernameRequired')}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor={passwordId} className="text-2xs font-normal text-muted-foreground">
          {t('password')}
        </Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          className="h-[38px]"
          aria-invalid={Boolean(errors.password)}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive">{t('passwordRequired')}</p>
        ) : null}
      </div>

      {serverError ? (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" className="mt-1.5 h-[38px] w-full" disabled={isSubmitting}>
        {isSubmitting ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
