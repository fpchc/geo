import type { CSSOptions, UserConfig } from 'vite';

import type { DefineApplicationOptions } from '../typing';

import path, { relative } from 'node:path';

import { findMonorepoRoot } from '@frontend/node-utils';

import { NodePackageImporter } from 'sass-embedded';
import { defineConfig, loadEnv, mergeConfig } from 'vite';

import { defaultImportmapOptions, getDefaultPwaOptions } from '../options';
import { loadApplicationPlugins } from '../plugins';
import { loadAndConvertEnv } from '../utils/env';
import { getCommonConfig } from './common';

function defineApplicationConfig(userConfigPromise?: DefineApplicationOptions) {
  return defineConfig(async (config) => {
    const options = await userConfigPromise?.(config);
    const { appTitle, base, port, ...envConfig } = await loadAndConvertEnv();
    const { command, mode } = config;
    const { application = {}, vite = {} } = options || {};
    const root = process.cwd();
    const isBuild = command === 'build';
    const env = loadEnv(mode, root);

    const plugins = await loadApplicationPlugins({
      archiver: true,
      archiverPluginOptions: {},
      compress: false,
      compressTypes: ['brotli', 'gzip'],
      devtools: true,
      env,
      extraAppConfig: true,
      html: true,
      i18n: true,
      importmapOptions: defaultImportmapOptions,
      injectAppLoading: true,
      injectMetadata: true,
      isBuild,
      license: true,
      mode,
      nitroMock: !isBuild,
      nitroMockOptions: {},
      print: !isBuild,
      pwa: true,
      pwaOptions: getDefaultPwaOptions(appTitle),
      vxeTableLazyImport: true,
      ...envConfig,
      ...application,
    });

    const { injectGlobalScss = true } = application;

    const applicationConfig: UserConfig = {
      base,
      build: {
        // 关闭 CSS 代码分割：Element Plus 样式经 css-layer 插件包入 @layer el。
        // CSS @layer 的层优先级由「所有样式表中该层名首次出现的顺序」全局决定。
        // 若开启 cssCodeSplit，异步路由 chunk 各自生成以 `@layer el{` 开头、不含完整层
        // 顺序声明的 css 文件；当这些 chunk 在入口 css 之前插入 <head> 时，el 会被注册为
        // 最低优先级层，导致 base 层的 preflight（如 border-width:0）反压过 Element Plus
        // 组件样式（表现为卡片/表格无边框、按钮无底色）。合并为单文件后层顺序只声明一次，
        // 不会被 chunk 破坏。参见 adapter/component/index.ts 的 17 个异步组件样式导入。
        cssCodeSplit: false,
        rolldownOptions: {
          output: {
            assetFileNames: '[ext]/[name]-[hash].[ext]',
            chunkFileNames: 'js/[name]-[hash].js',
            entryFileNames: 'jse/index-[name]-[hash].js',
            minify: isBuild
              ? {
                  compress: {
                    dropDebugger: true,
                  },
                }
              : false,
          },
        },
        target: 'es2015',
      },
      css: createCssOptions(injectGlobalScss),
      plugins,
      server: {
        host: true,
        port,
        warmup: {
          // 预热文件
          clientFiles: [
            './index.html',
            './src/bootstrap.ts',
            './src/{views,layouts,router,store,api,adapter}/*',
          ],
        },
      },
    };

    const mergedCommonConfig = mergeConfig(
      await getCommonConfig(),
      applicationConfig,
    );
    return mergeConfig(mergedCommonConfig, vite);
  });
}

function createCssOptions(injectGlobalScss = true): CSSOptions {
  const root = findMonorepoRoot();
  return {
    preprocessorOptions: injectGlobalScss
      ? {
          scss: {
            additionalData: (content: string, filepath: string) => {
              const relativePath = relative(root, filepath);
              // apps下的包注入全局样式
              if (relativePath.startsWith(`apps${path.sep}`)) {
                return `@use "@frontend/styles/global" as *;\n${content}`;
              }
              return content;
            },
            // api: 'modern',
            importers: [new NodePackageImporter()],
          },
        }
      : {},
  };
}

export { defineApplicationConfig };
