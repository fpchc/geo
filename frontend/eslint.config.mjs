import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'src/lib/api/generated.ts',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
];

export default eslintConfig;
