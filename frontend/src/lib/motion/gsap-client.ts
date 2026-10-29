export type GsapInstance = typeof import('gsap').gsap;
export type ScrollTriggerInstance = typeof import('gsap/ScrollTrigger').ScrollTrigger;

let gsapPromise: Promise<GsapInstance> | null = null;

export function loadGsap(): Promise<GsapInstance> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('GSAP is client-only.'));
  }

  gsapPromise ??= import('gsap').then((module) => module.gsap);

  return gsapPromise;
}

export async function loadGsapWithScrollTrigger(): Promise<{
  gsap: GsapInstance;
  ScrollTrigger: ScrollTriggerInstance;
}> {
  const [gsap, module] = await Promise.all([loadGsap(), import('gsap/ScrollTrigger')]);
  const ScrollTrigger = module.ScrollTrigger;

  gsap.registerPlugin(ScrollTrigger);

  return { gsap, ScrollTrigger };
}
