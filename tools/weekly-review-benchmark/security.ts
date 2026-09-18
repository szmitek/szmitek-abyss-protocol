import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
export type SecretEnvironment = Readonly<Record<string, string | undefined>>;
export function requireEnvironmentKey(env: SecretEnvironment): string {
  const key = env.OPENAI_API_KEY;
  if (!key || !key.trim() || key !== key.trim() || /\s/.test(key)) throw new Error('OPENAI_API_KEY missing or invalid; execution blocked.');
  if (env.NODE_DEBUG || env.NODE_DEBUG_NATIVE || env.NODE_OPTIONS) throw new Error('Runtime debug/injection options must be unset for secret-bearing execution.');
  return key;
}
export function containsCredential(text: string, key: string): boolean {
  // Never persist a provider response that echoes credentials. Withhold the body
  // rather than rewriting it and claiming it is still the exact raw response.
  return [key, encodeURIComponent(key), JSON.stringify(key).slice(1, -1)].some((value) => text.includes(value)) || /authorization\s*["']?\s*[:=]\s*["']?\s*bearer\s+\S+/i.test(text);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    requireEnvironmentKey(process.env);
    console.log('Secret injection check passed. No HTTP request performed; API validity not checked.');
  } catch {
    console.error('Secret injection check failed. Missing/invalid secret or unsafe runtime options. No HTTP request performed.');
    process.exitCode = 1;
  }
}
