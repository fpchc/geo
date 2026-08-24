const BasicLayout = () => import('./basic.vue');
const AuthPageLayout = () => import('./auth.vue');

const IFrameView = () => import('@frontend/layouts').then((m) => m.IFrameView);

export { AuthPageLayout, BasicLayout, IFrameView };
