'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { DashboardTrendPoint } from '@/lib/api/dashboard-client';
import { buildSparkline, contentCountSeries } from '@/lib/dashboard/metrics';
import { loadGsapWithScrollTrigger } from '@/lib/motion/gsap-client';

export function TrendChart({
  points,
  ariaLabel,
}: {
  points: DashboardTrendPoint[];
  ariaLabel: string;
}) {
  const t = useTranslations('DashboardMetrics');
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const gradientId = `trend-${useId().replace(/:/g, '')}`;
  const series = contentCountSeries(points);
  const chart = buildSparkline(series);
  const chartKey = series.join(',');

  useEffect(() => {
    const element = containerRef.current;

    if (!element || reduced || !chartKey) {
      return;
    }

    let cancelled = false;
    let revert: (() => void) | undefined;

    void loadGsapWithScrollTrigger()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const hero = containerRef.current.closest<HTMLElement>('.dashboard-hero');
        const context = gsap.context(() => {
          const orb = hero?.querySelector<HTMLElement>('.hero-orb');
          const grid = hero?.querySelector<HTMLElement>('.hero-grid');

          if (hero && orb) {
            gsap.to(orb, {
              x: 18,
              scale: 1.14,
              duration: 14,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true,
            });
            gsap.to(orb, {
              yPercent: 18,
              ease: 'none',
              scrollTrigger: {
                trigger: hero,
                start: 'top top',
                end: 'bottom top',
                scrub: true,
              },
            });
          }

          if (hero && grid) {
            gsap.to(grid, {
              backgroundPosition: '0px 120px',
              ease: 'none',
              scrollTrigger: {
                trigger: hero,
                start: 'top top',
                end: 'bottom top',
                scrub: true,
              },
            });
          }

          const line = containerRef.current?.querySelector<SVGPathElement>('.chart-line');
          const area = containerRef.current?.querySelector<SVGPathElement>('.chart-area');
          const dots = containerRef.current?.querySelectorAll<SVGCircleElement>('.chart-dot');
          const gridLines =
            containerRef.current?.querySelectorAll<SVGLineElement>('.chart-grid-line');
          const pulse = containerRef.current?.querySelector<SVGCircleElement>('.chart-pulse');

          if (line && area && dots && gridLines && pulse && dots.length > 0) {
            const length = line.getTotalLength();

            gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
            gsap.set(area, { opacity: 0 });
            gsap.set(dots, { scale: 0, opacity: 0, transformOrigin: 'center' });
            gsap.set(gridLines, { opacity: 0 });
            gsap.set(pulse, { attr: { r: 4.5, opacity: 0 } });

            gsap
              .timeline({ defaults: { ease: 'power2.out' } })
              .to(gridLines, { opacity: 1, duration: 0.5, stagger: 0.04 })
              .to(line, { strokeDashoffset: 0, duration: 1.1 }, 0.1)
              .to(area, { opacity: 1, duration: 0.8 }, 0.35)
              .to(
                dots,
                { scale: 1, opacity: 1, duration: 0.4, stagger: 0.055, ease: 'back.out(2)' },
                0.4,
              )
              .to(pulse, { attr: { r: 4.5, opacity: 1 }, duration: 0.5 }, 0.9)
              .to(
                pulse,
                { attr: { r: 14, opacity: 0 }, duration: 2.4, repeat: -1, ease: 'power1.out' },
                1.4,
              );
          }

          ScrollTrigger.refresh();
        }, element);

        revert = () => context.revert();
      })
      .catch(() => {
        revert = undefined;
      });

    return () => {
      cancelled = true;
      revert?.();
    };
  }, [chartKey, reduced]);

  return (
    <div ref={containerRef} data-testid="trend-chart" className="relative mt-4 min-h-[190px]">
      {chart ? (
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
          className="h-[190px] w-full overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopOpacity="0.22" style={{ stopColor: 'var(--chart-line)' }} />
              <stop offset="1" stopOpacity="0" style={{ stopColor: 'var(--chart-line)' }} />
            </linearGradient>
          </defs>
          <g>
            {[0, 1, 2, 3, 4].map((index) => {
              const y = 18 + (164 * index) / 4;

              return (
                <line
                  key={index}
                  className="chart-grid-line"
                  x1="0"
                  y1={y}
                  x2={chart.width}
                  y2={y}
                  vectorEffect="non-scaling-stroke"
                  style={{ stroke: 'var(--line)', strokeDasharray: '3 5' }}
                />
              );
            })}
          </g>
          <path className="chart-area" d={chart.areaPath} fill={`url(#${gradientId})`} />
          <path
            className="chart-line"
            d={chart.linePath}
            fill="none"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: 'var(--chart-line)' }}
          />
          {chart.points.map((point) => (
            <circle
              key={`${point.x}-${point.y}`}
              className="chart-dot"
              cx={point.x}
              cy={point.y}
              r="2.8"
              strokeWidth="1.8"
              style={{ fill: 'var(--card)', stroke: 'var(--chart-line)' }}
            />
          ))}
          {chart.points.length > 0 ? (
            <>
              <circle
                className="chart-pulse"
                cx={chart.points[chart.points.length - 1]?.x}
                cy={chart.points[chart.points.length - 1]?.y}
                r="4.5"
                fill="none"
                strokeWidth="1.5"
                style={{ stroke: 'var(--chart-line)' }}
              />
              <circle
                cx={chart.points[chart.points.length - 1]?.x}
                cy={chart.points[chart.points.length - 1]?.y}
                r="3.6"
                style={{ fill: 'var(--chart-line)' }}
              />
            </>
          ) : null}
        </svg>
      ) : (
        <div className="flex h-[190px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70">
          <svg viewBox="0 0 720 80" className="h-16 w-full" role="presentation">
            <line
              x1="14"
              y1="40"
              x2="706"
              y2="40"
              stroke="var(--muted-dot)"
              strokeDasharray="4 8"
              strokeWidth="1.5"
            />
          </svg>
          <p className="text-xs text-muted-foreground">{t('trendsEmpty')}</p>
        </div>
      )}
    </div>
  );
}
