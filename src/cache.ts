const HTML_CACHE_VERSION = "html:v10";

export function htmlCacheKey(key: string): string {
  return `${HTML_CACHE_VERSION}:${key}`;
}
