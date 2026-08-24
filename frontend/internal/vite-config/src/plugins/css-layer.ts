import type { Plugin } from 'vite';

interface CssLayerRule {
  /** 层名，需在 css 中先于 @import 'tailwindcss' 声明层顺序（见 internal/tailwind-config/theme.css） */
  layerName: string;
  /** 需要包层的包名（匹配该包在 node_modules 下的 css 模块 id） */
  packageName: string;
}

/**
 * 完整层顺序声明。生产构建时 lightningcss 会把 theme.css 里的
 * `@layer theme, base, ..., el, ..., utilities;` 声明中「已存在 @layer 块」的层名剔除，
 * 且组件库的 @layer 块在打包物理顺序上早于该声明，导致 el 层被按首次出现顺序注册为
 * 低于 base 的优先级，base 的 preflight（border-width:0 等）反压过组件样式。
 * 因此在（物理位置最靠前的）组件库 css 前显式补一份完整层顺序声明，锁定层级。
 * 顺序必须与 tailwind-config/theme.css 的声明保持一致。
 */
const LAYER_ORDER_DECLARATION =
  '@layer theme, base, ant, antd, el, td, components, utilities;';

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * 把指定包内的 css 包进 @layer：
 * 组件库的 css 是无层样式，无层样式在级联中永远压过 @layer 内的 Tailwind 工具类；
 * 包层后由 theme.css 的层声明决定顺序（utilities 排在组件库层之后），
 * 使 Tailwind 工具类可以覆盖组件库样式。
 *
 * @example
 * ```ts
 * plugins: [viteCssLayerPlugin({ packageName: 'element-plus', layerName: 'el' })]
 * ```
 */
export function viteCssLayerPlugin(
  rules: CssLayerRule | CssLayerRule[],
): Plugin {
  const list = Array.isArray(rules) ? rules : [rules];
  const matchers = list.map(({ layerName, packageName }) => ({
    layerName,
    regex: new RegExp(`${escapeRegExp(packageName)}[\\\\/].+\\.css$`, 'i'),
  }));
  return {
    name: 'vite-plugin-css-layer',
    enforce: 'pre',
    transform(code, id) {
      const [file] = id.split('?', 1);
      if (!file) return;
      const matched = matchers.find((m) => m.regex.test(file));
      if (matched) {
        // 前置完整层顺序声明，确保 el 等组件层的优先级高于 base（不被 base 的 preflight 覆盖）。
        return {
          code: `${LAYER_ORDER_DECLARATION}\n@layer ${matched.layerName} {\n${code}\n}`,
          map: null,
        };
      }
    },
  };
}
