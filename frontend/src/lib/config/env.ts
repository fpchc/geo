export function assertRuntimeEnv(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV === 'production' && !env.API_BASE_URL) {
    throw new Error('API_BASE_URL is required in production');
  }
}
