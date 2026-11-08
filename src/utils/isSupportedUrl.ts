export function isSupportedUrl(url?: string): boolean {
  if (!url) return false;
  try {
    return new URL(url).origin === 'https://chatgpt.com';
  } catch {
    return false;
  }
}
