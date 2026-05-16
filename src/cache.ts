const HTML_CACHE_VERSION = "html:v6";

export function htmlCacheKey(key: string): string {
  return `${HTML_CACHE_VERSION}:${key}`;
}
