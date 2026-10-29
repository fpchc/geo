export type NavSource = 'static' | 'backend';

/**
 * 过渡开关：ticket 20 落地前默认使用静态导航，ticket 21 切换后改为 backend 并删除静态实现。
 */
export const NAV_SOURCE: NavSource = process.env.NAV_SOURCE === 'backend' ? 'backend' : 'static';
