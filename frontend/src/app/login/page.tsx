import { getTranslations } from 'next-intl/server';
import { Brand, BrandMark } from '@/components/brand-mark';
import { LoginForm } from '@/components/login-form';
import { LoginTimeline } from '@/components/login-timeline';
import { ThemeToggle } from '@/components/theme-toggle';
import { safeNextPath } from '@/lib/auth/redirect';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const t = await getTranslations('Login');
  const sidebarT = await getTranslations('Sidebar');
  const points = [t('point1'), t('point2'), t('point3')];

  return (
    <LoginTimeline>
      <div className="grid min-h-dvh grid-cols-1 sm:grid-cols-[1.05fr_1fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden p-10 text-white [background:var(--login-art-bg)] sm:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(var(--login-grid-line)_1px,transparent_1px),linear-gradient(90deg,var(--login-grid-line)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(circle_at_50%_50%,black_30%,transparent_75%)]"
          />
          <span
            aria-hidden="true"
            data-login="orb"
            className="pointer-events-none absolute -top-[90px] -left-[70px] size-[320px] rounded-full blur-[44px] [background:var(--login-orb-a)]"
          />
          <span
            aria-hidden="true"
            data-login="orb"
            className="pointer-events-none absolute -right-20 bottom-[8%] size-[300px] rounded-full blur-[44px] [background:var(--login-orb-b)]"
          />

          <div
            data-login="brand"
            className="relative z-[1] flex items-center gap-2.5 text-sm font-semibold"
          >
            <BrandMark />
            GEO Studio
          </div>

          <div className="relative z-[1] max-w-[420px]">
            <h2
              data-login="quote"
              className="m-0 text-[30px] leading-[1.3] font-semibold tracking-[-0.01em]"
            >
              {t('quoteLine1')}
              <br />
              {t('quoteLine2')}
            </h2>
            <p
              data-login="positioning"
              className="mt-3 mb-0 text-[13px] leading-[1.7] text-white/55"
            >
              {t('positioning')}
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              {points.map((point, index) => (
                <span
                  key={point}
                  data-login="point"
                  className="flex items-center gap-2.5 text-xs text-white/75"
                >
                  <i className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/10 text-2xs text-[color:var(--login-chip-fg)] not-italic shadow-[inset_0_0_0_1px_var(--login-chip-ring)]">
                    {`0${index + 1}`}
                  </i>
                  {point}
                </span>
              ))}
            </div>
          </div>

          <p className="relative z-[1] text-[11px] text-white/35">{t('footer')}</p>
        </section>

        <main className="relative grid place-items-center bg-card px-6 py-12 [background-image:var(--login-form-glow)] sm:p-10">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div data-login="form" className="w-full max-w-[340px]">
            <div className="mb-8 sm:hidden">
              <Brand tagline={sidebarT('brandTagline')} />
            </div>
            <h1 className="m-0 text-2xl font-semibold">{t('title')}</h1>
            <p className="mt-1.5 mb-6 text-[13px] text-muted-foreground">{t('description')}</p>
            <LoginForm nextPath={safeNextPath(next)} />
          </div>
        </main>
      </div>
    </LoginTimeline>
  );
}
