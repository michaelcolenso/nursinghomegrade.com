const HTML_CACHE_VERSION = "html:v11";

export function htmlCacheKey(key: string): string {
  return `${HTML_CACHE_VERSION}:${key}`;
}
